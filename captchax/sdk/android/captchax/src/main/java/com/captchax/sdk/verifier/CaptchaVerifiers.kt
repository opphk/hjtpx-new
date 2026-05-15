package com.captchax.sdk.verifier

import com.captchax.sdk.CaptchaError
import com.captchax.sdk.CaptchaType

interface CaptchaVerifier {
    val type: CaptchaType
    suspend fun verify(data: Map<String, Any>): Result<String>
}

class SliderVerifier(
    private val token: String,
    private val distance: Float,
    private val verifyBlock: suspend (String, Float) -> Result<String>
) : CaptchaVerifier {
    override val type = CaptchaType.SLIDER
    
    override suspend fun verify(data: Map<String, Any>): Result<String> {
        return verifyBlock(token, distance)
    }
}

class PuzzleVerifier(
    private val token: String,
    private val startX: Float,
    private val startY: Float,
    private val endX: Float,
    private val endY: Float,
    private val verifyBlock: suspend (String, Float, Float, Float, Float) -> Result<String>
) : CaptchaVerifier {
    override val type = CaptchaType.PUZZLE
    
    override suspend fun verify(data: Map<String, Any>): Result<String> {
        return verifyBlock(token, startX, startY, endX, endY)
    }
}

class ClickVerifier(
    private val token: String,
    private val points: List<Pair<Float, Float>>,
    private val verifyBlock: suspend (String, List<Pair<Float, Float>>) -> Result<String>
) : CaptchaVerifier {
    override val type = CaptchaType.CLICK
    
    override suspend fun verify(data: Map<String, Any>): Result<String> {
        return verifyBlock(token, points)
    }
}

class RotateVerifier(
    private val token: String,
    private val angle: Float,
    private val targetAngle: Float? = null,
    private val verifyBlock: suspend (String, Float, Float?) -> Result<String>
) : CaptchaVerifier {
    override val type = CaptchaType.ROTATE
    
    override suspend fun verify(data: Map<String, Any>): Result<String> {
        val tolerance = (data["tolerance"] as? Number)?.toFloat() ?: 15f
        return verifyBlock(token, angle, targetAngle)
    }
}

class TextVerifier(
    private val token: String,
    private val text: String,
    private val verifyBlock: suspend (String, String) -> Result<String>
) : CaptchaVerifier {
    override val type = CaptchaType.TEXT
    
    override suspend fun verify(data: Map<String, Any>): Result<String> {
        return verifyBlock(token, text)
    }
}

class IconVerifier(
    private val token: String,
    private val selectedIcons: List<String>,
    private val verifyBlock: suspend (String, List<String>) -> Result<String>
) : CaptchaVerifier {
    override val type = CaptchaType.ICON
    
    override suspend fun verify(data: Map<String, Any>): Result<String> {
        return verifyBlock(token, selectedIcons)
    }
}

data class VerificationData(
    val token: String,
    val type: CaptchaType,
    val distance: Float? = null,
    val points: List<Pair<Float, Float>>? = null,
    val angle: Float? = null,
    val text: String? = null,
    val icons: List<String>? = null,
    val startX: Float? = null,
    val startY: Float? = null,
    val endX: Float? = null,
    val endY: Float? = null
)
