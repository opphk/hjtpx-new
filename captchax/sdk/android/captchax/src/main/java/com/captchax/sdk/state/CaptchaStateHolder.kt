package com.captchax.sdk.state

import com.captchax.sdk.CaptchaError
import com.captchax.sdk.CaptchaType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class CaptchaStateHolder {
    
    private val _state = MutableStateFlow<CaptchaState>(CaptchaState.Idle)
    val state: StateFlow<CaptchaState> = _state.asStateFlow()
    
    private val _progress = MutableStateFlow(0f)
    val progress: StateFlow<Float> = _progress.asStateFlow()
    
    private val _remainingAttempts = MutableStateFlow(3)
    val remainingAttempts: StateFlow<Int> = _remainingAttempts.asStateFlow()
    
    private val _clickPoints = MutableStateFlow<List<Pair<Float, Float>>>(emptyList())
    val clickPoints: StateFlow<List<Pair<Float, Float>>> = _clickPoints.asStateFlow()
    
    private val _rotationAngle = MutableStateFlow(0f)
    val rotationAngle: StateFlow<Float> = _rotationAngle.asStateFlow()
    
    private var currentToken: String? = null
    private var currentType: CaptchaType = CaptchaType.SLIDER
    
    fun setLoading() {
        _state.update { CaptchaState.Loading }
    }
    
    fun setSuccess(token: String, data: Map<String, Any>? = null) {
        currentToken = token
        _state.update { CaptchaState.Success(token, data) }
    }
    
    fun setError(error: CaptchaError) {
        _state.update { CaptchaState.Error(error) }
    }
    
    fun setIdle() {
        _state.update { CaptchaState.Idle }
    }
    
    fun setCaptchaType(type: CaptchaType) {
        currentType = type
        reset()
    }
    
    fun updateProgress(value: Float) {
        _progress.update { value.coerceIn(0f, 1f) }
    }
    
    fun addClickPoint(x: Float, y: Float) {
        _clickPoints.update { it + Pair(x, y) }
    }
    
    fun clearClickPoints() {
        _clickPoints.update { emptyList() }
    }
    
    fun updateRotation(angle: Float) {
        _rotationAngle.update { angle }
    }
    
    fun decrementAttempts() {
        _remainingAttempts.update { (it - 1).coerceAtLeast(0) }
    }
    
    fun resetAttempts() {
        _remainingAttempts.update { 3 }
    }
    
    fun reset() {
        _progress.update { 0f }
        _clickPoints.update { emptyList() }
        _rotationAngle.update { 0f }
        resetAttempts()
    }
    
    fun getToken(): String? = currentToken
    
    fun getCaptchaType(): CaptchaType = currentType
    
    fun destroy() {
        _state.update { CaptchaState.Idle }
        reset()
    }
}

sealed class CaptchaState {
    data object Idle : CaptchaState()
    data object Loading : CaptchaState()
    data class Success(val token: String, val data: Map<String, Any>? = null) : CaptchaState()
    data class Error(val error: CaptchaError) : CaptchaState()
    data object Completed : CaptchaState()
}
