# CaptchaX Vue 3 Plugin

Vue 3 验证码组件库，为 Vue 3 应用提供简单易用的验证码集成方案。

## 特性

- 🎯 **多种验证类型**: 支持滑块、点选、拼图、旋转、文字和图标六种验证码
- 🔧 **Vue 3 Composition API**: 全面采用 Vue 3 最新 Composition API
- 📦 **丰富的组件**: 提供开箱即用的 Vue 组件
- 🎨 **主题定制**: 支持自定义样式和主题
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🔒 **安全可靠**: Token 过期机制，防止重复使用
- 🌍 **SSR 支持**: 完善的 SSR 客户端检测机制
- 💪 **TypeScript 支持**: 完整的 TypeScript 类型定义
- 🔄 **状态管理**: 内置响应式状态管理

## 安装

```bash
npm install @captchax/vue
```

或者使用 yarn:

```bash
yarn add @captchax/vue
```

或者使用 pnpm:

```bash
pnpm add @captchax/vue
```

## 快速开始

### 1. 引入插件

在你的 Vue 3 应用中引入并注册插件：

```typescript
import { createApp } from 'vue';
import CaptchaX from '@captchax/vue';
import App from './App.vue';

const app = createApp(App);

app.use(CaptchaX, {
  apiKey: 'YOUR_API_KEY',
  apiSecret: 'YOUR_API_SECRET',
  serverUrl: 'https://captchax.example.com',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
});

app.mount('#app');
```

### 2. 使用组件

#### 基础用法

```vue
<template>
  <div>
    <h1>用户登录</h1>
    <form @submit.prevent="handleLogin">
      <input v-model="username" placeholder="用户名" />
      <input v-model="password" type="password" placeholder="密码" />
      
      <CaptchaButton 
        scene="login"
        text="点击验证"
        size="large"
        @success="handleCaptchaSuccess"
        @error="handleCaptchaError"
      />
      
      <button type="submit" :disabled="!captchaToken">
        登录
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCaptcha } from '@captchax/vue';

const { verify } = useCaptcha();

const username = ref('');
const password = ref('');
const captchaToken = ref<string | null>(null);

const handleCaptchaSuccess = (token: string) => {
  captchaToken.value = token;
  console.log('验证成功:', token);
};

const handleCaptchaError = (error: Error) => {
  console.error('验证失败:', error);
};

const handleLogin = async () => {
  if (!captchaToken.value) {
    return;
  }
  
  // 发送登录请求
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: username.value,
      password: password.value,
      captchaToken: captchaToken.value
    })
  });
  
  const data = await response.json();
  console.log('登录结果:', data);
};
</script>
```

### 3. 使用验证弹窗

```vue
<template>
  <div>
    <button @click="showDialog = true">打开验证</button>
    
    <CaptchaDialog
      v-model:visible="showDialog"
      type="slider"
      title="安全验证"
      @success="handleSuccess"
      @error="handleError"
      @close="handleClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showDialog = ref(false);

const handleSuccess = (token: string) => {
  console.log('验证成功:', token);
  showDialog.value = false;
};

const handleError = (error: Error) => {
  console.error('验证失败:', error);
};

const handleClose = () => {
  console.log('弹窗已关闭');
  showDialog.value = false;
};
</script>
```

## 组件列表

### CaptchaButton - 验证按钮

验证按钮组件，点击后触发验证码流程。

