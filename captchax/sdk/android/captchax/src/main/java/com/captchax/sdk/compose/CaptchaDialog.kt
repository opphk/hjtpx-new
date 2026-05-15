package com.captchax.sdk.compose

import android.app.Activity
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import coil.ImageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import com.captchax.sdk.CaptchaError
import com.captchax.sdk.CaptchaType
import com.captchax.sdk.compose.theme.CaptchaXTheme
import com.captchax.sdk.state.CaptchaState
import com.captchax.sdk.state.CaptchaStateHolder
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.roundToInt

@Composable
fun CaptchaXDialog(
    type: CaptchaType = CaptchaType.SLIDER,
    scene: String = "default",
    onSuccess: (String) -> Unit,
    onError: (CaptchaError) -> Unit,
    onDismiss: () -> Unit,
    requestCaptcha: suspend (String, CaptchaType) -> CaptchaStateHolder.CaptchaData?,
    verifyCaptcha: suspend (VerificationRequest) -> Result<String>
) {
    val stateHolder = remember { CaptchaStateHolder() }
    val state by stateHolder.state.collectAsState()
    val progress by stateHolder.progress.collectAsState()
    val clickPoints by stateHolder.clickPoints.collectAsState()
    val rotationAngle by stateHolder.rotationAngle.collectAsState()
    val remainingAttempts by stateHolder.remainingAttempts.collectAsState()
    
    val coroutineScope = rememberCoroutineScope()
    var captchaData by remember { mutableStateOf<CaptchaStateHolder.CaptchaData?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var isLoading by remember { mutableStateOf(true) }
    
    LaunchedEffect(Unit) {
        stateHolder.setCaptchaType(type)
        isLoading = true
        try {
            val data = requestCaptcha(scene, type)
            if (data != null) {
                captchaData = data
                stateHolder.setSuccess(data.token)
            } else {
                stateHolder.setError(CaptchaError.ServerError("Failed to load captcha"))
            }
        } catch (e: Exception) {
            stateHolder.setError(CaptchaError.UnknownError(e.message ?: "Unknown error"))
        }
        isLoading = false
    }
    
    DisposableEffect(Unit) {
        onDispose {
            stateHolder.destroy()
        }
    }
    
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        CaptchaXTheme {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 8.dp
            ) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Text(
                        text = "安全验证",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    when {
                        isLoading -> {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(200.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                CircularProgressIndicator()
                            }
                        }
                        errorMessage != null -> {
                            Text(
                                text = errorMessage ?: "",
                                color = MaterialTheme.colorScheme.error,
                                textAlign = TextAlign.Center
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(onClick = { /* Retry */ }) {
                                Text("重试")
                            }
                        }
                        else -> {
                            when (type) {
                                CaptchaType.SLIDER -> SliderCaptchaContent(
                                    captchaData = captchaData,
                                    progress = progress,
                                    onProgressChange = { stateHolder.updateProgress(it) },
                                    onVerify = { distance ->
                                        coroutineScope.launch {
                                            stateHolder.setLoading()
                                            val result = verifyCaptcha(
                                                VerificationRequest(
                                                    type = CaptchaType.SLIDER,
                                                    token = captchaData?.token ?: "",
                                                    distance = distance
                                                )
                                            )
                                            result.onSuccess { token ->
                                                stateHolder.setSuccess(token)
                                                onSuccess(token)
                                            }.onFailure { error ->
                                                stateHolder.decrementAttempts()
                                                if (remainingAttempts > 0) {
                                                    errorMessage = "验证失败，请重试"
                                                    stateHolder.updateProgress(0f)
                                                } else {
                                                    onError(error as? CaptchaError ?: CaptchaError.UnknownError("验证失败"))
                                                }
                                            }
                                        }
                                    }
                                )
                                
                                CaptchaType.CLICK -> ClickCaptchaContent(
                                    captchaData = captchaData,
                                    clickPoints = clickPoints,
                                    requiredClicks = 4,
                                    onPointAdded = { x, y -> stateHolder.addClickPoint(x, y) },
                                    onVerify = {
                                        coroutineScope.launch {
                                            stateHolder.setLoading()
                                            val result = verifyCaptcha(
                                                VerificationRequest(
                                                    type = CaptchaType.CLICK,
                                                    token = captchaData?.token ?: "",
                                                    points = clickPoints
                                                )
                                            )
                                            result.onSuccess { token ->
                                                stateHolder.setSuccess(token)
                                                onSuccess(token)
                                            }.onFailure { error ->
                                                stateHolder.clearClickPoints()
                                                stateHolder.decrementAttempts()
                                                if (remainingAttempts > 0) {
                                                    errorMessage = "验证失败，请重试"
                                                } else {
                                                    onError(error as? CaptchaError ?: CaptchaError.UnknownError("验证失败"))
                                                }
                                            }
                                        }
                                    }
                                )
                                
                                CaptchaType.ROTATE -> RotateCaptchaContent(
                                    captchaData = captchaData,
                                    currentAngle = rotationAngle,
                                    onAngleChange = { stateHolder.updateRotation(it) },
                                    onVerify = { angle ->
                                        coroutineScope.launch {
                                            stateHolder.setLoading()
                                            val result = verifyCaptcha(
                                                VerificationRequest(
                                                    type = CaptchaType.ROTATE,
                                                    token = captchaData?.token ?: "",
                                                    angle = angle
                                                )
                                            )
                                            result.onSuccess { token ->
                                                stateHolder.setSuccess(token)
                                                onSuccess(token)
                                            }.onFailure { error ->
                                                stateHolder.decrementAttempts()
                                                if (remainingAttempts > 0) {
                                                    errorMessage = "验证失败，请重试"
                                                    stateHolder.updateRotation(0f)
                                                } else {
                                                    onError(error as? CaptchaError ?: CaptchaError.UnknownError("验证失败"))
                                                }
                                            }
                                        }
                                    }
                                )
                                
                                CaptchaType.PUZZLE -> PuzzleCaptchaContent(
                                    captchaData = captchaData,
                                    progress = progress,
                                    onProgressChange = { stateHolder.updateProgress(it) },
                                    onVerify = { distance ->
                                        coroutineScope.launch {
                                            stateHolder.setLoading()
                                            val result = verifyCaptcha(
                                                VerificationRequest(
                                                    type = CaptchaType.PUZZLE,
                                                    token = captchaData?.token ?: "",
                                                    distance = distance
                                                )
                                            )
                                            result.onSuccess { token ->
                                                stateHolder.setSuccess(token)
                                                onSuccess(token)
                                            }.onFailure { error ->
                                                stateHolder.decrementAttempts()
                                                if (remainingAttempts > 0) {
                                                    errorMessage = "验证失败，请重试"
                                                    stateHolder.updateProgress(0f)
                                                } else {
                                                    onError(error as? CaptchaError ?: CaptchaError.UnknownError("验证失败"))
                                                }
                                            }
                                        }
                                    }
                                )
                                
                                CaptchaType.TEXT -> TextCaptchaContent(
                                    captchaData = captchaData,
                                    onVerify = { text ->
                                        coroutineScope.launch {
                                            stateHolder.setLoading()
                                            val result = verifyCaptcha(
                                                VerificationRequest(
                                                    type = CaptchaType.TEXT,
                                                    token = captchaData?.token ?: "",
                                                    text = text
                                                )
                                            )
                                            result.onSuccess { token ->
                                                stateHolder.setSuccess(token)
                                                onSuccess(token)
                                            }.onFailure { error ->
                                                stateHolder.decrementAttempts()
                                                if (remainingAttempts > 0) {
                                                    errorMessage = "验证失败，请重试"
                                                } else {
                                                    onError(error as? CaptchaError ?: CaptchaError.UnknownError("验证失败"))
                                                }
                                            }
                                        }
                                    }
                                )
                                
                                CaptchaType.ICON -> IconCaptchaContent(
                                    captchaData = captchaData,
                                    onVerify = { icons ->
                                        coroutineScope.launch {
                                            stateHolder.setLoading()
                                            val result = verifyCaptcha(
                                                VerificationRequest(
                                                    type = CaptchaType.ICON,
                                                    token = captchaData?.token ?: "",
                                                    icons = icons
                                                )
                                            )
                                            result.onSuccess { token ->
                                                stateHolder.setSuccess(token)
                                                onSuccess(token)
                                            }.onFailure { error ->
                                                stateHolder.decrementAttempts()
                                                if (remainingAttempts > 0) {
                                                    errorMessage = "验证失败，请重试"
                                                } else {
                                                    onError(error as? CaptchaError ?: CaptchaError.UnknownError("验证失败"))
                                                }
                                            }
                                        }
                                    }
                                )
                            }
                        }
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    if (remainingAttempts > 0 && !isLoading) {
                        Text(
                            text = "剩余尝试次数: $remainingAttempts",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    TextButton(onClick = onDismiss) {
                        Text("取消")
                    }
                }
            }
        }
    }
}

@Composable
fun SliderCaptchaContent(
    captchaData: CaptchaStateHolder.CaptchaData?,
    progress: Float,
    onProgressChange: (Float) -> Unit,
    onVerify: (Float) -> Unit
) {
    var sliderPosition by remember { mutableFloatStateOf(0f) }
    var containerWidth by remember { mutableIntStateOf(0) }
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "拖动滑块完成拼图",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .onSizeChanged { containerWidth = it.width }
        ) {
            if (captchaData?.imageUrl != null) {
                AsyncImage(
                    url = captchaData.imageUrl,
                    modifier = Modifier.fillMaxSize()
                )
            }
            
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(50.dp)
                    .background(
                        MaterialTheme.colorScheme.primary.copy(alpha = 0.3f),
                        CircleShape
                    )
            )
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
                .clip(RoundedCornerShape(25.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .height(50.dp)
                    .background(MaterialTheme.colorScheme.primary)
            )
            
            Box(
                modifier = Modifier
                    .offset { IntOffset(sliderPosition.roundToInt(), 0) }
                    .size(50.dp)
                    .shadow(4.dp, CircleShape)
                    .background(Color.White, CircleShape)
                    .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape)
                    .pointerInput(Unit) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            val newPosition = sliderPosition + dragAmount.x
                            sliderPosition = newPosition.coerceIn(
                                0f,
                                (containerWidth - with(LocalDensity.current) { 50.dp.toPx() }).coerceAtLeast(0f)
                            )
                            val progressValue = sliderPosition / (containerWidth - with(LocalDensity.current) { 50.dp.toPx() })
                            onProgressChange(progressValue.coerceIn(0f, 1f))
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(id = android.R.drawable.ic_media_play),
                    contentDescription = "Drag",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = { onVerify(progress) },
            modifier = Modifier.fillMaxWidth(),
            enabled = progress > 0.9f
        ) {
            Text("验证")
        }
    }
}

