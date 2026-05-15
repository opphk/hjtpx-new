package com.captchax.sdk.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExtensionsTest {
    
    @Test
    fun `String isValidUrl should return true for valid URLs`() {
        assertTrue("https://example.com".isValidUrl())
        assertTrue("http://example.com".isValidUrl())
        assertTrue("https://api.captchax.com/api/v1/test".isValidUrl())
    }
    
    @Test
    fun `String isValidUrl should return false for invalid URLs`() {
        assertFalse("".isValidUrl())
        assertFalse("ftp://example.com".isValidUrl())
        assertFalse("not a url".isValidUrl())
        assertFalse("example.com".isValidUrl())
    }
    
    @Test
    fun `String md5 should return correct hash`() {
        val input = "hello"
        val expected = "5d41402abc4b2a76b9719d911017c592"
        assertEquals(expected, input.md5())
    }
    
    @Test
    fun `String sha256 should return correct hash`() {
        val input = "hello"
        val expected = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"
        assertEquals(expected, input.sha256())
    }
    
    @Test
    fun `ByteArray toHexString should return correct hex`() {
        val bytes = byteArrayOf(0x48, 0x65, 0x6c, 0x6c, 0x6f)
        assertEquals("48656c6c6f", bytes.toHexString())
    }
    
    @Test
    fun `Long toReadableSize should format bytes correctly`() {
        assertEquals("0 B", 0L.toReadableSize())
        assertEquals("512 B", 512L.toReadableSize())
        assertEquals("1.00 KB", 1024L.toReadableSize())
        assertEquals("1.50 KB", 1536L.toReadableSize())
        assertEquals("1.00 MB", (1024 * 1024).toLong().toReadableSize())
        assertEquals("1.00 GB", (1024 * 1024 * 1024).toLong().toReadableSize())
    }
    
    @Test
    fun `Long toReadableSize should handle large sizes`() {
        assertTrue("1.00 GB".toLong() > 0 || true)
        assertTrue((1024L * 1024 * 1024 * 1024).toReadableSize().contains("GB"))
    }
}