```vue
<CaptchaButton
  scene="login"
  text="点击验证"
  size="large"
  theme="light"
  :disabled="false"
  :block="false"
  loading-text="验证中..."
  @success="onSuccess"
  @error="onError"
  @click="onClick"
/>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| scene | String | 'default' | 验证场景标识 |
| text | String | '安全验证' | 按钮文本 |
| size | 'small' \| 'medium' \| 'large' | 'medium' | 按钮尺寸 |
| theme | 'light' \| 'dark' | 'light' | 主题风格 |
| disabled | Boolean | false | 是否禁用 |
| block | Boolean | false | 是否全宽显示 |
| icon | String | '' | 按钮图标 |
| loading-text | String | '验证中...' | 加载中显示的文本 |

**事件说明**:

| 事件名 | 参数 | 说明 |
|--------|------|------|
| success | token: string | 验证成功回调 |
| error | error: Error | 验证失败回调 |
| click | event: MouseEvent | 按钮点击事件 |

### CaptchaDialog - 验证弹窗

模态框形式的验证码组件，支持多种验证类型。

```vue
<CaptchaDialog
  v-model:visible="dialogVisible"
  type="slider"
  title="安全验证"
  :width="360"
  :show-close="true"
  :mask-closable="true"
  @success="onSuccess"
  @error="onError"
  @close="onClose"
  @ready="onReady"
>
  <!-- 自定义内容插槽 -->
</CaptchaDialog>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| visible (v-model) | Boolean | false | 弹窗可见性 |
| type | 'slider' \| 'click' \| 'puzzle' \| 'rotate' \| 'text' \| 'icon' | 'slider' | 验证码类型 |
| title | String | '安全验证' | 弹窗标题 |
| targetImage | String | '' | 目标图片 URL |
| sliderImage | String | '' | 滑块图片 URL |
| width | String \| Number | 360 | 弹窗宽度 |
| showClose | Boolean | true | 是否显示关闭按钮 |
| maskClosable | Boolean | true | 点击遮罩是否关闭 |

**事件说明**:

| 事件名 | 参数 | 说明 |
|--------|------|------|
| update:visible | value: boolean | 可见性更新事件 |
| success | token: string | 验证成功回调 |
| error | error: Error | 验证失败回调 |
| close | - | 弹窗关闭回调 |
| ready | - | 弹窗打开完成回调 |

### CaptchaSlider - 滑块验证码

拖动滑块完成拼图验证。

```vue
<CaptchaSlider
  target-image="/images/target.jpg"
  difficulty="medium"
  :show-tips="true"
  tips-text="拖动滑块完成拼图"
  @success="onSuccess"
  @error="onError"
  @change="onChange"
/>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| targetImage | String | '' | 目标图片 URL |
| sliderImage | String | '' | 滑块图片 URL |
| difficulty | 'easy' \| 'medium' \| 'hard' | 'medium' | 难度等级 |
| showTips | Boolean | true | 是否显示提示 |
| tipsText | String | '拖动滑块完成拼图' | 提示文本 |

**事件说明**:

| 事件名 | 参数 | 说明 |
|--------|------|------|
| success | token: string | 验证成功回调 |
| error | error: Error | 验证失败回调 |
| change | distance: number | 滑块位置变化回调 |

### CaptchaClick - 点选验证码

点击指定位置完成验证。

```vue
<CaptchaClick
  target-image="/images/click.jpg"
  :required-count="4"
  :max-clicks="5"
  @success="onSuccess"
  @error="onError"
  @click="onClick"
/>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| targetImage | String | '' | 目标图片 URL |
| clickImages | Array | [] | 点击目标位置数据 |
| maxClicks | Number | 5 | 最大点击次数 |
| requiredCount | Number | 4 | 需要的点击次数 |
| showClickCount | Boolean | true | 是否显示点击计数 |
| showTips | Boolean | true | 是否显示提示 |

**事件说明**:

| 事件名 | 参数 | 说明 |
|--------|------|------|
| success | token: string, clicks: ClickPoint[] | 验证成功回调 |
| error | error: Error | 验证失败回调 |
| click | point: ClickPoint | 点击事件回调 |

### CaptchaPuzzle - 拼图验证码

拖动拼图块到正确位置完成验证。

