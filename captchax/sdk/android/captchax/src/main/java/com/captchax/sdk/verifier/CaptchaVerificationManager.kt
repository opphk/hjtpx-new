package com.captchax.sdk.verifier

import com.captchax.sdk.CaptchaError
import com.captchax.sdk.CaptchaType
import com.captchax.sdk.DeviceFingerprint
import com.captchax.sdk.NetworkClient
import com.captchax.sdk.util.Logger
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class CaptchaVerificationManager(
    private val networkClient: NetworkClient
) {
    
    suspend fun verify(verificationData: VerificationData): Result<String> = withContext(Dispatchers.IO) {
        try {
            val endpoint = when (verificationData.type) {
                CaptchaType.SLIDER -> "/api/v1/captcha/slider/verify"
                CaptchaType.PUZZLE -> "/api/v1/captcha/puzzle/verify"
                CaptchaType.CLICK -> "/api/v1/captcha/click/verify"
                CaptchaType.ROTATE -> "/api/v1/captcha/rotate/verify"
                CaptchaType.TEXT -> "/api/v1/captcha/text/verify"
                CaptchaType.ICON -> "/api/v1/captcha/icon/verify"
            }
            
            val params = buildParams(verificationData)
            
            val response = networkClient.request(
                endpoint = endpoint,
                method = okhttp3.HttpMethod.POST,
                params = params
            )
            
            if (response.isSuccess) {
                Result.success(response.data?.get("token") as? String ?: verificationData.token)
            } else {
                Result.failure(
                    CaptchaError.ValidationError(
                        response.errorMessage ?: "Verification failed"
                    )
                )
            }
        } catch (e: Exception) {
            Logger.e("CaptchaVerificationManager", "Verification failed: ${e.message}")
            Result.failure(CaptchaError.UnknownError(e.message ?: "Verification failed"))
        }
    }
    
    private fun buildParams(data: VerificationData): Map<String, Any> {
        val params = mutableMapOf<String, Any>(
            "token" to data.token,
            "fingerprint" to DeviceFingerprint.generate()
        )
        
        when (data.type) {
            CaptchaType.SLIDER -> {
                data.distance?.let { params["distance"] = it }
            }
            CaptchaType.PUZZLE -> {
                data.startX?.let { params["start_x"] = it }
                data.startY?.let { params["start_y"] = it }
                data.endX?.let { params["end_x"] = it }
                data.endY?.let { params["end_y"] = it }
            }
            CaptchaType.CLICK -> {
                data.points?.let { points ->
                    params["points"] = points.map { mapOf("x" to it.first, "y" to it.second) }
                }
            }
            CaptchaType.ROTATE -> {
                data.angle?.let { params["angle"] = it }
            }
            CaptchaType.TEXT -> {
                data.text?.let { params["text"] = it }
            }
            CaptchaType.ICON -> {
                data.icons?.let { params["icons"] = it }
            }
        }
        
        return params
    }
}
