package com.company.kiosk.kiosk

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.company.kiosk.data.DeviceCredentials
import com.company.kiosk.data.DeviceCredentialsRepository
import com.company.kiosk.data.PinManager
import com.company.kiosk.data.SettingsProfileConfig
import com.company.kiosk.data.SettingsRepository
import com.company.kiosk.databinding.ActivitySettingsBinding
import com.company.kiosk.network.enrollWithCode
import kotlinx.coroutines.launch

/**
 * Reached only after a correct PIN in [KioskActivity]. Edits the DataStore-backed
 * [SettingsProfileConfig] directly, plus backend enrollment ([DeviceCredentials])
 * that [KioskActivity]'s sync loop reads every cycle. Enrollment uses a short
 * admin-issued code (POST /api/enroll) instead of typing the raw device ID/token,
 * since that's painful on a TV remote — see docs/API.md.
 */
class SettingsActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySettingsBinding
    private lateinit var settingsRepository: SettingsRepository
    private lateinit var credentialsRepository: DeviceCredentialsRepository
    private var loadedProfile: SettingsProfileConfig = SettingsProfileConfig()
    private var loadedCredentials: DeviceCredentials = DeviceCredentials()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(binding.root)

        settingsRepository = SettingsRepository(applicationContext)
        credentialsRepository = DeviceCredentialsRepository(applicationContext)

        lifecycleScope.launch {
            loadedProfile = settingsRepository.current()
            populateFields(loadedProfile)

            loadedCredentials = credentialsRepository.current()
            binding.serverUrlInput.setText(loadedCredentials.serverBaseUrl)
            updateEnrollmentStatus()
        }

        binding.saveButton.setOnClickListener { onSaveClicked() }
        binding.enrollButton.setOnClickListener { onEnrollClicked() }
        binding.backToKioskButton.setOnClickListener {
            startActivity(Intent(this, KioskActivity::class.java))
            finish()
        }
    }

    private fun updateEnrollmentStatus() {
        binding.enrollmentStatusText.text = if (loadedCredentials.isConfigured) {
            "Enrolled — device ID: ${loadedCredentials.deviceId}"
        } else {
            "Not enrolled yet"
        }
    }

    private fun populateFields(profile: SettingsProfileConfig) {
        binding.urlInput.setText(profile.url)
        binding.javascriptSwitch.isChecked = profile.javascriptEnabled
        binding.zoomSwitch.isChecked = profile.zoomEnabled
        binding.popupsBlockedSwitch.isChecked = profile.popupsBlocked
        binding.autoplaySwitch.isChecked = profile.autoplayEnabled
        binding.cookiesSwitch.isChecked = profile.cookiesEnabled
        binding.whitelistInput.setText(profile.urlWhitelist.joinToString(", "))
        binding.blacklistInput.setText(profile.urlBlacklist.joinToString(", "))
    }

    private fun onEnrollClicked() {
        val serverUrl = binding.serverUrlInput.text.toString().trim()
        val code = binding.enrollmentCodeInput.text.toString().trim()
        if (serverUrl.isBlank() || code.isBlank()) {
            Toast.makeText(this, "Enter the server URL and the enrollment code first", Toast.LENGTH_SHORT).show()
            return
        }

        binding.enrollButton.isEnabled = false
        lifecycleScope.launch {
            try {
                val result = enrollWithCode(serverUrl, code)
                val credentials = DeviceCredentials(
                    serverBaseUrl = serverUrl,
                    deviceId = result.deviceId,
                    deviceToken = result.deviceToken,
                )
                credentialsRepository.update(credentials)
                loadedCredentials = credentials
                updateEnrollmentStatus()
                binding.enrollmentCodeInput.setText("")
                Toast.makeText(this@SettingsActivity, "Enrolled successfully", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Toast.makeText(this@SettingsActivity, e.message ?: "Enrollment failed", Toast.LENGTH_LONG).show()
            } finally {
                binding.enrollButton.isEnabled = true
            }
        }
    }

    private fun onSaveClicked() {
        val newPin = binding.newPinInput.text.toString()
        val pinSalt: String
        val pinHash: String
        if (newPin.isBlank()) {
            pinSalt = loadedProfile.pinSalt ?: PinManager.generateSalt()
            pinHash = loadedProfile.pinHash ?: PinManager.hash(SettingsRepository.DEFAULT_PIN, pinSalt)
        } else {
            pinSalt = PinManager.generateSalt()
            pinHash = PinManager.hash(newPin, pinSalt)
        }

        val updated = loadedProfile.copy(
            url = binding.urlInput.text.toString().trim(),
            javascriptEnabled = binding.javascriptSwitch.isChecked,
            zoomEnabled = binding.zoomSwitch.isChecked,
            popupsBlocked = binding.popupsBlockedSwitch.isChecked,
            autoplayEnabled = binding.autoplaySwitch.isChecked,
            cookiesEnabled = binding.cookiesSwitch.isChecked,
            urlWhitelist = parseHostList(binding.whitelistInput.text.toString()),
            urlBlacklist = parseHostList(binding.blacklistInput.text.toString()),
            pinSalt = pinSalt,
            pinHash = pinHash,
        )

        // Server URL can be updated here without re-enrolling (keeps the existing device ID/token).
        val updatedCredentials = loadedCredentials.copy(serverBaseUrl = binding.serverUrlInput.text.toString().trim())

        lifecycleScope.launch {
            settingsRepository.update(updated)
            credentialsRepository.update(updatedCredentials)
            loadedProfile = updated
            loadedCredentials = updatedCredentials
            binding.newPinInput.setText("")
            Toast.makeText(this@SettingsActivity, "Saved", Toast.LENGTH_SHORT).show()
        }
    }

    private fun parseHostList(raw: String): List<String> =
        raw.split(",").map { it.trim() }.filter { it.isNotEmpty() }
}
