package com.company.kiosk.kiosk

import android.annotation.SuppressLint
import android.app.AlertDialog
import android.content.Intent
import android.graphics.Bitmap
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.InputType
import android.util.Log
import android.view.PixelCopy
import android.view.View
import android.view.WindowManager
import android.webkit.CookieManager
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.company.kiosk.R
import com.company.kiosk.admin.ProvisioningManager
import com.company.kiosk.data.DeviceCredentials
import com.company.kiosk.data.DeviceCredentialsRepository
import com.company.kiosk.data.PinManager
import com.company.kiosk.data.SettingsProfileConfig
import com.company.kiosk.data.SettingsRepository
import com.company.kiosk.databinding.ActivityKioskBinding
import com.company.kiosk.network.HeartbeatStatus
import com.company.kiosk.network.KioskApiClient
import com.company.kiosk.network.RemoteCommand
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.Inet4Address
import java.net.NetworkInterface
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * The single always-on-top kiosk screen: a WebView locked behind Lock Task Mode,
 * driven by the [SettingsRepository]-backed profile, exitable only via a hidden
 * tap gesture + PIN into [SettingsActivity]. When [DeviceCredentialsRepository]
 * holds a configured server + token, also runs a periodic heartbeat/command sync
 * loop against the backend (see docs/API.md) while this activity is alive.
 */
class KioskActivity : AppCompatActivity() {

    private lateinit var binding: ActivityKioskBinding
    private lateinit var settingsRepository: SettingsRepository
    private lateinit var credentialsRepository: DeviceCredentialsRepository
    private var syncClient: KioskApiClient? = null
    private var syncCredentials: DeviceCredentials? = null

    private var currentProfile: SettingsProfileConfig = SettingsProfileConfig()
    private var loadedUrl: String? = null

    private var exitTapCount = 0
    private var exitTapWindowStart = 0L

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityKioskBinding.inflate(layoutInflater)
        setContentView(binding.root)

        settingsRepository = SettingsRepository(applicationContext)
        credentialsRepository = DeviceCredentialsRepository(applicationContext)

        applyImmersiveFullscreen()
        attachWebViewClients(binding.webView)
        binding.exitGestureTarget.setOnClickListener { onExitGestureTap() }

        lifecycleScope.launch {
            settingsRepository.current() // ensures a persisted default (with PIN salt) exists on first run
            settingsRepository.profileFlow.collect { profile ->
                currentProfile = profile
                applyProfileToWebView(binding.webView, profile)
                if (profile.url != loadedUrl) {
                    loadedUrl = profile.url
                    binding.webView.loadUrl(profile.url)
                }
            }
        }

