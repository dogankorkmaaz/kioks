package com.company.kiosk

import android.app.Application
import android.util.Log
import com.company.kiosk.admin.ProvisioningManager

class KioskApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        // Let an uncaught exception kill the process cleanly so the watchdog's
        // START_STICKY restart (or WorkManager watchdog, added in a later phase)
        // picks it back up, instead of leaving the app in a half-crashed state.
        val defaultHandler = Thread.getDefaultUncaughtExceptionHandler()
        Thread.setDefaultUncaughtExceptionHandler { thread, throwable ->
            Log.e(TAG, "Uncaught exception, restarting kiosk process", throwable)
            defaultHandler?.uncaughtException(thread, throwable)
        }

        ProvisioningManager.applyDeviceOwnerPolicies(this)
    }

    companion object {
        private const val TAG = "KioskApplication"
    }
}
