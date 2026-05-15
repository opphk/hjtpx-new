package com.captchax.sdk.repository

import com.captchax.sdk.BuildConfig
import com.captchax.sdk.CaptchaConfig
import com.captchax.sdk.CaptchaError
import com.captchax.sdk.CaptchaResponse
import com.captchax.sdk.CaptchaType
import com.captchax.sdk.DeviceFingerprint
import com.captchax.sdk.ImageCache
import com.captchax.sdk.NetworkClient
import com.captchax.sdk.util.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext

class CaptchaRepository(
    private val networkClient: NetworkClient,
    private val imageCache: ImageCache
) {
    
    sealed class CaptchaState<out T> {
        data object Loading : CaptchaState<Nothing>()
        data class Success<T>(val data: T) : CaptchaState<T>()
        data class Error(val error: CaptchaError) : CaptchaState<Nothing>()
        data object Idle : CaptchaState<Nothing>()
    }
    
    data class CaptchaData(
        val token: String,
        val type: CaptchaType,
        val imageUrl: String? = null,
        val backgroundImageUrl: String? = null,
        val targetImageUrl: String? = null,
        val puzzleImageUrl: String? = null,
        val rotationAngle: Float? = null,
        val targetIcons: List<String>? = null,
        val targetTexts: List<String>? = null,
        val clickPositions: List<Pair<Float, Float>>? = null,
        val metadata: Map<String, Any>? = null
    )
    
    fun requestCaptcha(scene: String, type: CaptchaType): Flow<CaptchaState<CaptchaData>> = flow {
        emit(CaptchaState.Loading)
        
        val response = networkClient.request(
            endpoint = "/api/v1/captcha/request",
            method = okhttp3.HttpMethod.POST,
            params = mapOf(
                "scene" to scene,
                "type" to type.name.lowercase(),
                "fingerprint" to DeviceFingerprint.generate(),
                "sdk" to "android",
                "version" to BuildConfig.VERSION_NAME
            )
        )
        
        if (response.isSuccess && response.data != null) {
            val token = response.data["token"] as? String ?: ""
            val data = CaptchaData(
                token = token,
                type = type,
                imageUrl = response.data["image"] as? String,
                backgroundImageUrl = response.data["background_image"] as? String,
                targetImageUrl = response.data["target_image"] as? String,
                puzzleImageUrl = response.data["puzzle_image"] as? String,
                rotationAngle = (response.data["rotation_angle"] as? Number)?.toFloat(),
                targetIcons = response.data["target_icons"] as? List<String>,
                targetTexts = response.data["target_texts"] as? List<String>,
                clickPositions = parseClickPositions(response.data["click_positions"]),
                metadata = response.data["metadata"] as? Map<String, Any>
            )
            emit(CaptchaState.Success(data))
        } else {
            emit(CaptchaState.Error(
                CaptchaError.fromCode(
                    response.errorCode ?: "UNKNOWN_ERROR",
                    response.errorMessage ?: "Failed to request captcha"
                )
            ))
        }
    }.catch { e ->
        Logger.e("CaptchaRepository", "Request failed: ${e.message}")
        emit(CaptchaState.Error(CaptchaError.UnknownError(e.message ?: "Unknown error")))
    }.flowOn(Dispatchers.IO)
    
    suspend fun verifySlider(token: String, distance: Float): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = networkClient.request(
                endpoint = "/api/v1/captcha/slider/verify",
                method = okhttp3.HttpMethod.POST,
                params = mapOf(
                    "token" to token,
                    "distance" to distance,
                    "fingerprint" to DeviceFingerprint.generate()
                )
            )
            
            if (response.isSuccess) {
                Result.success(response.data?.get("token") as? String ?: token)
            } else {
                Result.failure(
                    CaptchaError.ValidationError(
                        response.errorMessage ?: "Verification failed"
                    )
                )
            }
        } catch (e: Exception) {
            Logger.e("CaptchaRepository", "Slider verify failed: ${e.message}")
            Result.failure(CaptchaError.UnknownError(e.message ?: "Verification failed"))
        }
    }
    
    suspend fun verifyClicks(token: String, points: List<Pair<Float, Float>>): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = networkClient.request(
                endpoint = "/api/v1/captcha/click/verify",
                method = okhttp3.HttpMethod.POST,
                params = mapOf(
                    "token" to token,
                    "points" to points.map { mapOf("x" to it.first, "y" to it.second) },
                    "fingerprint" to DeviceFingerprint.generate()
                )
            )
            
            if (response.isSuccess) {
                Result.success(response.data?.get("token") as? String ?: token)
            } else {
                Result.failure(
                    CaptchaError.ValidationError(
                        response.errorMessage ?: "Verification failed"
                    )
                )
            }
        } catch (e: Exception) {
            Logger.e("CaptchaRepository", "Click verify failed: ${e.message}")
            Result.failure(CaptchaError.UnknownError(e.message ?: "Verification failed"))
        }
    }
    
    suspend fun verifyRotation(token: String, angle: Float): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = networkClient.request(
                endpoint = "/api/v1/captcha/rotate/verify",
                method = okhttp3.HttpMethod.POST,
                params = mapOf(
                    "token" to token,
                    "angle" to angle,
                    "fingerprint" to DeviceFingerprint.generate()
                )
            )
            
            if (response.isSuccess) {
                Result.success(response.data?.get("token") as? String ?: token)
            } else {
                Result.failure(
                    CaptchaError.ValidationError(
                        response.errorMessage ?: "Verification failed"
                    )
                )
            }
        } catch (e: Exception) {
            Logger.e("CaptchaRepository", "Rotation verify failed: ${e.message}")
            Result.failure(CaptchaError.UnknownError(e.message ?: "Verification failed"))
        }
    }
    
    suspend fun verifyText(token: String, text: String): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = networkClient.request(
                endpoint = "/api/v1/captcha/text/verify",
                method = okhttp3.HttpMethod.POST,
                params = mapOf(
                    "token" to token,
                    "text" to text,
                    "fingerprint" to DeviceFingerprint.generate()
                )
            )
            
            if (response.isSuccess) {
                Result.success(response.data?.get("token") as? String ?: token)
            } else {
                Result.failure(
                    CaptchaError.ValidationError(
                        response.errorMessage ?: "Verification failed"
                    )
                )
            }
        } catch (e: Exception) {
            Logger.e("CaptchaRepository", "Text verify failed: ${e.message}")
            Result.failure(CaptchaError.UnknownError(e.message ?: "Verification failed"))
        }
    }
    
    suspend fun verifyIcon(token: String, icons: List<String>): Result<String> = withContext(Dispatchers.IO) {
        try {
            val response = networkClient.request(
                endpoint = "/api/v1/captcha/icon/verify",
                method = okhttp3.HttpMethod.POST,
                params = mapOf(
                    "token" to token,
                    "icons" to icons,
                    "fingerprint" to DeviceFingerprint.generate()
                )
            )
            
            if (response.isSuccess) {
                Result.success(response.data?.get("token") as? String ?: token)
            } else {
                Result.failure(
                    CaptchaError.ValidationError(
                        response.errorMessage ?: "Verification failed"
                    )
                )
            }
        } catch (e: Exception) {
            Logger.e("CaptchaRepository", "Icon verify failed: ${e.message}")
            Result.failure(CaptchaError.UnknownError(e.message ?: "Verification failed"))
        }
    }
    
    suspend fun preloadCaptcha(scene: String) = withContext(Dispatchers.IO) {
        try {
            networkClient.request(
                endpoint = "/api/v1/captcha/preload",
                method = okhttp3.HttpMethod.POST,
                params = mapOf(
                    "scene" to scene,
                    "fingerprint" to DeviceFingerprint.generate()
                )
            )
        } catch (e: Exception) {
            Logger.e("CaptchaRepository", "Preload failed: ${e.message}")
        }
    }
    
    fun getCachedImage(type: CaptchaType): android.graphics.Bitmap? {
        return imageCache.get(type.name)
    }
    
    fun cacheImage(type: CaptchaType, bitmap: android.graphics.Bitmap) {
        imageCache.put(type.name, bitmap)
    }
    
    private fun parseClickPositions(data: Any?): List<Pair<Float, Float>>? {
        if (data !is List<*>) return null
        return data.mapNotNull { item ->
            when (item) {
                is Map<*, *> -> {
                    val x = (item["x"] as? Number)?.toFloat()
                    val y = (item["y"] as? Number)?.toFloat()
                    if (x != null && y != null) Pair(x, y) else null
                }
                else -> null
            }
        }
    }
}
