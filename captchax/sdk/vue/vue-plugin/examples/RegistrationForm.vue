<template>
  <div class="registration-form">
    <h2>用户注册</h2>
    
    <form @submit.prevent="handleRegister">
      <div class="form-group">
        <label for="email">邮箱</label>
        <input 
          id="email"
          v-model="form.email"
          type="email"
          placeholder="请输入邮箱"
          required
        />
      </div>
      
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
        <label for="confirmPassword">确认密码</label>
        <input 
          id="confirmPassword"
          v-model="form.confirmPassword"
          type="password"
          placeholder="请再次输入密码"
          required
        />
      </div>
      
      <div class="form-group">
        <label>安全验证</label>
        <captcha-dialog
          v-model:visible="showCaptcha"
          type="click"
          title="请完成安全验证"
          @success="handleCaptchaSuccess"
          @error="handleCaptchaError"
        />
        <captcha-button
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
import { useCaptcha } from '@captchax/vue';

const { verify } = useCaptcha();

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
  console.log('Registration captcha verified:', token);
};

const handleCaptchaError = (error: Error) => {
  console.error('Captcha verification failed:', error);
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
      console.log('Registration successful:', data);
      alert('注册成功！');
    } else {
      console.error('Registration failed');
      alert('注册失败，请重试');
    }
  } catch (error) {
    console.error('Registration error:', error);
    alert('注册失败，请重试');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.registration-form {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.registration-form h2 {
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

.captcha-verified {
  margin-top: 8px;
  color: #52c41a;
  font-size: 14px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #52c41a 0%, #73d13d 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #73d13d 0%, #95de64 100%);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
