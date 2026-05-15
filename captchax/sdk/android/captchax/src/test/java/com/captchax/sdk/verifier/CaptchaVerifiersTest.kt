package com.captchax.sdk.verifier

import com.captchax.sdk.CaptchaError
import com.captchax.sdk.CaptchaType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

class CaptchaVerifiersTest {
    
    @Test
    fun `SliderVerifier should have correct type`() {
        val verifier = SliderVerifier(
            token = "test-token",
            distance = 50f
        ) { _, _ -> Result.success("verified-token") }
        
        assertEquals(CaptchaType.SLIDER, verifier.type)
    }
    
    @Test
    fun `PuzzleVerifier should have correct type`() {
        val verifier = PuzzleVerifier(
            token = "test-token",
            startX = 0f,
            startY = 0f,
            endX = 100f,
            endY = 100f
        ) { _, _, _, _, _ -> Result.success("verified-token") }
        
        assertEquals(CaptchaType.PUZZLE, verifier.type)
    }
    
    @Test
    fun `ClickVerifier should have correct type`() {
        val verifier = ClickVerifier(
            token = "test-token",
            points = listOf(Pair(100f, 200f), Pair(150f, 250f))
        ) { _, _ -> Result.success("verified-token") }
        
        assertEquals(CaptchaType.CLICK, verifier.type)
    }
    
    @Test
    fun `RotateVerifier should have correct type`() {
        val verifier = RotateVerifier(
            token = "test-token",
            angle = 45f
        ) { _, _, _ -> Result.success("verified-token") }
        
        assertEquals(CaptchaType.ROTATE, verifier.type)
    }
    
    @Test
    fun `TextVerifier should have correct type`() {
        val verifier = TextVerifier(
            token = "test-token",
            text = "ABC123"
        ) { _, _ -> Result.success("verified-token") }
        
        assertEquals(CaptchaType.TEXT, verifier.type)
    }
    
    @Test
    fun `IconVerifier should have correct type`() {
        val verifier = IconVerifier(
            token = "test-token",
            selectedIcons = listOf("star", "heart")
        ) { _, _ -> Result.success("verified-token") }
        
        assertEquals(CaptchaType.ICON, verifier.type)
    }
    
    @Test
    fun `VerificationData should store all types of verification data`() {
        val data = VerificationData(
            token = "test-token",
            type = CaptchaType.SLIDER,
            distance = 50f
        )
        
        assertEquals("test-token", data.token)
        assertEquals(CaptchaType.SLIDER, data.type)
        assertEquals(50f, data.distance)
    }
    
    @Test
    fun `VerificationData should store click verification data`() {
        val data = VerificationData(
            token = "test-token",
            type = CaptchaType.CLICK,
            points = listOf(Pair(100f, 200f), Pair(150f, 250f))
        )
        
        assertEquals(2, data.points?.size)
        assertEquals(Pair(100f, 200f), data.points?.get(0))
    }
    
    @Test
    fun `VerificationData should store rotation verification data`() {
        val data = VerificationData(
            token = "test-token",
            type = CaptchaType.ROTATE,
            angle = 90f
        )
        
        assertEquals(90f, data.angle)
    }
    
    @Test
    fun `VerificationData should store text verification data`() {
        val data = VerificationData(
            token = "test-token",
            type = CaptchaType.TEXT,
            text = "ABC123"
        )
        
        assertEquals("ABC123", data.text)
    }
    
    @Test
    fun `VerificationData should store icon verification data`() {
        val data = VerificationData(
            token = "test-token",
            type = CaptchaType.ICON,
            icons = listOf("star", "heart", "circle")
        )
        
        assertEquals(3, data.icons?.size)
    }
    
    @Test
    fun `VerificationData should store puzzle verification data`() {
        val data = VerificationData(
            token = "test-token",
            type = CaptchaType.PUZZLE,
            startX = 10f,
            startY = 20f,
            endX = 100f,
            endY = 120f
        )
        
        assertEquals(10f, data.startX)
        assertEquals(20f, data.startY)
        assertEquals(100f, data.endX)
        assertEquals(120f, data.endY)
    }
}
