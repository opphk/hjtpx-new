<template>
  <div class="captcha-click" ref="containerRef">
    <div class="captcha-click__image-container" :style="containerStyle">
      <img 
        v-if="targetImage" 
        :src="targetImage" 
        alt="验证码图片"
        class="captcha-click__image"
        @load="handleImageLoad"
        @error="handleImageError"
      />
      <div v-else class="captcha-click__placeholder">
        <div class="captcha-click__placeholder-text">点击图中所有{{ requiredCount }}个{{ targetText }}</div>
      </div>
      
      <div 
        v-for="(point, index) in clickPoints" 
        :key="index"
        class="captcha-click__point"
        :style="{ left: `${point.x}px`, top: `${point.y}px` }"
      >
        {{ index + 1 }}
      </div>
      
      <div 
        v-for="(point, index) in userClicks" 
        :key="`user-${index}`"
        class="captcha-click__user-point"
        :style="{ left: `${point.x}px`, top: `${point.y}px` }"
      ></div>
    </div>
    
    <div class="captcha-click__info">
      <span class="captcha-click__count">
        已点击: {{ userClicks.length }} / {{ requiredCount }}
      </span>
      <button 
        v-if="userClicks.length > 0" 
        class="captcha-click__reset"
        @click="resetClicks"
      >
        重置
      </button>
    </div>
    
    <div v-if="showTips && !isVerified" class="captcha-click__tips">
      {{ tipsText }}
    </div>
    
    <div v-if="isVerified" class="captcha-click__success">
      ✓ 验证成功
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { CaptchaClickProps, ClickPoint } from '../types';
import { useCaptchaState } from '../composables/useCaptchaState';

const props = withDefaults(defineProps<CaptchaClickProps>(), {
  targetImage: '',
  clickImages: () => [],
  maxClicks: 5,
  requiredCount: 4,
  showTips: true,
  tipsText: '请依次点击图中指定的图标'
});

const emit = defineEmits<{
  success: [token: string, clicks: ClickPoint[]];
  error: [error: Error];
  click: [point: ClickPoint];
}>();

const { setVerified, setToken, setError, incrementAttempts } = useCaptchaState();

const containerRef = ref<HTMLElement | null>(null);
const userClicks = ref<ClickPoint[]>([]);
const isVerified = ref(false);
const imageLoaded = ref(false);
const targetText = ref('月亮');

const requiredCount = computed(() => props.requiredCount);

const containerStyle = computed(() => ({
  backgroundImage: props.targetImage ? 'none' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
}));

const handleImageLoad = () => {
  imageLoaded.value = true;
};

const handleImageError = () => {
  imageLoaded.value = false;
  emit('error', new Error('Failed to load captcha image'));
};

const handleClick = (event: MouseEvent) => {
  if (isVerified.value || userClicks.value.length >= props.maxClicks) return;
  
  const container = containerRef.value;
  if (!container) return;
  
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const point: ClickPoint = {
    x,
    y,
    timestamp: Date.now()
  };
  
  userClicks.value.push(point);
  emit('click', point);
  
  if (userClicks.value.length >= requiredCount.value) {
    verifyClicks();
  }
};

const verifyClicks = async () => {
  try {
    const token = `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    isVerified.value = true;
    setVerified(true);
    setToken(token);
    incrementAttempts();
    emit('success', token, userClicks.value);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setError(err);
    emit('error', err);
  }
};

const resetClicks = () => {
  userClicks.value = [];
  isVerified.value = false;
};

onMounted(() => {
  if (containerRef.value) {
    containerRef.value.addEventListener('click', handleClick as any);
  }
});
</script>

<style scoped>
.captcha-click {
  width: 300px;
  user-select: none;
}

.captcha-click__image-container {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background-size: cover;
  background-position: center;
}

.captcha-click__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-click__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.captcha-click__placeholder-text {
  color: white;
  font-size: 14px;
  text-align: center;
  padding: 20px;
}

.captcha-click__point {
  position: absolute;
  width: 24px;
  height: 24px;
  background: #52c41a;
  border: 2px solid white;
  border-radius: 50%;
  color: white;
  font-size: 12px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.captcha-click__user-point {
  position: absolute;
  width: 24px;
  height: 24px;
  background: rgba(24, 144, 255, 0.8);
  border: 2px solid white;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  animation: captcha-click-pulse 0.3s ease;
}

@keyframes captcha-click-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0);
  }
  50% {
    transform: translate(-50%, -50%) scale(1.2);
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
  }
}

.captcha-click__info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 0 4px;
}

.captcha-click__count {
  font-size: 14px;
  color: #666;
}

.captcha-click__reset {
  background: none;
  border: none;
  color: #1890ff;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 8px;
}

.captcha-click__reset:hover {
  text-decoration: underline;
}

.captcha-click__tips {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #8c8c8c;
}

.captcha-click__success {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}
</style>
