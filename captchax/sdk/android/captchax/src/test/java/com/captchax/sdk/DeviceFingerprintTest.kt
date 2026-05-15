package com.captchax.sdk

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class DeviceFingerprintTest {
    
    @Test
    fun `DeviceFingerprint generate should return non-empty string`() {
        val fingerprint = DeviceFingerprint.generate()
        
        assertNotNull(fingerprint)
        assertTrue(fingerprint.isNotEmpty())
        assertEquals(64, fingerprint.length)
    }
    
    @Test
    fun `DeviceFingerprint generate should return consistent value`() {
        val fingerprint1 = DeviceFingerprint.generate()
        val fingerprint2 = DeviceFingerprint.generate()
        
        assertEquals(fingerprint1, fingerprint2)
    }
    
    @Test
    fun `DeviceFingerprint collect should return device information`() {
        val info = DeviceFingerprint.collect()
        
        assertNotNull(info)
        assertTrue(info.containsKey("androidId"))
        assertTrue(info.containsKey("model"))
        assertTrue(info.containsKey("manufacturer"))
        assertTrue(info.containsKey("sdkInt"))
        assertTrue(info.containsKey("screenWidth"))
        assertTrue(info.containsKey("screenHeight"))
    }
    
    @Test
    fun `DeviceFingerprint collect should return consistent values`() {
        val info1 = DeviceFingerprint.collect()
        val info2 = DeviceFingerprint.collect()
        
        assertEquals(info1["androidId"], info2["androidId"])
        assertEquals(info1["model"], info2["model"])
    }
    
    @Test
    fun `DeviceFingerprint getDeviceModel should return formatted model`() {
        val model = DeviceFingerprint.getDeviceModel()
        
        assertNotNull(model)
        assertTrue(model.isNotEmpty())
        assertTrue(model.contains("_"))
    }
    
    @Test
    fun `DeviceFingerprint getManufacturer should return non-empty string`() {
        val manufacturer = DeviceFingerprint.getManufacturer()
        
        assertNotNull(manufacturer)
        assertTrue(manufacturer.isNotEmpty())
    }
    
    @Test
    fun `DeviceFingerprint getOsVersion should return non-empty string`() {
        val version = DeviceFingerprint.getOsVersion()
        
        assertNotNull(version)
        assertTrue(version.isNotEmpty())
    }
    
    @Test
    fun `DeviceFingerprint getSdkVersion should return positive integer`() {
        val sdkVersion = DeviceFingerprint.getSdkVersion()
        
        assertTrue(sdkVersion > 0)
    }
    
    @Test
    fun `DeviceFingerprint isEmulator should return boolean`() {
        val result = DeviceFingerprint.isEmulator()
        
        assertNotNull(result)
        assertTrue(result is Boolean)
    }
    
    @Test
    fun `DeviceFingerprint isRooted should return boolean`() {
        val result = DeviceFingerprint.isRooted()
        
        assertNotNull(result)
        assertTrue(result is Boolean)
    }
    
    @Test
    fun `DeviceFingerprint clearCache should reset cached values`() {
        val fingerprint1 = DeviceFingerprint.generate()
        val info1 = DeviceFingerprint.collect()
        
        DeviceFingerprint.clearCache()
        
        val fingerprint2 = DeviceFingerprint.generate()
        val info2 = DeviceFingerprint.collect()
        
        assertEquals(fingerprint1, fingerprint2)
        assertEquals(info1["androidId"], info2["androidId"])
    }
}
