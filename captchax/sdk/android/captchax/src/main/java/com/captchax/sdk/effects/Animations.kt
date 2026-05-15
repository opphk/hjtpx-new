package com.captchax.sdk.effects

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import kotlinx.coroutines.delay

@Composable
fun LoadingEffect(
    modifier: Modifier = Modifier,
    color: Color = Color(0xFF6200EE)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "loading")
    
    val scale by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 1.2f,
        animationSpec = infiniteRepeatable(
            animation = tween(600, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "scale"
    )
    
    Box(
        modifier = modifier
            .scale(scale)
            .background(color.copy(alpha = 0.3f))
    )
}

@Composable
fun ShakeEffect(
    trigger: Boolean,
    onComplete: () -> Unit = {}
) {
    val offsetX = remember { Animatable(0f) }
    
    LaunchedEffect(trigger) {
        if (trigger) {
            offsetX.animateTo(
                targetValue = 0f,
                animationSpec = tween(
                    durationMillis = 500,
                    easing = FastOutSlowInEasing
                )
            )
            offsetX.animateTo(
                targetValue = 25f,
                animationSpec = tween(50)
            )
            offsetX.animateTo(
                targetValue = -25f,
                animationSpec = tween(50)
            )
            offsetX.animateTo(
                targetValue = 15f,
                animationSpec = tween(50)
            )
            offsetX.animateTo(
                targetValue = -15f,
                animationSpec = tween(50)
            )
            offsetX.animateTo(
                targetValue = 0f,
                animationSpec = tween(50)
            )
            onComplete()
        }
    }
}

@Composable
fun PulseEffect(
    modifier: Modifier = Modifier,
    color: Color = Color(0xFF6200EE)
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    
    val alpha by infiniteTransition.animateFloat(
        initialValue = 0.3f,
        targetValue = 0.7f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "alpha"
    )
    
    Box(
        modifier = modifier
            .background(color.copy(alpha = alpha))
    )
}

@Composable
fun RotateEffect(
    targetAngle: Float,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "rotate")
    
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )
    
    Box(
        modifier = modifier.rotate(rotation)
    )
}

@Composable
fun SlideInEffect(
    visible: Boolean,
    modifier: Modifier = Modifier
) {
    val offsetY = remember { Animatable(if (visible) 300f else 0f) }
    
    LaunchedEffect(visible) {
        offsetY.animateTo(
            targetValue = if (visible) 0f else 300f,
            animationSpec = tween(300, easing = FastOutSlowInEasing)
        )
    }
}

@Composable
fun FadeEffect(
    visible: Boolean,
    modifier: Modifier = Modifier
) {
    val alpha = remember { Animatable(if (visible) 0f else 1f) }
    
    LaunchedEffect(visible) {
        alpha.animateTo(
            targetValue = if (visible) 1f else 0f,
            animationSpec = tween(300)
        )
    }
    
    Box(
        modifier = modifier.background(Color.Black.copy(alpha = alpha.value))
    )
}
