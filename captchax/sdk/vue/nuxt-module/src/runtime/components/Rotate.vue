<template>
  <div class="captcha-rotate">
    <div class="captcha-rotate__container">
      <div class="captcha-rotate__target" :style="targetStyle">
        <img 
          v-if="targetImage" 
          :src="targetImage" 
          alt="目标图片"
          class="captcha-rotate__image"
        />
        <div v-else class="captcha-rotate__placeholder">
          <div class="captcha-rotate__placeholder-text">旋转图片</div>
        </div>
      </div>
    </div>
    
    <div class="captcha-rotate__controls">
      <input 
        type="range" 
        v-model.number="rotation"
        min="0"
        max="360"
        step="1"
        class="captcha-rotate__slider"
        @input="handleRotate"
      />
      
      <div class="captcha-rotate__value" v-if="showAngle">
        {{ rotation }}°
      </div>
    </div>
    
    <div class="captcha-rotate__actions">
      <button class="captcha-rotate__btn captcha-rotate__btn--reset" @click="resetRotation">
        重置
      </button>
      <button class="captcha-rotate__btn captcha-rotate__btn--submit" @click="submitRotation">
        确认
      </button>
    </div>
    
    <div v-if="showTips && !isVerified" class="captcha-rotate__tips">
      {{ tipsText }}
    </div>
    
    <div v-if="isVerified" class="captcha-rotate__success">
      ✓ 验证成功
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCaptchaState } from '../composables/useCaptchaState';

interface Props {
  targetImage?: string;
  referenceImage?: string;
  targetAngle?: number;
  tolerance?: number;
  showAngle?: boolean;
  showTips?: boolean;
  tipsText?: string;
  showReference?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  targetImage: '',
  referenceImage: '',
  targetAngle: 0,
  tolerance: 15,
  showAngle: true,
  showTips: true,
  tipsText: '将图片旋转至正确方向',
  showReference: false
});

const emit = defineEmits<{
  success: [token: string];
  error: [error: Error];
  rotate: [angle: number];
}>();

const { setVerified, setToken, setError } = useCaptchaState();

const rotation = ref(0);
const isVerified = ref(false);
const initialRotation = Math.floor(Math.random() * 360);
rotation.value = initialRotation;

const targetStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`
}));

const handleRotate = () => {
  emit('rotate', rotation.value);
};

const resetRotation = () => {
  rotation.value = initialRotation;
};

const submitRotation = async () => {
  const target = props.targetAngle || 0;
  const diff = Math.abs(rotation.value - target);
  const normalizedDiff = Math.min(diff, 360 - diff);
  
  if (normalizedDiff <= props.tolerance) {
    isVerified.value = true;
    
    try {
      const token = `rotate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setVerified(true);
      setToken(token);
      emit('success', token);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setError(err);
      emit('error', err);
    }
  } else {
    const err = new Error('旋转角度不正确，请重试');
    setError(err);
    emit('error', err);
  }
};
</script>

<style scoped>
.captcha-rotate {
  width: 300px;
  user-select: none;
}

.captcha-rotate__container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.captcha-rotate__target {
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  transition: transform 0.1s ease;
}

.captcha-rotate__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.captcha-rotate__placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.captcha-rotate__placeholder-text {
  color: white;
  font-size: 14px;
}

.captcha-rotate__controls {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.captcha-rotate__slider {
  width: 100%;
  height: 40px;
  -webkit-appearance: none;
  appearance: none;
  background: #f0f0f0;
  border-radius: 20px;
  outline: none;
}

.captcha-rotate__slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
}

.captcha-rotate__slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
  border: none;
}

.captcha-rotate__value {
  text-align: center;
  font-size: 16px;
  font-weight: 500;
  color: #1890ff;
}

.captcha-rotate__actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.captcha-rotate__btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.captcha-rotate__btn--reset {
  background: #f0f0f0;
  color: #666;
}

.captcha-rotate__btn--reset:hover {
  background: #e8e8e8;
}

.captcha-rotate__btn--submit {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: white;
}

.captcha-rotate__btn--submit:hover {
  background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
}

.captcha-rotate__tips {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #8c8c8c;
}

.captcha-rotate__success {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}
</style>
