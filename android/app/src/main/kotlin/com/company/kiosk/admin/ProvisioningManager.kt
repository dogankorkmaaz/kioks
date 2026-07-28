package com.company.kiosk.admin

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.os.UserManager
import android.util.Log

/**
 * Applies Device Owner hardening once the app has been bound as device owner
 * via `dpm set-device-owner` (see docs/PROVISIONING.md). Safe to call even when
 * not device owner yet — every call is guarded by [isDeviceOwner].
 */
object ProvisioningManager {

    private const val TAG = "ProvisioningManager"

    fun adminComponent(context: Context): ComponentName =
        ComponentName(context.applicationContext, KioskDeviceAdminReceiver::class.java)

    fun isDeviceOwner(context: Context): Boolean {
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        return dpm.isDeviceOwnerApp(context.packageName)
    }

    fun applyDeviceOwnerPolicies(context: Context) {
        if (!isDeviceOwner(context)) {
            Log.w(TAG, "Not device owner yet — skipping kiosk hardening. See docs/PROVISIONING.md.")
            return
        }

        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = adminComponent(context)

        // On some Android TV boxes (observed on a TCL-based build), the OS's own
        // Daydream/screensaver ("Backdrop") tries to activate within seconds of boot
        // and collides with Lock Task Mode holding the foreground exclusively — the
        // resulting activity-pause timeout was enough for the OEM's watchdog to force
        // a full device reboot, in a tight loop. Disabling the screensaver removes the
        // trigger. (Also set once via `adb shell settings put secure screensaver_enabled 0`
        // for existing installs — this DPM call covers fresh/future provisioning.)
        // "screensaver_enabled" isn't exposed as a public Settings.Secure constant, but it's
        // the real underlying key (verified via `adb shell settings get secure screensaver_enabled`).
        runCatching { dpm.setSecureSetting(admin, "screensaver_enabled", "0") }
            .onFailure { Log.w(TAG, "Could not disable screensaver via DPM (non-fatal)", it) }

        dpm.setLockTaskPackages(admin, arrayOf(context.packageName))
        dpm.setStatusBarDisabled(admin, true)
        dpm.setKeyguardDisabled(admin, true)

        // Defense in depth: even though Lock Task Mode already blocks Home/Recents/
        // notifications/global-actions by default, these close off remaining escape
        // hatches (factory reset, safe mode reboot, adding another user) that would
        // otherwise be reachable if the remote ever got past the kiosk screen.
        dpm.addUserRestriction(admin, UserManager.DISALLOW_FACTORY_RESET)
        dpm.addUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT)
        dpm.addUserRestriction(admin, UserManager.DISALLOW_ADD_USER)

        Log.i(TAG, "Device owner kiosk policies applied")
    }

    /** Reboots the device immediately. Device Owner only — throws SecurityException otherwise. */
    fun reboot(context: Context) {
        check(isDeviceOwner(context)) { "Cannot reboot: app is not device owner" }
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        dpm.reboot(adminComponent(context))
    }

    /**
     * Rollback path: lifts every restriction this app added and relinquishes Device
     * Owner status entirely. `adb shell dpm remove-active-admin` refuses to touch a
     * non-testOnly admin ("Attempt to remove non-test admin..."), and there's no shell
     * subcommand to clear individual user restrictions either — clearing them is only
     * possible from inside the device owner app itself via the DevicePolicyManager
     * Java API, which is why this lives here instead of being done over adb.
     */
    fun clearDeviceOwnerAndRestrictions(context: Context) {
        if (!isDeviceOwner(context)) return
        val dpm = context.getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val admin = adminComponent(context)

        runCatching { dpm.clearUserRestriction(admin, UserManager.DISALLOW_FACTORY_RESET) }
        runCatching { dpm.clearUserRestriction(admin, UserManager.DISALLOW_SAFE_BOOT) }
        runCatching { dpm.clearUserRestriction(admin, UserManager.DISALLOW_ADD_USER) }
        runCatching { dpm.setLockTaskPackages(admin, arrayOf()) }
        runCatching { dpm.setStatusBarDisabled(admin, false) }
        runCatching { dpm.setKeyguardDisabled(admin, false) }
        runCatching { dpm.clearDeviceOwnerApp(context.packageName) }

        Log.i(TAG, "Device owner status and restrictions cleared")
    }
}
