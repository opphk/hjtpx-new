package com.captchax.sdk

import com.captchax.sdk.repository.CaptchaRepository
import com.captchax.sdk.state.CaptchaStateHolder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.withContext
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.MockitoAnnotations
import org.mockito.kotlin.any
import org.mockito.kotlin.whenever

@OptIn(ExperimentalCoroutinesApi::class)
class CaptchaXTest {
    
    @Mock
    private lateinit var mockNetworkClient: NetworkClient
    
    @Mock
    private lateinit var mockImageCache: ImageCache
    
    private lateinit var captchaRepository: CaptchaRepository
    private lateinit var captchaStateHolder: CaptchaStateHolder
    private val testDispatcher = StandardTestDispatcher()
    
    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        captchaStateHolder = CaptchaStateHolder()
    }
    
    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }
    
    @Test
    fun `CaptchaConfig should validate API key is not blank`() {
        val exception = org.junit.Assert.assertThrows(IllegalArgumentException::class.java) {
            CaptchaConfig(
                apiKey = "",
                apiSecret = "secret",
                serverUrl = "https://api.captchax.com"
            )
        }
        assertEquals("API Key cannot be blank", exception.message)
    }
    
    @Test
    fun `CaptchaConfig should validate API secret is not blank`() {
        val exception = org.junit.Assert.assertThrows(IllegalArgumentException::class.java) {
            CaptchaConfig(
                apiKey = "key",
                apiSecret = "",
                serverUrl = "https://api.captchax.com"
            )
        }
        assertEquals("API Secret cannot be blank", exception.message)
    }
    
    @Test
    fun `CaptchaConfig should validate server URL is not blank`() {
        val exception = org.junit.Assert.assertThrows(IllegalArgumentException::class.java) {
            CaptchaConfig(
                apiKey = "key",
                apiSecret = "secret",
                serverUrl = ""
            )
        }
        assertEquals("Server URL cannot be blank", exception.message)
    }
    
    @Test
    fun `CaptchaConfig should validate timeout is positive`() {
        val exception = org.junit.Assert.assertThrows(IllegalArgumentException::class.java) {
            CaptchaConfig(
                apiKey = "key",
                apiSecret = "secret",
                serverUrl = "https://api.captchax.com",
                timeout = 0L
            )
        }
        assertEquals("Timeout must be positive", exception.message)
    }
    
    @Test
    fun `CaptchaConfig builder should create config with default values`() {
        val config = CaptchaConfig.builder()
            .apiKey("test-key")
            .apiSecret("test-secret")
            .build()
        
        assertEquals("test-key", config.apiKey)
        assertEquals("test-secret", config.apiSecret)
        assertEquals("https://api.captchax.com", config.serverUrl)
        assertEquals(30000L, config.timeout)
        assertTrue(config.cacheEnabled)
        assertTrue(config.preloadEnabled)
    }
    
    @Test
    fun `CaptchaConfig builder should allow custom values`() {
        val config = CaptchaConfig.builder()
            .apiKey("custom-key")
            .apiSecret("custom-secret")
            .serverUrl("https://custom.api.com")
            .timeout(60000L)
            .cacheEnabled(false)
            .preloadEnabled(false)
            .build()
        
        assertEquals("custom-key", config.apiKey)
        assertEquals("custom-secret", config.apiSecret)
        assertEquals("https://custom.api.com", config.serverUrl)
        assertEquals(60000L, config.timeout)
        assertFalse(config.cacheEnabled)
        assertFalse(config.preloadEnabled)
    }
    
    @Test
    fun `CaptchaType fromString should return correct type`() {
        assertEquals(CaptchaType.SLIDER, CaptchaType.fromString("slider"))
        assertEquals(CaptchaType.CLICK, CaptchaType.fromString("click"))
        assertEquals(CaptchaType.PUZZLE, CaptchaType.fromString("puzzle"))
        assertEquals(CaptchaType.ROTATE, CaptchaType.fromString("rotate"))
        assertEquals(CaptchaType.TEXT, CaptchaType.fromString("text"))
        assertEquals(CaptchaType.ICON, CaptchaType.fromString("icon"))
    }
    
    @Test
    fun `CaptchaType fromString should be case insensitive`() {
        assertEquals(CaptchaType.SLIDER, CaptchaType.fromString("SLIDER"))
        assertEquals(CaptchaType.CLICK, CaptchaType.fromString("Click"))
        assertEquals(CaptchaType.PUZZLE, CaptchaType.fromString("PuZzLe"))
    }
    
    @Test
    fun `CaptchaType fromString should return SLIDER for unknown type`() {
        assertEquals(CaptchaType.SLIDER, CaptchaType.fromString("unknown"))
        assertEquals(CaptchaType.SLIDER, CaptchaType.fromString(""))
    }
    
    @Test
    fun `CaptchaError fromCode should return correct error type`() {
        assertTrue(CaptchaError.fromCode("NETWORK_ERROR", "Network failed") is CaptchaError.NetworkError)
        assertTrue(CaptchaError.fromCode("TIMEOUT", "Timeout") is CaptchaError.TimeoutError)
        assertTrue(CaptchaError.fromCode("INVALID_PARAMS", "Invalid") is CaptchaError.ValidationError)
        assertTrue(CaptchaError.fromCode("SERVER_ERROR", "Server error") is CaptchaError.ServerError)
        assertTrue(CaptchaError.fromCode("UNKNOWN", "Unknown") is CaptchaError.UnknownError)
    }
    
    @Test
    fun `CaptchaError should have correct code and message`() {
        val error = CaptchaError.NetworkError("Network failed")
        assertEquals("NETWORK_ERROR", error.code)
        assertEquals("Network failed", error.message)
    }
    
    @Test
    fun `CaptchaStateHolder should manage state correctly`() {
        val holder = CaptchaStateHolder()
        
        holder.setLoading()
        assertTrue(holder.state.value is com.captchax.sdk.state.CaptchaState.Loading)
        
        holder.setSuccess("token123")
        assertTrue(holder.state.value is com.captchax.sdk.state.CaptchaState.Success)
        
        holder.setError(CaptchaError.UnknownError("test error"))
        assertTrue(holder.state.value is com.captchax.sdk.state.CaptchaState.Error)
        
        holder.setIdle()
        assertTrue(holder.state.value is com.captchax.sdk.state.CaptchaState.Idle)
    }
    
    @Test
    fun `CaptchaStateHolder should track progress`() {
        val holder = CaptchaStateHolder()
        
        holder.updateProgress(0.5f)
        assertEquals(0.5f, holder.progress.value)
        
        holder.updateProgress(1.5f)
        assertEquals(1f, holder.progress.value)
        
        holder.updateProgress(-0.5f)
        assertEquals(0f, holder.progress.value)
    }
    
    @Test
    fun `CaptchaStateHolder should track click points`() {
        val holder = CaptchaStateHolder()
        
        holder.addClickPoint(100f, 200f)
        holder.addClickPoint(150f, 250f)
        
        assertEquals(2, holder.clickPoints.value.size)
        assertEquals(Pair(100f, 200f), holder.clickPoints.value[0])
        assertEquals(Pair(150f, 250f), holder.clickPoints.value[1])
        
        holder.clearClickPoints()
        assertTrue(holder.clickPoints.value.isEmpty())
    }
    
    @Test
    fun `CaptchaStateHolder should track rotation angle`() {
        val holder = CaptchaStateHolder()
        
        holder.updateRotation(45f)
        assertEquals(45f, holder.rotationAngle.value)
        
        holder.updateRotation(-90f)
        assertEquals(-90f, holder.rotationAngle.value)
    }
    
    @Test
    fun `CaptchaStateHolder should track remaining attempts`() {
        val holder = CaptchaStateHolder()
        
        assertEquals(3, holder.remainingAttempts.value)
        
        holder.decrementAttempts()
        assertEquals(2, holder.remainingAttempts.value)
        
        holder.decrementAttempts()
        assertEquals(1, holder.remainingAttempts.value)
        
        holder.decrementAttempts()
        assertEquals(0, holder.remainingAttempts.value)
        
        holder.decrementAttempts()
        assertEquals(0, holder.remainingAttempts.value)
        
        holder.resetAttempts()
        assertEquals(3, holder.remainingAttempts.value)
    }
    
    @Test
    fun `CaptchaStateHolder should reset state`() {
        val holder = CaptchaStateHolder()
        
        holder.updateProgress(0.5f)
        holder.addClickPoint(100f, 200f)
        holder.updateRotation(45f)
        
        holder.reset()
        
        assertEquals(0f, holder.progress.value)
        assertTrue(holder.clickPoints.value.isEmpty())
        assertEquals(0f, holder.rotationAngle.value)
        assertEquals(3, holder.remainingAttempts.value)
    }
    
    @Test
    fun `CaptchaStateHolder should store and retrieve token`() {
        val holder = CaptchaStateHolder()
        
        holder.setSuccess("test-token")
        assertEquals("test-token", holder.getToken())
    }
    
    @Test
    fun `CaptchaStateHolder should store and retrieve captcha type`() {
        val holder = CaptchaStateHolder()
        
        holder.setCaptchaType(CaptchaType.CLICK)
        assertEquals(CaptchaType.CLICK, holder.getCaptchaType())
        
        holder.setCaptchaType(CaptchaType.ROTATE)
        assertEquals(CaptchaType.ROTATE, holder.getCaptchaType())
    }
    
    @Test
    fun `CaptchaRequest should have default values`() {
        val request = CaptchaRequest(scene = "login")
        
        assertEquals("login", request.scene)
        assertEquals(CaptchaType.SLIDER, request.type)
        assertEquals(300, request.width)
        assertEquals(200, request.height)
    }
    
    @Test
    fun `CaptchaVerifyRequest should store data correctly`() {
        val request = CaptchaVerifyRequest(
            token = "token123",
            data = mapOf("distance" to 50)
        )
        
        assertEquals("token123", request.token)
        assertEquals(50, request.data["distance"])
    }
    
    @Test
    fun `CaptchaVerifyResponse should have correct properties`() {
        val successResponse = CaptchaVerifyResponse(
            success = true,
            token = "verified-token"
        )
        
        assertTrue(successResponse.success)
        assertEquals("verified-token", successResponse.token)
        assertNull(successResponse.errorCode)
        
        val errorResponse = CaptchaVerifyResponse(
            success = false,
            errorCode = "VERIFICATION_FAILED",
            errorMessage = "Verification failed"
        )
        
        assertFalse(errorResponse.success)
        assertNull(errorResponse.token)
        assertEquals("VERIFICATION_FAILED", errorResponse.errorCode)
        assertEquals("Verification failed", errorResponse.errorMessage)
    }
}
