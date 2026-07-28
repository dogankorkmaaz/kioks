package com.company.kiosk.data

import org.json.JSONArray
import org.json.JSONObject

enum class KioskMode(val jsonValue: String) {
    WEB("web"),
    NATIVE_APP("native_app");

    companion object {
        fun fromJson(value: String?): KioskMode = entries.find { it.jsonValue == value } ?: WEB
    }
}

enum class MotionDetectionMode(val jsonValue: String) {
    OFF("off"),
    ACCELEROMETER("accelerometer"),
    CAMERA("camera");

    companion object {
        fun fromJson(value: String?): MotionDetectionMode =
            entries.find { it.jsonValue == value } ?: ACCELEROMETER
    }
}

data class ScreensaverConfig(
    val type: String,
    val imageUrl: String? = null,
    val url: String? = null,
)

/**
 * Mirrors docs/settings-profile-schema.json — the single source of truth shared
 * with the backend's SettingsProfile.configJson. Keep both in sync.
 */
data class SettingsProfileConfig(
    val mode: KioskMode = KioskMode.WEB,
    val url: String = "https://www.example.com",
    val urlWhitelist: List<String> = emptyList(),
    val urlBlacklist: List<String> = emptyList(),
    val javascriptEnabled: Boolean = true,
    val popupsBlocked: Boolean = true,
    val zoomEnabled: Boolean = false,
    val autoplayEnabled: Boolean = true,
    val userAgent: String? = null,
    val cookiesEnabled: Boolean = true,
    val nativeAppPackage: String? = null,
    val sleepTime: String? = null,
    val wakeTime: String? = null,
    val idleTimeoutMinutes: Int? = null,
    val screensaver: ScreensaverConfig? = null,
    val motionDetectionMode: MotionDetectionMode = MotionDetectionMode.ACCELEROMETER,
    val screenshotIntervalMinutes: Int? = null,
    val pinHash: String? = null,
    val pinSalt: String? = null,
) {
    fun toJson(): String {
        val obj = JSONObject()
        obj.put("mode", mode.jsonValue)
        obj.put("url", url)
        obj.put("urlWhitelist", JSONArray(urlWhitelist))
        obj.put("urlBlacklist", JSONArray(urlBlacklist))
        obj.put("javascriptEnabled", javascriptEnabled)
        obj.put("popupsBlocked", popupsBlocked)
        obj.put("zoomEnabled", zoomEnabled)
        obj.put("autoplayEnabled", autoplayEnabled)
        obj.put("userAgent", userAgent)
        obj.put("cookiesEnabled", cookiesEnabled)
        obj.put("nativeAppPackage", nativeAppPackage)
        obj.put("sleepTime", sleepTime)
        obj.put("wakeTime", wakeTime)
        obj.put("idleTimeoutMinutes", idleTimeoutMinutes)
        screensaver?.let {
            obj.put("screensaver", JSONObject().apply {
                put("type", it.type)
                put("imageUrl", it.imageUrl)
                put("url", it.url)
            })
        }
        obj.put("motionDetectionMode", motionDetectionMode.jsonValue)
        obj.put("screenshotIntervalMinutes", screenshotIntervalMinutes)
        obj.put("pinHash", pinHash)
        obj.put("pinSalt", pinSalt)
        return obj.toString()
    }

    companion object {
        fun fromJson(json: String): SettingsProfileConfig {
            val obj = JSONObject(json)
            val whitelist = obj.optJSONArray("urlWhitelist")?.toStringList() ?: emptyList()
            val blacklist = obj.optJSONArray("urlBlacklist")?.toStringList() ?: emptyList()
            val screensaverObj = obj.optJSONObject("screensaver")
            val screensaver = screensaverObj?.let {
                ScreensaverConfig(
                    type = it.optString("type", "clock"),
                    imageUrl = it.optNullableString("imageUrl"),
                    url = it.optNullableString("url"),
                )
            }

            return SettingsProfileConfig(
                mode = KioskMode.fromJson(obj.optString("mode", "web")),
                url = obj.optString("url", "https://www.example.com"),
                urlWhitelist = whitelist,
                urlBlacklist = blacklist,
                javascriptEnabled = obj.optBoolean("javascriptEnabled", true),
                popupsBlocked = obj.optBoolean("popupsBlocked", true),
                zoomEnabled = obj.optBoolean("zoomEnabled", false),
                autoplayEnabled = obj.optBoolean("autoplayEnabled", true),
                userAgent = obj.optNullableString("userAgent"),
                cookiesEnabled = obj.optBoolean("cookiesEnabled", true),
                nativeAppPackage = obj.optNullableString("nativeAppPackage"),
                sleepTime = obj.optNullableString("sleepTime"),
                wakeTime = obj.optNullableString("wakeTime"),
                idleTimeoutMinutes = if (obj.isNull("idleTimeoutMinutes")) null else obj.optInt("idleTimeoutMinutes"),
                screensaver = screensaver,
                motionDetectionMode = MotionDetectionMode.fromJson(obj.optString("motionDetectionMode", "accelerometer")),
                screenshotIntervalMinutes = if (obj.isNull("screenshotIntervalMinutes")) null else obj.optInt("screenshotIntervalMinutes"),
                pinHash = obj.optNullableString("pinHash"),
                pinSalt = obj.optNullableString("pinSalt"),
            )
        }

        private fun JSONArray.toStringList(): List<String> = (0 until length()).map { getString(it) }

        private fun JSONObject.optNullableString(key: String): String? =
            if (has(key) && !isNull(key)) getString(key) else null
    }
}