@Composable
fun ClickCaptchaContent(
    captchaData: CaptchaStateHolder.CaptchaData?,
    clickPoints: List<Pair<Float, Float>>,
    requiredClicks: Int,
    onPointAdded: (Float, Float) -> Unit,
    onVerify: () -> Unit
) {
    val context = LocalContext.current
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "请依次点击图中位置",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        Text(
            text = "点击进度: ${clickPoints.size} / $requiredClicks",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .pointerInput(Unit) {
                    detectTapGestures { offset ->
                        onPointAdded(offset.x, offset.y)
                    }
                }
        ) {
            if (captchaData?.imageUrl != null) {
                AsyncImage(
                    url = captchaData.imageUrl,
                    modifier = Modifier.fillMaxSize()
                )
            }
            
            clickPoints.forEachIndexed { index, point ->
                Box(
                    modifier = Modifier
                        .offset { IntOffset(point.first.roundToInt(), point.second.roundToInt()) }
                        .size(30.dp)
                        .graphicsLayer {
                            translationX = -15f
                            translationY = -15f
                        }
                        .background(
                            MaterialTheme.colorScheme.primary,
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "${index + 1}",
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = onVerify,
            modifier = Modifier.fillMaxWidth(),
            enabled = clickPoints.size >= requiredClicks
        ) {
            Text("验证")
        }
    }
}

@Composable
fun RotateCaptchaContent(
    captchaData: CaptchaStateHolder.CaptchaData?,
    currentAngle: Float,
    onAngleChange: (Float) -> Unit,
    onVerify: (Float) -> Unit
) {
    var rotation by remember { mutableFloatStateOf(0f) }
    var lastAngle by remember { mutableFloatStateOf(0f) }
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "旋转图片至正确角度",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .size(200.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .pointerInput(Unit) {
                    detectDragGestures { change, _ ->
                        val center = Offset(size.width / 2f, size.height / 2f)
                        val angle = atan2(
                            change.position.y - center.y,
                            change.position.x - center.x
                        ) * (180f / PI.toFloat())
                        
                        rotation = angle - lastAngle
                        onAngleChange(rotation)
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            if (captchaData?.imageUrl != null) {
                AsyncImage(
                    url = captchaData.imageUrl,
                    modifier = Modifier
                        .fillMaxSize()
                        .rotate(currentAngle)
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Text(
            text = "当前角度: ${currentAngle.toInt()}°",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            TextButton(onClick = {
                rotation = -90f
                onAngleChange(rotation)
            }) {
                Text("-90°")
            }
            
            TextButton(onClick = {
                rotation = 0f
                onAngleChange(rotation)
            }) {
                Text("重置")
            }
            
            TextButton(onClick = {
                rotation = 90f
                onAngleChange(rotation)
            }) {
                Text("+90°")
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = { onVerify(currentAngle) },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("验证")
        }
    }
}

@Composable
fun PuzzleCaptchaContent(
    captchaData: CaptchaStateHolder.CaptchaData?,
    progress: Float,
    onProgressChange: (Float) -> Unit,
    onVerify: (Float) -> Unit
) {
    var sliderPosition by remember { mutableFloatStateOf(0f) }
    var containerWidth by remember { mutableIntStateOf(0) }
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "拖动滑块填充拼图",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(200.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
                .onSizeChanged { containerWidth = it.width }
        ) {
            if (captchaData?.backgroundImageUrl != null) {
                AsyncImage(
                    url = captchaData.backgroundImageUrl,
                    modifier = Modifier.fillMaxSize()
                )
            }
            
            if (captchaData?.targetImageUrl != null) {
                Box(
                    modifier = Modifier
                        .offset {
                            IntOffset(
                                ((1f - progress) * (containerWidth - 50)).roundToInt(),
                                0
                            )
                        }
                ) {
                    AsyncImage(
                        url = captchaData.targetImageUrl,
                        modifier = Modifier.size(50.dp)
                    )
                }
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
                .clip(RoundedCornerShape(25.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth(progress)
                    .height(50.dp)
                    .background(MaterialTheme.colorScheme.primary)
            )
            
            Box(
                modifier = Modifier
                    .offset { IntOffset(sliderPosition.roundToInt(), 0) }
                    .size(50.dp)
                    .shadow(4.dp, CircleShape)
                    .background(Color.White, CircleShape)
                    .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape)
                    .pointerInput(Unit) {
                        detectDragGestures { change, dragAmount ->
                            change.consume()
                            val newPosition = sliderPosition + dragAmount.x
                            sliderPosition = newPosition.coerceIn(
                                0f,
                                (containerWidth - with(LocalDensity.current) { 50.dp.toPx() }).coerceAtLeast(0f)
                            )
                            val progressValue = sliderPosition / (containerWidth - with(LocalDensity.current) { 50.dp.toPx() })
                            onProgressChange(progressValue.coerceIn(0f, 1f))
                        }
                    },
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    painter = painterResource(id = android.R.drawable.ic_media_play),
                    contentDescription = "Drag",
                    tint = MaterialTheme.colorScheme.primary
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = { onVerify(progress) },
            modifier = Modifier.fillMaxWidth(),
            enabled = progress > 0.9f
        ) {
            Text("验证")
        }
    }
}

@Composable
fun TextCaptchaContent(
    captchaData: CaptchaStateHolder.CaptchaData?,
    onVerify: (String) -> Unit
) {
    var text by remember { mutableStateOf("") }
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "请输入图中文字",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(100.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surfaceVariant)
        ) {
            if (captchaData?.imageUrl != null) {
                AsyncImage(
                    url = captchaData.imageUrl,
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        OutlinedTextField(
            value = text,
            onValueChange = { text = it },
            label = { Text("请输入验证码") },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done),
            keyboardActions = KeyboardActions(onDone = { onVerify(text) })
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = { onVerify(text) },
            modifier = Modifier.fillMaxWidth(),
            enabled = text.isNotBlank()
        ) {
            Text("验证")
        }
    }
}

@Composable
fun IconCaptchaContent(
    captchaData: CaptchaStateHolder.CaptchaData?,
    onVerify: (List<String>) -> Unit
) {
    val selectedIcons = remember { mutableStateListOf<String>() }
    val targetIcons = captchaData?.targetIcons ?: emptyList()
    val availableIcons = listOf("star", "heart", "circle", "square", "triangle")
    
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "请选择所有 ${targetIcons.joinToString(", ")} 图标",
            style = MaterialTheme.typography.bodyMedium
        )
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            availableIcons.take(4).forEach { icon ->
                IconButton(
                    selected = selectedIcons.contains(icon),
                    icon = icon,
                    onClick = {
                        if (selectedIcons.contains(icon)) {
                            selectedIcons.remove(icon)
                        } else {
                            selectedIcons.add(icon)
                        }
                    }
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceEvenly
        ) {
            availableIcons.drop(4).forEach { icon ->
                IconButton(
                    selected = selectedIcons.contains(icon),
                    icon = icon,
                    onClick = {
                        if (selectedIcons.contains(icon)) {
                            selectedIcons.remove(icon)
                        } else {
                            selectedIcons.add(icon)
                        }
                    }
                )
            }
        }
        
        Spacer(modifier = Modifier.height(16.dp))
        
        Button(
            onClick = { onVerify(selectedIcons.toList()) },
            modifier = Modifier.fillMaxWidth(),
            enabled = selectedIcons.isNotEmpty()
        ) {
            Text("验证")
        }
    }
}

@Composable
fun IconButton(
    selected: Boolean,
    icon: String,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(60.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(
                if (selected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.surfaceVariant
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = icon.take(1).uppercase(),
            color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 24.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun AsyncImage(
    url: String,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    var bitmap by remember { mutableStateOf<Bitmap?>(null) }
    val imageLoader = remember { ImageLoader(context) }
    
    LaunchedEffect(url) {
        val request = ImageRequest.Builder(context)
            .data(url)
            .allowHardware(false)
            .build()
        
        val result = imageLoader.execute(request)
        if (result is SuccessResult) {
            bitmap = (result.drawable as? BitmapDrawable)?.bitmap
        }
    }
    
    if (bitmap != null) {
        Image(
            bitmap = bitmap!!.asImageBitmap(),
            contentDescription = null,
            modifier = modifier,
            contentScale = ContentScale.Fit
        )
    } else {
        Box(
            modifier = modifier.background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(
                modifier = Modifier.size(24.dp),
                strokeWidth = 2.dp
            )
        }
    }
}

data class VerificationRequest(
    val type: CaptchaType,
    val token: String,
    val distance: Float? = null,
    val points: List<Pair<Float, Float>>? = null,
    val angle: Float? = null,
    val text: String? = null,
    val icons: List<String>? = null
)
