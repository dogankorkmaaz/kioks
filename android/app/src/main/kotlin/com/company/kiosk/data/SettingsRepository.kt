package com.company.kiosk.data

import android.content.Context
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.settingsDataStore by preferencesDataStore(name = "kiosk_settings")

/**
 * Local mirror of the active [SettingsProfileConfig]. Phase 2: edited directly via
 * SettingsActivity. A later phase overwrites this from the backend's `/profile`
 * response instead, using the same JSON shape (docs/settings-profile-schema.json).
 */
class SettingsRepository(private val context: Context) {

    private val profileKey = stringPreferencesKey("profile_json")

    /** Live updates for an already-initialized profile. Call [current] first (e.g. in KioskApplication.onCreate) to guarantee a persisted default exists. */
    val profileFlow: Flow<SettingsProfileConfig> = context.settingsDataStore.data.map { prefs ->
        prefs[profileKey]?.let { runCatching { SettingsProfileConfig.fromJson(it) }.getOrNull() }
            ?: SettingsProfileConfig()
    }

    /** Returns the persisted profile, creating and persisting a fresh default (with a random PIN salt) on first run. */
    suspend fun current(): SettingsProfileConfig {
        val stored = context.settingsDataStore.data.first()[profileKey]
            ?.let { runCatching { SettingsProfileConfig.fromJson(it) }.getOrNull() }
        if (stored != null) return stored

        val default = defaultProfileWithPin()
        update(default)
        return default
    }

    suspend fun update(profile: SettingsProfileConfig) {
        context.settingsDataStore.edit { prefs ->
            prefs[profileKey] = profile.toJson()
        }
    }

    /** First-run default: a fresh random salt with the default PIN ("1234") hashed against it. */
    private fun defaultProfileWithPin(): SettingsProfileConfig {
        val salt = PinManager.generateSalt()
        return SettingsProfileConfig(
            pinSalt = salt,
            pinHash = PinManager.hash(DEFAULT_PIN, salt),
        )
    }

    companion object {
        const val DEFAULT_PIN = "1234"
    }
}
