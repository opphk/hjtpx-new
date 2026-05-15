package com.captchax.sdk

import com.captchax.sdk.util.Logger
import okhttp3.OkHttpClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.MockitoAnnotations
import java.util.concurrent.TimeUnit

class NetworkClientTest {
    
    private lateinit var networkClient: NetworkClient
    private lateinit var config: CaptchaConfig
    
    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        config = CaptchaConfig(
            apiKey = "test-api-key",
            apiSecret = "test-api-secret",
            serverUrl = "https://api.captchax.com",
            timeout = 30000L
        )
        networkClient = NetworkClient(config)
    }
    
    @Test
    fun `NetworkClient should be created with correct config`() {
        assertEquals(config, networkClient.config)
    }
    
    @Test
    fun `NetworkResponse should store success state correctly`() {
        val successResponse = NetworkClient.NetworkResponse(
            isSuccess = true,
            data = mapOf("token" to "test-token"),
            errorCode = null,
            errorMessage = null
        )
        
        assertTrue(successResponse.isSuccess)
        assertNotNull(successResponse.data)
        assertEquals("test-token", successResponse.data?.get("token"))
        assertNull(successResponse.errorCode)
        assertNull(successResponse.errorMessage)
    }
    
    @Test
    fun `NetworkResponse should store error state correctly`() {
        val errorResponse = NetworkClient.NetworkResponse(
            isSuccess = false,
            data = null,
            errorCode = "NETWORK_ERROR",
            errorMessage = "Network request failed"
        )
        
        assertFalse(errorResponse.isSuccess)
        assertNull(errorResponse.data)
        assertEquals("NETWORK_ERROR", errorResponse.errorCode)
        assertEquals("Network request failed", errorResponse.errorMessage)
    }
    
    @Test
    fun `UploadResponse should store success state correctly`() {
        val successResponse = NetworkClient.UploadResponse(
            isSuccess = true,
            url = "https://cdn.example.com/image.png",
            errorCode = null,
            errorMessage = null
        )
        
        assertTrue(successResponse.isSuccess)
        assertEquals("https://cdn.example.com/image.png", successResponse.url)
        assertNull(successResponse.errorCode)
        assertNull(successResponse.errorMessage)
    }
    
    @Test
    fun `UploadResponse should store error state correctly`() {
        val errorResponse = NetworkClient.UploadResponse(
            isSuccess = false,
            url = null,
            errorCode = "UPLOAD_ERROR",
            errorMessage = "Failed to upload image"
        )
        
        assertFalse(errorResponse.isSuccess)
        assertNull(errorResponse.url)
        assertEquals("UPLOAD_ERROR", errorResponse.errorCode)
        assertEquals("Failed to upload image", errorResponse.errorMessage)
    }
}