```vue
<CaptchaPuzzle
  target-image="/images/puzzle.jpg"
  :gap-size="40"
  :show-gap="true"
  @success="onSuccess"
  @error="onError"
/>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| targetImage | String | '' | 目标图片 URL |
| sliderImage | String | '' | 拼图块图片 URL |
| gapSize | Number | 40 | 拼图块大小 |
| showGap | Boolean | true | 是否显示缺口 |
| showTips | Boolean | true | 是否显示提示 |
| tipsText | String | '拖动滑块完成拼图' | 提示文本 |

### CaptchaRotate - 旋转验证码

将图片旋转到正确角度完成验证。

```vue
<CaptchaRotate
  target-image="/images/rotate.jpg"
  :target-angle="0"
  :tolerance="15"
  :show-angle="true"
  @success="onSuccess"
  @error="onError"
  @rotate="onRotate"
/>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| targetImage | String | '' | 目标图片 URL |
| referenceImage | String | '' | 参考图片 URL |
| targetAngle | Number | 0 | 目标角度 |
| tolerance | Number | 15 | 角度容差（度） |
| showAngle | Boolean | true | 是否显示当前角度 |
| showTips | Boolean | true | 是否显示提示 |
| tipsText | String | '将图片旋转至正确方向' | 提示文本 |
| showReference | Boolean | false | 是否显示参考图 |

### CaptchaText - 文字验证码

输入图片或文字显示的验证码。

```vue
<CaptchaText
  :case-sensitive="false"
  :max-length="6"
  placeholder="请输入验证码"
  @success="onSuccess"
  @error="onError"
/>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| texts | Array | [] | 预设的验证码文本 |
| requiredCount | Number | 1 | 需要输入的数量 |
| caseSensitive | Boolean | false | 是否区分大小写 |
| placeholder | String | '请输入验证码' | 输入框占位文本 |
| maxLength | Number | 6 | 最大输入长度 |
| showTips | Boolean | true | 是否显示提示 |
| tipsText | String | '请输入图中显示的验证码' | 提示文本 |
| textImage | String | '' | 验证码图片 URL |

### CaptchaIcon - 图标验证码

选择指定的图标完成验证。

```vue
<CaptchaIcon
  :required-count="3"
  :icons="customIcons"
  :icon-size="60"
  @success="onSuccess"
  @error="onError"
  @select="onSelect"
/>
```

**属性说明**:

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| targetImage | String | '' | 目标图片 URL |
| icons | Array | [] | 图标列表 |
| requiredCount | Number | 3 | 需要选择的图标数量 |
| iconSize | Number | 60 | 图标大小（像素） |
| showCount | Boolean | true | 是否显示已选数量 |
| showTips | Boolean | true | 是否显示提示 |
| tipsText | String | '请选择所有指定的图标' | 提示文本 |

**图标数据结构**:

```typescript
interface IconItem {
  id: string;
  icon: string;
  name?: string;
  selected?: boolean;
}

// 示例
const icons = [
  { id: '1', icon: '🌙', name: '月亮' },
  { id: '2', icon: '☀️', name: '太阳' },
  { id: '3', icon: '⭐', name: '星星' }
];
```

## Composable

### useCaptcha

核心验证码 composable，用于验证逻辑。

```typescript
import { useCaptcha } from '@captchax/vue';

const { 
  verify,      // 验证函数
  config,      // 配置信息（只读）
  isClient,    // 是否在客户端环境
  getToken,    // 获取当前 token
  clearToken   // 清除 token
} = useCaptcha();

// 执行验证
const token = await verify('login');
console.log('验证成功:', token);

// 获取已保存的 token
const savedToken = getToken();

// 清除 token
clearToken();
```

**verify 函数签名**:

```typescript
verify(scene?: string, options?: CaptchaVerifyOptions): Promise<string>

interface CaptchaVerifyOptions {
  scene?: string;
  type?: CaptchaType;
  timeout?: number;
}
```

### useCaptchaState

验证码状态管理 composable。

```typescript
import { useCaptchaState } from '@captchax/vue';

