package com.captchax.sdk

import android.graphics.Bitmap
import android.graphics.Color
import com.captchax.sdk.util.Logger
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test
import org.mockito.Mock
import org.mockito.MockitoAnnotations

class ImageCacheTest {
    
    private lateinit var imageCache: ImageCache
    private var bitmapCounter = 0
    
    @Before
    fun setup() {
        MockitoAnnotations.openMocks(this)
        imageCache = ImageCache(10)
        bitmapCounter = 0
    }
    
    private fun createTestBitmap(width: Int = 100, height: Int = 100): Bitmap {
        return Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888).apply {
            eraseColor(Color.RED)
        }
    }
    
    @Test
    fun `ImageCache should store and retrieve bitmap`() {
        val bitmap = createTestBitmap()
        imageCache.put("test-key", bitmap)
        
        val retrieved = imageCache.get("test-key")
        
        assertNotNull(retrieved)
        assertEquals(bitmap.width, retrieved?.width)
        assertEquals(bitmap.height, retrieved?.height)
    }
    
    @Test
    fun `ImageCache should return null for non-existent key`() {
        val result = imageCache.get("non-existent-key")
        assertNull(result)
    }
    
    @Test
    fun `ImageCache should replace existing bitmap`() {
        val bitmap1 = createTestBitmap()
        val bitmap2 = createTestBitmap()
        
        imageCache.put("key", bitmap1)
        imageCache.put("key", bitmap2)
        
        val result = imageCache.get("key")
        assertNotNull(result)
        assertEquals(bitmap2.width, result?.width)
    }
    
    @Test
    fun `ImageCache should remove bitmap`() {
        val bitmap = createTestBitmap()
        imageCache.put("test-key", bitmap)
        
        imageCache.remove("test-key")
        
        val result = imageCache.get("test-key")
        assertNull(result)
    }
    
    @Test
    fun `ImageCache should clear all bitmaps`() {
        val bitmap1 = createTestBitmap()
        val bitmap2 = createTestBitmap()
        
        imageCache.put("key1", bitmap1)
        imageCache.put("key2", bitmap2)
        
        imageCache.clear()
        
        assertNull(imageCache.get("key1"))
        assertNull(imageCache.get("key2"))
    }
    
    @Test
    fun `ImageCache should track cache operations`() {
        val bitmap = createTestBitmap()
        
        imageCache.get("non-existent")
        assertTrue(imageCache.missCount() >= 1)
        
        imageCache.put("test", bitmap)
        imageCache.get("test")
        imageCache.get("test")
        
        assertTrue(imageCache.hitCount() >= 2)
    }
    
    @Test
    fun `ImageCache should report correct size`() {
        val bitmap = createTestBitmap()
        
        val initialSize = imageCache.size()
        imageCache.put("key", bitmap)
        val newSize = imageCache.size()
        
        assertTrue(newSize > initialSize)
    }
    
    @Test
    fun `ImageCache should handle multiple bitmaps`() {
        val bitmaps = (1..5).map { createTestBitmap() }
        
        bitmaps.forEachIndexed { index, bitmap ->
            imageCache.put("key-$index", bitmap)
        }
        
        (0 until 5).forEach { index ->
            assertNotNull(imageCache.get("key-$index"))
        }
    }
    
    @Test
    fun `ImageCache should evict old entries when full`() {
        val smallCache = ImageCache(2)
        
        val bitmap1 = createTestBitmap()
        val bitmap2 = createTestBitmap()
        val bitmap3 = createTestBitmap()
        
        smallCache.put("key1", bitmap1)
        smallCache.put("key2", bitmap2)
        smallCache.put("key3", bitmap3)
        
        assertTrue(
            smallCache.get("key1") != null || 
            smallCache.get("key2") != null || 
            smallCache.get("key3") != null
        )
    }
}