        lifecycleScope.launch { runSyncLoop() }
    }

    override fun onResume() {
        super.onResume()
        startLockTaskIfPossible()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) applyImmersiveFullscreen()
    }

    private fun applyImmersiveFullscreen() {
        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            )
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    }

    private fun startLockTaskIfPossible() {
        if (!ProvisioningManager.isDeviceOwner(this)) return
        if (isInLockTaskMode()) return
        try {
            startLockTask()
        } catch (e: IllegalStateException) {
            // Package not (yet) in setLockTaskPackages — happens if device-owner
            // provisioning hasn't finished applying policies yet.
        }
    }

    private fun isInLockTaskMode(): Boolean {
        val activityManager = getSystemService(ACTIVITY_SERVICE) as android.app.ActivityManager
        return activityManager.lockTaskModeState != android.app.ActivityManager.LOCK_TASK_MODE_NONE
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun attachWebViewClients(webView: WebView) {
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val allowed = UrlMatcher.isAllowed(
                    request.url.host,
                    currentProfile.urlWhitelist,
                    currentProfile.urlBlacklist,
                )
                return !allowed
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            // Popups / window.open always render in-place rather than a second window;
            // this WebView doesn't implement multi-window support (setSupportMultipleWindows).
            override fun onCreateWindow(
                view: WebView,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?,
            ): Boolean = false
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun applyProfileToWebView(webView: WebView, profile: SettingsProfileConfig) {
        webView.settings.apply {
            javaScriptEnabled = profile.javascriptEnabled
            domStorageEnabled = true
            setSupportZoom(profile.zoomEnabled)
            builtInZoomControls = profile.zoomEnabled
            displayZoomControls = false
            mediaPlaybackRequiresUserGesture = !profile.autoplayEnabled
            loadWithOverviewMode = true
            useWideViewPort = true
            profile.userAgent?.takeIf { it.isNotBlank() }?.let { userAgentString = it }
        }

        val cookieManager = CookieManager.getInstance()
        cookieManager.setAcceptCookie(profile.cookiesEnabled)
        if (!profile.cookiesEnabled) {
            cookieManager.removeAllCookies(null)
        }
    }

    /**
     * Android TV remotes have no touchscreen, so the corner tap-gesture below is
     * unreachable there. A long-press of D-pad center/enter/back opens the same PIN
     * dialog instead. This is done in [dispatchKeyEvent] — the very first place a key
     * event reaches the Activity — rather than [onKeyLongPress], because WebView
     * consumes DPAD_CENTER/ENTER itself (to click the focused page element) before
     * the event would ever bubble back up to the Activity's onKeyLongPress callback.
     * Short presses are left untouched (returned to super) so normal D-pad page
     * navigation/clicking keeps working; only a genuine long-hold opens the dialog.
     */
    private val pinTriggerHandler = Handler(Looper.getMainLooper())
    private var pinTriggerLongPressFired = false
    private val pinTriggerRunnable = Runnable {
        pinTriggerLongPressFired = true
        showPinDialog()
    }

    override fun dispatchKeyEvent(event: android.view.KeyEvent): Boolean {
        if (isPinTriggerKey(event.keyCode)) {
            when (event.action) {
                android.view.KeyEvent.ACTION_DOWN -> if (event.repeatCount == 0) {
                    pinTriggerLongPressFired = false
                    pinTriggerHandler.postDelayed(
                        pinTriggerRunnable,
                        android.view.ViewConfiguration.getLongPressTimeout().toLong(),
                    )
                }
                android.view.KeyEvent.ACTION_UP -> {
                    pinTriggerHandler.removeCallbacks(pinTriggerRunnable)
                    if (pinTriggerLongPressFired) {
                        pinTriggerLongPressFired = false
                        return true // swallow the release so it doesn't also register as a page click
                    }
                }
            }
        }

        // BACK never reaches the WebView/system (no page-back navigation, no exiting the
        // kiosk) on a normal short press — the only way out is the long-press-triggered PIN
        // dialog handled above. Every other remote/keyboard input is left alone so normal
        // page browsing still works.
        if (event.keyCode == android.view.KeyEvent.KEYCODE_BACK) return true

        return super.dispatchKeyEvent(event)
    }

    private fun isPinTriggerKey(keyCode: Int) = keyCode == android.view.KeyEvent.KEYCODE_DPAD_CENTER ||
        keyCode == android.view.KeyEvent.KEYCODE_ENTER ||
        keyCode == android.view.KeyEvent.KEYCODE_NUMPAD_ENTER ||
        keyCode == android.view.KeyEvent.KEYCODE_BUTTON_A ||
        keyCode == android.view.KeyEvent.KEYCODE_BACK

    private fun onExitGestureTap() {
        val now = System.currentTimeMillis()
        if (now - exitTapWindowStart > EXIT_GESTURE_WINDOW_MS) {
            exitTapWindowStart = now
            exitTapCount = 0
        }
        exitTapCount++
        if (exitTapCount >= EXIT_GESTURE_TAP_COUNT) {
            exitTapCount = 0
            showPinDialog()
        }
    }

    private fun showPinDialog() {
        val input = EditText(this).apply {
            inputType = InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_VARIATION_PASSWORD
            hint = getString(R.string.pin_dialog_hint)
        }

        AlertDialog.Builder(this)
            .setTitle(R.string.pin_dialog_title)
            .setView(input)
            .setPositiveButton(android.R.string.ok) { _, _ ->
                val candidate = input.text.toString()
                if (PinManager.verify(candidate, currentProfile.pinSalt, currentProfile.pinHash)) {
                    exitKioskMode()
                } else {
                    Toast.makeText(this, R.string.pin_dialog_error, Toast.LENGTH_SHORT).show()
                }
            }
            .setNegativeButton(android.R.string.cancel, null)
            .show()
    }

    private fun exitKioskMode() {
        if (isInLockTaskMode()) {
            try {
                stopLockTask()
            } catch (e: IllegalStateException) {
                // Not actually in lock task mode (e.g. running unprovisioned during dev) — ignore.
            }
        }
        startActivity(Intent(this, SettingsActivity::class.java))
    }

    // --- Backend sync (heartbeat / profile push / remote commands) ---

    /**
     * Re-reads credentials every cycle (rather than once) so saving server/token in
     * SettingsActivity takes effect without needing to relaunch KioskActivity — it's
     * singleTask, so returning to it via "Back to kiosk" reuses the existing instance
     * instead of re-running onCreate.
     */
    private suspend fun runSyncLoop() {
        while (lifecycleScope.isActive) {
            val credentials = credentialsRepository.current()
            if (credentials.isConfigured) {
                if (credentials != syncCredentials) {
                    syncCredentials = credentials
                    syncClient = KioskApiClient(credentials)
                }
                try {
                    syncCycle(syncClient!!)
                } catch (e: Exception) {
                    Log.w(TAG, "Sync cycle failed", e)
                }
            }
            delay(SYNC_INTERVAL_MS)
        }
    }

    private suspend fun syncCycle(client: KioskApiClient) {
        val status = HeartbeatStatus(
            batteryLevel = currentBatteryLevel(),
            ipAddress = currentIpAddress(),
            currentUrlOrApp = loadedUrl,
            appVersion = currentAppVersion(),
            androidVersion = Build.VERSION.RELEASE,
            model = Build.MODEL,
        )
        val result = client.sendHeartbeat(status)
        if (result.hasNewProfile) {
            settingsRepository.update(client.fetchProfile())
        }

        for (command in client.fetchPendingCommands()) {
            executeCommand(client, command)
        }
    }

    private suspend fun executeCommand(client: KioskApiClient, command: RemoteCommand) {
        try {
            when (command.type) {
                "RELOAD" -> binding.webView.reload()
                "LOCK" -> {
                    check(ProvisioningManager.isDeviceOwner(this)) {
                        "Cannot lock: app is not device owner (see docs/PROVISIONING.md)"
                    }
                    startLockTaskIfPossible()
                }
                "UNLOCK" -> if (isInLockTaskMode()) stopLockTask()
                "RESTART_APP" -> recreate()
                "REBOOT" -> ProvisioningManager.reboot(this)
                "REQUEST_SCREENSHOT" -> client.uploadScreenshot(captureScreenshotJpeg())
                "APPLY_PROFILE" -> settingsRepository.update(client.fetchProfile())
                "SET_URL" -> {
                    val url = command.payload?.optString("url")?.takeIf { it.isNotBlank() }
                        ?: throw IllegalArgumentException("SET_URL command missing 'url' payload")
                    settingsRepository.update(currentProfile.copy(url = url))
                }
                else -> throw IllegalArgumentException("Unknown command type: ${command.type}")
            }
            client.ackCommand(command.id, "ACKED")
        } catch (e: Exception) {
            Log.w(TAG, "Command ${command.type} failed", e)
            client.ackCommand(command.id, "FAILED", e.message)
        }
    }

    private suspend fun captureScreenshotJpeg(): ByteArray = suspendCancellableCoroutine { cont ->
        val decorView = window.decorView
        val bitmap = Bitmap.createBitmap(decorView.width, decorView.height, Bitmap.Config.ARGB_8888)
        PixelCopy.request(
            window,
            bitmap,
            { result ->
                if (result == PixelCopy.SUCCESS) {
                    val stream = ByteArrayOutputStream()
                    bitmap.compress(Bitmap.CompressFormat.JPEG, 80, stream)
                    cont.resume(stream.toByteArray())
                } else {
                    cont.resumeWithException(IOException("PixelCopy failed with result code $result"))
                }
            },
            Handler(Looper.getMainLooper()),
        )
    }

    private fun currentBatteryLevel(): Int? = runCatching {
        (getSystemService(BATTERY_SERVICE) as BatteryManager).getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }.getOrNull()

    private fun currentAppVersion(): String? = runCatching {
        packageManager.getPackageInfo(packageName, 0).versionName
    }.getOrNull()

    private fun currentIpAddress(): String? = runCatching {
        NetworkInterface.getNetworkInterfaces().asSequence()
            .flatMap { it.inetAddresses.asSequence() }
            .firstOrNull { !it.isLoopbackAddress && it is Inet4Address }
            ?.hostAddress
    }.getOrNull()

    companion object {
        private const val TAG = "KioskActivity"
        private const val EXIT_GESTURE_TAP_COUNT = 5
        private const val EXIT_GESTURE_WINDOW_MS = 2000L
        private const val SYNC_INTERVAL_MS = 20_000L
    }
}
