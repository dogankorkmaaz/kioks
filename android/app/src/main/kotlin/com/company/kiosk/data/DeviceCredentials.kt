package com.company.kiosk.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.credentialsDataStore by preferencesDataStore(name = "kiosk_credentials")

/**
 * Enrollment info entered once via SettingsActivity (Phase 3 MVP: an admin creates the
 * device in the dashboard, copies the one-time token shown there into this screen —
 * no QR/NFC bulk provisioning yet).
 */
data class DeviceCredentials(
    val serverBaseUrl: String = "",
    val deviceId: String = "",
    val deviceToken: String = "",
) {
    val isConfigured: Boolean get() = serverBaseUrl.isNotBlank() && deviceId.isNotBlank() && deviceToken.isNotBlank()
}

class DeviceCredentialsRepository(private val context: Context) {

    private val serverUrlKey = stringPreferencesKey("server_base_url")
    private val deviceIdKey = stringPreferencesKey("device_id")
    private val deviceTokenKey = stringPreferencesKey("device_token")

    val credentialsFlow: Flow<DeviceCredentials> = context.credentialsDataStore.data.map { prefs ->
        DeviceCredentials(
            serverBaseUrl = prefs[serverUrlKey] ?: "",
            deviceId = prefs[deviceIdKey] ?: "",
            deviceToken = prefs[deviceTokenKey] ?: "",
        )
    }

    suspend fun current(): DeviceCredentials = credentialsFlow.first()

    suspend fun update(credentials: DeviceCredentials) {
        context.credentialsDataStore.edit { prefs ->
            prefs[serverUrlKey] = credentials.serverBaseUrl
            prefs[deviceIdKey] = credentials.deviceId
            prefs[deviceTokenKey] = credentials.deviceToken
        }
    }
}
