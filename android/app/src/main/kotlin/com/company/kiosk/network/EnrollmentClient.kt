package com.company.kiosk.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.util.concurrent.TimeUnit

data class EnrollResult(val deviceId: String, val deviceToken: String)

/**
 * Exchanges a short admin-issued enrollment code (see docs/API.md, POST /api/enroll)
 * for the device's real long-lived token. Standalone from [KioskApiClient] since the
 * device has no token yet at this point — nothing to authenticate the request with.
 */
suspend fun enrollWithCode(serverBaseUrl: String, code: String): EnrollResult = withContext(Dispatchers.IO) {
    val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    val body = JSONObject().put("code", code).toString()
        .toRequestBody("application/json; charset=utf-8".toMediaType())

    val request = Request.Builder()
        .url(serverBaseUrl.trimEnd('/') + "/api/enroll")
        .post(body)
        .build()

    client.newCall(request).execute().use { response ->
        val responseBody = response.body?.string() ?: "{}"
        if (!response.isSuccessful) {
            val error = runCatching { JSONObject(responseBody).optString("error") }.getOrNull()
            throw IOException(error?.takeIf { it.isNotBlank() } ?: "Enrollment failed (${response.code})")
        }
        val json = JSONObject(responseBody)
        EnrollResult(deviceId = json.getString("deviceId"), deviceToken = json.getString("deviceToken"))
    }
}
