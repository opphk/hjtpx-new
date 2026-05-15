package com.captchax.sdk

import com.facebook.react.bridge.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class CaptchaXModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    private var baseUrl: String = "https://captchax.example.com"
    private var timeout: Long = 30000

    override fun getName(): String {
        return "CaptchaXModule"
    }

    @ReactMethod
    fun setBaseUrl(url: String) {
        baseUrl = url
    }

    @ReactMethod
    fun setTimeout(timeoutMs: Int) {
        timeout = timeoutMs.toLong()
    }

    @ReactMethod
    fun getCaptcha(type: String, promise: Promise) {
        Thread {
            try {
                val url = URL("$baseUrl/api/v1/captcha/$type")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = timeout.toInt()
                connection.readTimeout = timeout.toInt()

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    promise.resolve(JSONObject(response).toString())
                } else {
                    promise.reject("NETWORK_ERROR", "HTTP error: $responseCode")
                }
            } catch (e: Exception) {
                promise.reject("NETWORK_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun verifyCaptcha(
        captchaId: String,
        captchaType: String,
        userResponse: ReadableMap,
        track: ReadableArray,
        promise: Promise
    ) {
        Thread {
            try {
                val url = URL("$baseUrl/api/v1/captcha/$captchaType/verify")
                val connection = url.openConnection() as HttpURLConnection
                connection.requestMethod = "POST"
                connection.setRequestProperty("Content-Type", "application/json")
                connection.doOutput = true
                connection.connectTimeout = timeout.toInt()
                connection.readTimeout = timeout.toInt()

                val body = JSONObject()
                body.put("captchaId", captchaId)
                body.put("userResponse", reactMapToJSON(userResponse))
                body.put("track", reactArrayToJSONArray(track))

                connection.outputStream.use { os ->
                    os.write(body.toString().toByteArray())
                }

                val responseCode = connection.responseCode
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val response = connection.inputStream.bufferedReader().use { it.readText() }
                    promise.resolve(JSONObject(response).toString())
                } else {
                    promise.reject("VERIFICATION_ERROR", "HTTP error: $responseCode")
                }
            } catch (e: Exception) {
                promise.reject("VERIFICATION_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun trackUserAction(x: Double, y: Double, timestamp: Double): WritableMap {
        val map = Arguments.createMap()
        map.putDouble("x", x)
        map.putDouble("y", y)
        map.putDouble("timestamp", timestamp)
        return map
    }

    private fun reactMapToJSON(map: ReadableMap): JSONObject {
        val json = JSONObject()
        val iterator = map.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (map.getType(key)) {
                ReadableType.String -> json.put(key, map.getString(key))
                ReadableType.Number -> json.put(key, map.getDouble(key))
                ReadableType.Boolean -> json.put(key, map.getBoolean(key))
                ReadableType.Null -> json.put(key, null)
                else -> {}
            }
        }
        return json
    }

    private fun reactArrayToJSONArray(array: ReadableArray): org.json.JSONArray {
        val jsonArray = org.json.JSONArray()
        for (i in 0 until array.size()) {
            when (array.getType(i)) {
                ReadableType.Map -> jsonArray.put(reactMapToJSON(array.getMap(i)))
                ReadableType.String -> jsonArray.put(array.getString(i))
                ReadableType.Number -> jsonArray.put(array.getDouble(i))
                ReadableType.Boolean -> jsonArray.put(array.getBoolean(i))
                else -> {}
            }
        }
        return jsonArray
    }
}
