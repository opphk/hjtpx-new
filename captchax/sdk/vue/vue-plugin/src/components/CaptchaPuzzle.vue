<template>
  <div class="captcha-puzzle">
    <div class="captcha-puzzle__background" :style="backgroundStyle">
      <div class="captcha-puzzle__gap" :style="gapStyle" v-if="showGap"></div>
    </div>
    
    <div class="captcha-puzzle__slider-container">
      <div class="captcha-puzzle__slider" ref="sliderRef">
        <div 
          class="captcha-puzzle__thumb" 
          :style="thumbStyle"
          @mousedown="handleDragStart"
          @touchstart.passive="handleDragStart"
        >
          <svg class="captcha-puzzle__arrow" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </div>
      </div>
    </div>
    
    <div v-if="showTips && !isVerified" class="captcha-puzzle__tips">
      {{ tipsText }}
    </div>
    
    <div v-if="isVerified" class="captcha-puzzle__success">
      ✓ 验证成功
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CaptchaPuzzleProps } from '../types';
import { useCaptchaState } from '../composables/useCaptchaState';

const props = withDefaults(defineProps<CaptchaPuzzleProps>(), {
  targetImage: '',
  sliderImage: '',
  gapSize: 40,
  showGap: true,
  showTips: true,
  tipsText: '拖动滑块完成拼图'
});

const emit = defineEmits<{
  success: [token: string];
  error: [error: Error];
  change: [distance: number];
}>();

const { setVerified, setToken, setError } = useCaptchaState();

const isDragging = ref(false);
const isVerified = ref(false);
const distance = ref(0);
const sliderRef = ref<HTMLElement | null>(null);

const targetPosition = Math.floor(Math.random() * 30) + 35;
const verticalPosition = Math.floor(Math.random() * 40) + 10;

const backgroundStyle = computed(() => ({
  backgroundImage: props.targetImage ? `url(${props.targetImage})` : 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
}));

const gapStyle = computed(() => ({
  left: `${targetPosition}%`,
  top: `${verticalPosition}%`,
  width: `${props.gapSize}px`,
  height: `${props.gapSize}px`
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
  
  if (sliderRef.value) {
    const maxDistance = sliderRef.value.offsetWidth - 40;
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
  
  const threshold = targetPosition * (sliderRef.value?.offsetWidth / 100);
  const tolerance = 8;
  
  if (Math.abs(distance.value - threshold) <= tolerance) {
    isVerified.value = true;
    
    try {
      const token = `puzzle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setVerified(true);
      setToken(token);
      emit('success', token);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      emit('error', err);
    }
  } else {
    distance.value = 0;
    emit('error', new Error('拼图位置不正确'));
  }
};
</script>

<style scoped>
.captcha-puzzle {
  width: 300px;
  user-select: none;
}

.captcha-puzzle__background {
  position: relative;
  width: 100%;
  height: 150px;
  border-radius: 8px;
  overflow: hidden;
}

.captcha-puzzle__gap {
  position: absolute;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.captcha-puzzle__slider-container {
  margin-top: 16px;
}

.captcha-puzzle__slider {
  position: relative;
  width: 100%;
  height: 40px;
  background: #f0f0f0;
  border-radius: 20px;
  overflow: hidden;
}

.captcha-puzzle__thumb {
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
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
  transition: transform 0.1s ease;
}

.captcha-puzzle__thumb:hover {
  transform: scale(1.05);
}

.captcha-puzzle__thumb:active {
  cursor: grabbing;
}

.captcha-puzzle__arrow {
  width: 20px;
  height: 20px;
  color: white;
}

.captcha-puzzle__tips {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #8c8c8c;
}

.captcha-puzzle__success {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}
</style>
