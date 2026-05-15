<template>
  <div class="captcha-text">
    <div class="captcha-text__generate">
      <div class="captcha-text__code">{{ displayText }}</div>
      <button class="captcha-text__refresh" @click="refreshText" title="刷新验证码">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
      </button>
    </div>
    
    <div class="captcha-text__input-container">
      <input 
        v-model="userInput"
        type="text"
        :placeholder="placeholder"
        :maxlength="maxLength"
        class="captcha-text__input"
        @keyup.enter="submitInput"
        :disabled="isVerified"
      />
    </div>
    
    <button 
      class="captcha-text__submit"
      @click="submitInput"
      :disabled="!userInput || isVerified"
    >
      {{ isVerified ? '已验证' : '验证' }}
    </button>
    
    <div v-if="showTips && !isVerified" class="captcha-text__tips">
      {{ tipsText }}
    </div>
    
    <div v-if="isVerified" class="captcha-text__success">
      ✓ 验证成功
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCaptchaState } from '../composables/useCaptchaState';

interface Props {
  texts?: string[];
  requiredCount?: number;
  caseSensitive?: boolean;
  placeholder?: string;
  maxLength?: number;
  showTips?: boolean;
  tipsText?: string;
  textImage?: string;
}

const props = withDefaults(defineProps<Props>(), {
  texts: () => [],
  requiredCount: 1,
  caseSensitive: false,
  placeholder: '请输入验证码',
  maxLength: 6,
  showTips: true,
  tipsText: '请输入图中显示的验证码',
  textImage: ''
});

const emit = defineEmits<{
  success: [token: string, texts: string[]];
  error: [error: Error];
}>();

const { setVerified, setToken, setError } = useCaptchaState();

const userInput = ref('');
const isVerified = ref(false);
const displayText = ref('');

const generateText = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  displayText.value = result;
};

const refreshText = () => {
  generateText();
  userInput.value = '';
};

const submitInput = async () => {
  if (!userInput.value || isVerified.value) return;
  
  const input = props.caseSensitive ? userInput.value : userInput.value.toLowerCase();
  const expected = props.caseSensitive ? displayText.value : displayText.value.toLowerCase();
  
  if (input === expected) {
    isVerified.value = true;
    
    try {
      const token = `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setVerified(true);
      setToken(token);
      emit('success', token, [userInput.value]);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      emit('error', err);
    }
  } else {
    emit('error', new Error('验证码不正确，请重试'));
    userInput.value = '';
    refreshText();
  }
};

generateText();
</script>

<style scoped>
.captcha-text {
  width: 300px;
  user-select: none;
}

.captcha-text__generate {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.captcha-text__code {
  flex: 1;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  font-weight: bold;
  color: white;
  letter-spacing: 8px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
  user-select: none;
}

.captcha-text__refresh {
  width: 40px;
  height: 40px;
  background: #f0f0f0;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.captcha-text__refresh:hover {
  background: #e8e8e8;
}

.captcha-text__refresh svg {
  width: 20px;
  height: 20px;
  color: #666;
}

.captcha-text__input-container {
  margin-bottom: 12px;
}

.captcha-text__input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.captcha-text__input:focus {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
}

.captcha-text__input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.captcha-text__submit {
  width: 100%;
  padding: 10px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.captcha-text__submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
}

.captcha-text__submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.captcha-text__tips {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #8c8c8c;
}

.captcha-text__success {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}
</style>
