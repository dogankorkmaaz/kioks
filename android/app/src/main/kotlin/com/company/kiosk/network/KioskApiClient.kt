package com.company.kiosk.network

import com.company.kiosk.data.DeviceCredentials
import com.company.kiosk.data.SettingsProfileConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.MultipartBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class HeartbeatStatus(
    val batteryLevel: Int? = null,
    val ipAddress: String? = null,
    val currentUrlOrApp: String? = null,
    val appVersion: String? = null,
    val androidVersion: String? = null,
    val model: String? = null,
)

data class HeartbeatResult(val profileVersion: Int?, val hasNewProfile: Boolean)

data class RemoteCommand(val id: String, val type: String, val payload: JSONObject?)

/** Thin OkHttp + org.json client for the backend's device-facing API (see docs/API.md). */
class KioskApiClient(private val credentials: DeviceCredentials) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    private fun url(path: String) = credentials.serverBaseUrl.trimEnd('/') + path

    private fun authorizedRequest(path: String) = Request.Builder()
        .url(url(path))
        .addHeader("Authorization", "Bearer ${credentials.deviceToken}")

    suspend fun sendHeartbeat(status: HeartbeatStatus): HeartbeatResult = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            status.batteryLevel?.let { put("batteryLevel", it) }
            status.ipAddress?.let { put("ipAddress", it) }
            status.currentUrlOrApp?.let { put("currentUrlOrApp", it) }
            status.appVersion?.let { put("appVersion", it) }
            status.androidVersion?.let { put("androidVersion", it) }
            status.model?.let { put("model", it) }
        }
        val request = authorizedRequest("/api/devices/${credentials.deviceId}/heartbeat")
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("heartbeat failed: ${response.code}")
            val json = JSONObject(response.body?.string() ?: "{}")
            HeartbeatResult(
                profileVersion = if (json.isNull("profileVersion")) null else json.optInt("profileVersion"),
                hasNewProfile = json.optBoolean("hasNewProfile", false),
            )
        }
    }

    suspend fun fetchProfile(): SettingsProfileConfig = withContext(Dispatchers.IO) {
        val request = authorizedRequest("/api/devices/${credentials.deviceId}/profile").build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) throw IOException("profile fetch failed: ${response.code}")
            val json = JSONObject(response.body?.string() ?: "{}")
            SettingsProfileConfig.fromJson(json.getJSONObject("config").toString())
        }
    }

    suspend fun fetchPendingCommands(): List<RemoteCommand> = withContext(Dispatchers.IO) {
        val request = authorizedRequest("/api/devices/${credentials.deviceId}/commands/pending").build()
        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return@withContext emptyList()
            val array = JSONArray(response.body?.string() ?: "[]")
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                RemoteCommand(
                    id = obj.getString("id"),
                    type = obj.getString("type"),
                    payload = obj.optJSONObject("payload"),
                )
            }
        }
    }

    suspend fun ackCommand(commandId: String, status: String, result: String? = null) = withContext(Dispatchers.IO) {
        val body = JSONObject().apply {
            put("status", status)
            result?.let { put("result", it) }
        }
        val request = authorizedRequest("/api/devices/${credentials.deviceId}/commands/$commandId/ack")
            .post(body.toString().toRequestBody(jsonMediaType))
            .build()
        client.newCall(request).execute().close()
    }

    suspend fun uploadScreenshot(jpegBytes: ByteArray) = withContext(Dispatchers.IO) {
        val body = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart(
                "screenshot",
                "screenshot.jpg",
                jpegBytes.toRequestBody("image/jpeg".toMediaType()),
            )
            .build()
        val request = authorizedRequest("/api/devices/${credentials.deviceId}/screenshot")
            .post(body)
            .build()
        client.newCall(request).execute().close()
    }
}