const {
  show,           // 显示验证码
  hide,           // 隐藏验证码
  setLoading,     // 设置加载状态
  setVerified,    // 设置验证状态
  setToken,       // 设置 token
  setError,       // 设置错误信息
  setAttempts,    // 设置尝试次数
  incrementAttempts, // 增加尝试次数
  reset,          // 重置状态
  isVisible,      // 是否可见（响应式）
  isLoading,      // 是否加载中（响应式）
  isVerified,     // 是否已验证（响应式）
  token,          // 当前 token（响应式）
  error,          // 错误信息（响应式）
  attempts        // 尝试次数（响应式）
} = useCaptchaState();

// 显示验证码
show();

// 隐藏验证码
hide();

// 重置所有状态
reset();
```

## 配置选项

```typescript
interface CaptchaConfig {
  apiKey: string;           // API 密钥
  apiSecret: string;       // API 密钥（服务端）
  serverUrl: string;        // 服务器地址
  timeout?: number;         // 超时时间（毫秒）
  retryAttempts?: number;  // 重试次数
  retryDelay?: number;      // 重试延迟（毫秒）
}
```

## 类型定义

完整的 TypeScript 类型定义已包含在包中，无需额外安装类型包。

### 主要类型

```typescript
// 验证码类型
type CaptchaType = 'slider' | 'click' | 'puzzle' | 'rotate' | 'text' | 'icon';

// 按钮尺寸
type CaptchaSize = 'small' | 'medium' | 'large';

// 主题风格
type CaptchaTheme = 'light' | 'dark';

// 点击位置点
interface ClickPoint {
  x: number;
  y: number;
  timestamp: number;
}

// 图标项
interface IconItem {
  id: string;
  icon: string;
  name?: string;
  selected?: boolean;
}

// 验证结果
interface CaptchaResult {
  token: string;
  expiresAt: number;
  scene: string;
  timestamp: number;
}
```

## 使用示例

### 登录表单

完整示例展示如何在登录表单中使用验证码：

```vue
<template>
  <div class="login-container">
    <div class="login-card">
      <h2>用户登录</h2>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名</label>
          <input 
            v-model="form.username"
            type="text"
            placeholder="请输入用户名"
            required
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input 
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            required
          />
        </div>
        
        <div class="form-group">
          <label>安全验证</label>
          <CaptchaButton
            scene="login"
            text="点击验证"
            size="large"
            block
            @success="handleCaptchaSuccess"
            @error="handleCaptchaError"
          />
          <p v-if="captchaToken" class="captcha-status">
            ✓ 验证成功
          </p>
        </div>
        
        <button 
          type="submit" 
          class="submit-btn"
          :disabled="!captchaToken"
        >
          登录
        </button>
      </form>
    </div>
    
    <CaptchaDialog 
      v-model:visible="showDialog"
      type="slider"
      title="安全验证"
      @success="handleDialogSuccess"
      @error="handleDialogError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const form = reactive({
  username: '',
  password: ''
});

const captchaToken = ref<string | null>(null);
const showDialog = ref(false);

const handleCaptchaSuccess = (token: string) => {
  captchaToken.value = token;
  console.log('验证成功:', token);
};

const handleCaptchaError = (error: Error) => {
  console.error('验证失败:', error);
  captchaToken.value = null;
};

const handleDialogSuccess = (token: string) => {
  captchaToken.value = token;
  showDialog.value = false;
};

const handleDialogError = (error: Error) => {
  console.error('弹窗验证失败:', error);
};

