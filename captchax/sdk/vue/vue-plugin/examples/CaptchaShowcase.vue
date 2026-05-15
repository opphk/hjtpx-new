<template>
  <div class="captcha-showcase">
    <h1>CaptchaX 验证码组件展示</h1>
    
    <div class="showcase-section">
      <h2>1. 滑块验证码 (Slider)</h2>
      <captcha-slider
        :target-image="sliderTarget"
        @success="(token) => handleSuccess('slider', token)"
        @error="(err) => handleError('slider', err)"
      />
    </div>
    
    <div class="showcase-section">
      <h2>2. 点选验证码 (Click)</h2>
      <captcha-click
        :target-image="clickTarget"
        :required-count="4"
        @success="(token) => handleSuccess('click', token)"
        @error="(err) => handleError('click', err)"
      />
    </div>
    
    <div class="showcase-section">
      <h2>3. 拼图验证码 (Puzzle)</h2>
      <captcha-puzzle
        :target-image="puzzleTarget"
        :gap-size="40"
        @success="(token) => handleSuccess('puzzle', token)"
        @error="(err) => handleError('puzzle', err)"
      />
    </div>
    
    <div class="showcase-section">
      <h2>4. 旋转验证码 (Rotate)</h2>
      <captcha-rotate
        :target-image="rotateTarget"
        :show-angle="true"
        @success="(token) => handleSuccess('rotate', token)"
        @error="(err) => handleError('rotate', err)"
      />
    </div>
    
    <div class="showcase-section">
      <h2>5. 文字验证码 (Text)</h2>
      <captcha-text
        :case-sensitive="false"
        :max-length="6"
        @success="(token) => handleSuccess('text', token)"
        @error="(err) => handleError('text', err)"
      />
    </div>
    
    <div class="showcase-section">
      <h2>6. 图标验证码 (Icon)</h2>
      <captcha-icon
        :required-count="3"
        :icons="customIcons"
        @success="(token) => handleSuccess('icon', token)"
        @error="(err) => handleError('icon', err)"
      />
    </div>
    
    <div class="showcase-section">
      <h2>7. 验证按钮</h2>
      <captcha-button
        scene="login"
        text="点击验证"
        size="large"
        theme="light"
        @success="(token) => handleSuccess('button', token)"
        @error="(err) => handleError('button', err)"
      />
    </div>
    
    <div class="showcase-section">
      <h2>8. 验证弹窗</h2>
      <captcha-button
        text="打开验证弹窗"
        size="medium"
        @click="showDialog = true"
      />
      <captcha-dialog
        v-model:visible="showDialog"
        type="slider"
        title="安全验证"
        @success="handleDialogSuccess"
        @close="showDialog = false"
      />
    </div>
    
    <div class="results">
      <h3>验证结果</h3>
      <div v-if="lastResult" class="result-success">
        <p>类型: {{ lastResult.type }}</p>
        <p>Token: {{ lastResult.token }}</p>
        <p>时间: {{ lastResult.timestamp }}</p>
      </div>
      <div v-if="lastError" class="result-error">
        <p>错误: {{ lastError.message }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const showDialog = ref(false);

const customIcons = [
  { id: '1', icon: '🌙', name: '月亮' },
  { id: '2', icon: '☀️', name: '太阳' },
  { id: '3', icon: '⭐', name: '星星' },
  { id: '4', icon: '🌈', name: '彩虹' },
  { id: '5', icon: '❄️', name: '雪花' },
  { id: '6', icon: '🌸', name: '樱花' }
];

const lastResult = ref<any>(null);
const lastError = ref<Error | null>(null);

const handleSuccess = (type: string, token: string) => {
  lastResult.value = {
    type,
    token,
    timestamp: new Date().toLocaleString()
  };
  lastError.value = null;
  console.log(`${type} verification successful:`, token);
};

const handleError = (type: string, error: Error) => {
  lastError.value = error;
  console.error(`${type} verification failed:`, error);
};

const handleDialogSuccess = (token: string) => {
  handleSuccess('dialog', token);
  showDialog.value = false;
};
</script>

<style scoped>
.captcha-showcase {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.captcha-showcase h1 {
  text-align: center;
  margin-bottom: 32px;
  color: #262626;
}

.showcase-section {
  margin-bottom: 32px;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

.showcase-section h2 {
  margin-bottom: 16px;
  color: #595959;
  font-size: 18px;
}

.results {
  margin-top: 32px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.results h3 {
  margin-bottom: 12px;
  color: #262626;
}

.result-success {
  padding: 12px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 6px;
  color: #52c41a;
}

.result-error {
  padding: 12px;
  background: #fff2f0;
  border: 1px solid #ffccc7;
  border-radius: 6px;
  color: #ff4d4f;
}
</style>
