<template>
  <div class="login-form">
    <h2>用户登录</h2>
    
    <form @submit.prevent="handleLogin">
      <div class="form-group">
        <label for="username">用户名</label>
        <input 
          id="username"
          v-model="form.username"
          type="text"
          placeholder="请输入用户名"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="password">密码</label>
        <input 
          id="password"
          v-model="form.password"
          type="password"
          placeholder="请输入密码"
          required
        />
      </div>
      
      <div class="form-group">
        <label>安全验证</label>
        <captcha-button 
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
    
    <captcha-dialog 
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
import { useCaptcha } from '@captchax/vue';

const { verify } = useCaptcha();

const form = reactive({
  username: '',
  password: ''
});

const captchaToken = ref<string | null>(null);
const showDialog = ref(false);

const handleCaptchaSuccess = (token: string) => {
  captchaToken.value = token;
  console.log('Captcha verification successful:', token);
};

const handleCaptchaError = (error: Error) => {
  console.error('Captcha verification failed:', error);
  captchaToken.value = null;
};

const handleDialogSuccess = (token: string) => {
  captchaToken.value = token;
  showDialog.value = false;
};

const handleDialogError = (error: Error) => {
  console.error('Dialog verification failed:', error);
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
      console.log('Login successful:', data);
    } else {
      console.error('Login failed');
    }
  } catch (error) {
    console.error('Login error:', error);
  }
};
</script>

<style scoped>
.login-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.login-form h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #262626;
}

.form-group {
  margin-bottom: 16px;
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