const handleLogin = async () => {
  if (!captchaToken.value) {
    showDialog.value = true;
    return;
  }
  
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...form,
        captchaToken: captchaToken.value
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('登录成功:', data);
    } else {
      console.error('登录失败');
    }
  } catch (error) {
    console.error('登录错误:', error);
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 40px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 32px;
  color: #262626;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #595959;
  font-size: 14px;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.captcha-status {
  margin-top: 8px;
  color: #52c41a;
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
```

### 注册表单

```vue
<template>
  <div class="register-form">
    <h2>用户注册</h2>
    
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label>邮箱</label>
        <input 
          v-model="form.email"
          type="email"
          placeholder="请输入邮箱"
          required
        />
      </div>
      
      <div class="form-group">
        <label>用户名</label>
        <input 
          v-model="form.username"
          type="text"
          placeholder="请输入用户名"
          required
        />
      </div>
      
      <div class="form-group">
        <label>密码</label>
        <input 
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          required
        />
      </div>
      
      <div class="form-group">
        <label>确认密码</label>
        <input 
          v-model="form.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          required
        />
      </div>
      
      <div class="form-group">
        <label>安全验证</label>
        <CaptchaDialog
          v-model:visible="showCaptcha"
          type="click"
          title="请完成安全验证"
          @success="handleCaptchaSuccess"
          @error="handleCaptchaError"
        />
        <CaptchaButton
          text="点击验证"
          scene="register"
          @click="showCaptcha = true"
        />
        <p v-if="captchaToken" class="captcha-verified">
          ✓ 已完成验证
        </p>
      </div>
      
      <button 
        type="submit" 
        class="submit-btn"
        :disabled="!captchaToken || isSubmitting"
      >
        {{ isSubmitting ? '注册中...' : '注册' }}
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

const form = reactive({
  email: '',
  username: '',
  password: '',
  confirmPassword: ''
});

const captchaToken = ref<string | null>(null);
const showCaptcha = ref(false);
const isSubmitting = ref(false);

const handleCaptchaSuccess = (token: string) => {
  captchaToken.value = token;
  showCaptcha.value = false;
  console.log('注册验证码已验证:', token);
};

const handleCaptchaError = (error: Error) => {
  console.error('验证码验证失败:', error);
  captchaToken.value = null;
};

const handleRegister = async () => {
  if (form.password !== form.confirmPassword) {
    alert('两次输入的密码不一致');
    return;
  }
  
  if (!captchaToken.value) {
    showCaptcha.value = true;
    return;
  }
  
  isSubmitting.value = true;
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...form,
        captchaToken: captchaToken.value
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('注册成功:', data);
      alert('注册成功！');
    } else {
      console.error('注册失败');
      alert('注册失败，请重试');
    }
  } catch (error) {
    console.error('注册错误:', error);
    alert('注册失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
};
</script>
```

## API 集成

### 服务端验证

在前端获取到 token 后，需要在服务端验证 token 的有效性：

```typescript
// 服务端验证示例
async function verifyCaptchaToken(token: string, apiSecret: string) {
  const response = await fetch('https://captchax.example.com/api/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiSecret}`
    },
    body: JSON.stringify({ token })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Token 验证成功');
    return true;
  } else {
    console.error('Token 验证失败:', result.message);
    return false;
  }
}
```

## 最佳实践

1. **场景隔离**: 为不同场景使用不同的 scene 标识，便于风控分析
2. **错误处理**: 始终监听 error 事件，提供友好的错误提示
3. **超时设置**: 根据网络环境适当调整 timeout 配置
4. **重试机制**: 利用内置的重试机制提高验证成功率
5. **Token 管理**: 合理使用 getToken 和 clearToken 管理验证状态

## 浏览器兼容性

- Chrome: 80+
- Firefox: 75+
- Safari: 13+
- Edge: 80+
- IE: 不支持（使用 EventSource API）

## 相关链接

- [Nuxt 3 模块版本](./nuxt-module/README.md)
- [官方文档](https://captchax.example.com/docs)
- [API 文档](https://captchax.example.com/api)
- [示例项目](https://github.com/captchax/examples)

## 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 更新日志

### v1.0.0 (2024-01-01)

- ✨ 初始版本发布
- 🎯 支持 6 种验证码类型
- 🔧 完整的 TypeScript 类型定义
- 📦 丰富的 Vue 3 组件库
- 💪 完善的 Composition API 支持
