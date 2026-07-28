package com.company.kiosk.admin

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Entry point for Device Owner provisioning (see docs/PROVISIONING.md for the
 * `adb shell dpm set-device-owner` command that binds this receiver as owner).
 */
class KioskDeviceAdminReceiver : DeviceAdminReceiver() {

    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i(TAG, "Device admin enabled")
        ProvisioningManager.applyDeviceOwnerPolicies(context)
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w(TAG, "Device admin disabled")
    }

    override fun onLockTaskModeEntering(context: Context, intent: Intent, pkg: String) {
        super.onLockTaskModeEntering(context, intent, pkg)
        Log.i(TAG, "Entered lock task mode for package: $pkg")
    }

    override fun onLockTaskModeExiting(context: Context, intent: Intent) {
        super.onLockTaskModeExiting(context, intent)
        Log.i(TAG, "Exited lock task mode")
    }

    companion object {
        private const val TAG = "KioskDeviceAdmin"
    }
}
