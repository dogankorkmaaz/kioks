package com.company.kiosk.watchdog

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import com.company.kiosk.kiosk.KioskActivity

/**
 * Persistent foreground service started at boot (see [BootReceiver]) that keeps
 * [KioskActivity] on top. Returns START_STICKY so the system attempts to restart
 * it after being killed for resources; a WorkManager-based watchdog that covers
 * the case where that restart is delayed is added in a later phase.
 */
class KioskForegroundService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        launchKioskActivity()
        return START_STICKY
    }

    private fun launchKioskActivity() {
        val intent = Intent(this, KioskActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        startActivity(intent)
    }

    private fun buildNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Kiosk watchdog",
                NotificationManager.IMPORTANCE_MIN,
            )
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Kiosk running")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MIN)
            .build()
    }

    companion object {
        private const val CHANNEL_ID = "kiosk_watchdog"
        private const val NOTIFICATION_ID = 1
    }
}
