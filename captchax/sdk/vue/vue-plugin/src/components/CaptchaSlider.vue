<template>
  <div class="captcha-slider">
    <div class="captcha-slider__background" :style="backgroundStyle">
      <div 
        class="captcha-slider__target" 
        :style="targetStyle"
      ></div>
    </div>
    
    <div class="captcha-slider__track" ref="trackRef">
      <div 
        class="captcha-slider__thumb" 
        :style="thumbStyle"
        :class="{ 'captcha-slider__thumb--dragging': isDragging }"
        @mousedown="handleDragStart"
        @touchstart.passive="handleDragStart"
      >
        <svg class="captcha-slider__arrow" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
        </svg>
      </div>
    </div>
    
    <div v-if="showTips && !isVerified" class="captcha-slider__tips">
      {{ tipsText }}
    </div>
    
    <div v-if="isVerified" class="captcha-slider__success">
      ✓ 验证成功
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { CaptchaSliderProps } from '../types';
import { useCaptchaState } from '../composables/useCaptchaState';

const props = withDefaults(defineProps<CaptchaSliderProps>(), {
  targetImage: '',
  sliderImage: '',
  difficulty: 'medium',
  showTips: true,
  tipsText: '拖动滑块完成拼图'
});

const emit = defineEmits<{
  success: [token: string];
  error: [error: Error];
  change: [distance: number];
}>();

const { setLoading, setVerified, setToken, setError, incrementAttempts } = useCaptchaState();

const isDragging = ref(false);
const isVerified = ref(false);
const distance = ref(0);
const trackRef = ref<HTMLElement | null>(null);

const difficultyMap = {
  easy: { min: 30, max: 50 },
  medium: { min: 35, max: 65 },
  hard: { min: 40, max: 70 }
};

const targetPosition = Math.floor(Math.random() * (difficultyMap[props.difficulty].max - difficultyMap[props.difficulty].min)) + difficultyMap[props.difficulty].min;
const verticalPosition = Math.floor(Math.random() * 40) + 10;

const backgroundStyle = computed(() => ({
  backgroundImage: props.targetImage ? `url(${props.targetImage})` : 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}));

const targetStyle = computed(() => ({
  left: `${targetPosition}%`,
  top: `${verticalPosition}%`
}));

const thumbStyle = computed(() => ({
  transform: `translateX(${distance.value}px)`
}));

let startX = 0;

const handleDragStart = (e: MouseEvent | TouchEvent) => {
  if (isVerified.value) return;
  
  isDragging.value = true;
  startX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);
  document.addEventListener('touchmove', handleDragMove);
  document.addEventListener('touchend', handleDragEnd);
};

const handleDragMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const deltaX = clientX - startX;
  
  if (trackRef.value) {
    const maxDistance = trackRef.value.offsetWidth - 40;
    distance.value = Math.max(0, Math.min(deltaX, maxDistance));
    emit('change', distance.value);
  }
};

const handleDragEnd = async () => {
  if (!isDragging.value) return;
  
  isDragging.value = false;
  
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
  document.removeEventListener('touchmove', handleDragMove);
  document.removeEventListener('touchend', handleDragEnd);
  
  const threshold = targetPosition * (trackRef.value?.offsetWidth / 100);
  const tolerance = 8;
  
  if (Math.abs(distance.value - threshold) <= tolerance) {
    isVerified.value = true;
    
    try {
      const token = `slider_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setVerified(true);
      setToken(token);
      incrementAttempts();
      emit('success', token);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      emit('error', err);
    }
  } else {
    distance.value = 0;
    const err = new Error('滑块位置不正确');
    setError(err);
    emit('error', err);
  }
};

onUnmounted(() => {
  document.removeEventListener('mousemove', handleDragMove);
  document.removeEventListener('mouseup', handleDragEnd);
  document.removeEventListener('touchmove', handleDragMove);
  document.removeEventListener('touchend', handleDragEnd);
});
</script>

<style scoped>
.captcha-slider {
  width: 300px;
  user-select: none;
}

.captcha-slider__background {
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
}

.captcha-slider__target {
  position: absolute;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid rgba(255, 255, 255, 0.9);
}

.captcha-slider__track {
  position: relative;
  width: 100%;
  height: 40px;
  background: linear-gradient(to right, #f0f0f0, #e8e8e8);
  border-radius: 20px;
  margin-top: 16px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
}

.captcha-slider__thumb {
  position: absolute;
  left: 0;
  top: 0;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 50%;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(24, 144, 255, 0.4);
  transition: transform 0.1s ease, box-shadow 0.2s ease;
}

.captcha-slider__thumb:hover {
  transform: translateX(2px);
  box-shadow: 0 3px 8px rgba(24, 144, 255, 0.5);
}

.captcha-slider__thumb--dragging {
  cursor: grabbing;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.6);
}

.captcha-slider__arrow {
  width: 20px;
  height: 20px;
  color: white;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
}

.captcha-slider__tips {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #8c8c8c;
}

.captcha-slider__success {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}
</style>
