package com.captchax.sdk.compose

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import com.captchax.sdk.CaptchaError
import com.captchax.sdk.CaptchaType
import com.captchax.sdk.state.CaptchaStateHolder
import kotlinx.coroutines.launch

@Composable
fun CaptchaButton(
    scene: String = "default",
    type: CaptchaType = CaptchaType.SLIDER,
    text: String = "验证",
    onSuccess: (String) -> Unit,
    onError: (CaptchaError) -> Unit,
    modifier: Modifier = Modifier,
    requestCaptcha: suspend (String, CaptchaType) -> CaptchaStateHolder.CaptchaData?,
    verifyCaptcha: suspend (VerificationRequest) -> Result<String>
) {
    var showDialog by remember { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()
    
    Button(
        onClick = { showDialog = true },
        modifier = modifier.fillMaxWidth()
    ) {
        Text(text)
    }
    
    if (showDialog) {
        CaptchaXDialog(
            type = type,
            scene = scene,
            onSuccess = { token ->
                showDialog = false
                onSuccess(token)
            },
            onError = { error ->
                showDialog = false
                onError(error)
            },
            onDismiss = { showDialog = false },
            requestCaptcha = requestCaptcha,
            verifyCaptcha = verifyCaptcha
        )
    }
}

@Composable
fun CaptchaTypeSelector(
    onTypeSelected: (CaptchaType) -> Unit,
    modifier: Modifier = Modifier
) {
    Column(modifier = modifier.padding(16.dp)) {
        Text(
            text = "选择验证码类型",
            style = MaterialTheme.typography.titleMedium
        )
        
        Spacer(modifier = Modifier.height(8.dp))
        
        CaptchaType.entries.forEach { type ->
            OutlinedButton(
                onClick = { onTypeSelected(type) },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 4.dp)
            ) {
                Text(type.name)
            }
        }
    }
}

@Composable
fun CaptchaVerificationCard(
    scene: String = "default",
    type: CaptchaType = CaptchaType.SLIDER,
    onSuccess: (String) -> Unit,
    onError: (CaptchaError) -> Unit,
    requestCaptcha: suspend (String, CaptchaType) -> CaptchaStateHolder.CaptchaData?,
    verifyCaptcha: suspend (VerificationRequest) -> Result<String>
) {
    var showCaptcha by remember { mutableStateOf(false) }
    
    CaptchaButton(
        scene = scene,
        type = type,
        text = "开始验证",
        onSuccess = onSuccess,
        onError = onError,
        requestCaptcha = requestCaptcha,
        verifyCaptcha = verifyCaptcha
    )
}

@Composable
fun CaptchaResetButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    TextButton(
        onClick = onClick,
        modifier = modifier
    ) {
        Text("重置验证码")
    }
}

@Composable
fun CaptchaHelpText(
    modifier: Modifier = Modifier
) {
    Text(
        text = "验证码用于验证您是人类而不是机器人",
        style = MaterialTheme.typography.bodySmall,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier.padding(8.dp)
    )
}
