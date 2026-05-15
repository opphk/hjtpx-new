<template>
  <Teleport to="body">
    <Transition name="captcha-dialog">
      <div 
        v-if="visible" 
        class="captcha-dialog-overlay" 
        :class="{ 'captcha-dialog-overlay--mask': maskClosable }"
        @click.self="handleOverlayClick"
      >
        <div class="captcha-dialog-container" :style="containerStyles">
          <div class="captcha-dialog-header">
            <h3 class="captcha-dialog-title">{{ title }}</h3>
            <button 
              v-if="showClose" 
              class="captcha-dialog-close" 
              @click="handleClose" 
              aria-label="关闭"
            >
              <span>&times;</span>
            </button>
          </div>
          
          <div class="captcha-dialog-content">
            <slot>
              <component 
                :is="currentComponent" 
                :target-image="targetImage"
                :slider-image="sliderImage"
                @success="handleSuccess"
                @error="handleError"
              />
            </slot>
          </div>
          
          <div v-if="loading" class="captcha-dialog-loading">
            <div class="captcha-dialog-loader"></div>
            <span class="captcha-dialog-loading-text">验证中...</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Slider from './Slider.vue';
import Click from './Click.vue';
import Puzzle from './Puzzle.vue';
import Rotate from './Rotate.vue';
import Text from './Text.vue';
import Icon from './Icon.vue';
import { useCaptcha } from '../composables/useCaptcha';
import { useCaptchaState } from '../composables/useCaptchaState';

interface Props {
  visible: boolean;
  type?: 'slider' | 'click' | 'puzzle' | 'rotate' | 'text' | 'icon';
  title?: string;
  targetImage?: string;
  sliderImage?: string;
  width?: string | number;
  showClose?: boolean;
  maskClosable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  type: 'slider',
  title: '安全验证',
  targetImage: '',
  sliderImage: '',
  width: 360,
  showClose: true,
  maskClosable: true
});

const emit = defineEmits<{
  'update:visible': [value: boolean];
  success: [token: string];
  error: [error: Error];
  close: [];
  ready: [];
}>();

const { verify } = useCaptcha();
const { setLoading } = useCaptchaState();
const loading = ref(false);

const componentMap = {
  slider: Slider,
  click: Click,
  puzzle: Puzzle,
  rotate: Rotate,
  text: Text,
  icon: Icon
};

const currentComponent = computed(() => {
  return componentMap[props.type as keyof typeof componentMap] || Slider;
});

const containerStyles = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width
}));

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loading.value = false;
    emit('ready');
  }
});

const handleOverlayClick = () => {
  if (props.maskClosable) {
    handleClose();
  }
};

const handleClose = () => {
  emit('update:visible', false);
  emit('close');
};

const handleSuccess = async (data: any) => {
  loading.value = true;
  setLoading(true);
  
  try {
    const token = await verify(props.type);
    emit('success', token);
    handleClose();
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    emit('error', err);
  } finally {
    loading.value = false;
    setLoading(false);
  }
};

const handleError = (error: Error) => {
  emit('error', error);
};
</script>

<style scoped>
.captcha-dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  backdrop-filter: blur(2px);
}

.captcha-dialog-overlay--mask {
  cursor: pointer;
}

.captcha-dialog-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  min-width: 320px;
  max-width: 90vw;
  max-height: 90vh;
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.captcha-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.captcha-dialog-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  line-height: 1.5;
}

.captcha-dialog-close {
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  color: #8c8c8c;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.captcha-dialog-close:hover {
  color: #595959;
  background-color: #f5f5f5;
}

.captcha-dialog-content {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.captcha-dialog-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  gap: 16px;
}

.captcha-dialog-loader {
  width: 40px;
  height: 40px;
  border: 3px solid #f0f0f0;
  border-top-color: #1890ff;
  border-radius: 50%;
  animation: captcha-dialog-spin 0.8s linear infinite;
}

.captcha-dialog-loading-text {
  font-size: 14px;
  color: #8c8c8c;
}

@keyframes captcha-dialog-spin {
  to {
    transform: rotate(360deg);
  }
}

.captcha-dialog-enter-active,
.captcha-dialog-leave-active {
  transition: opacity 0.3s ease;
}

.captcha-dialog-enter-from,
.captcha-dialog-leave-to {
  opacity: 0;
}

.captcha-dialog-enter-active .captcha-dialog-container,
.captcha-dialog-leave-active .captcha-dialog-container {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.captcha-dialog-enter-from .captcha-dialog-container,
.captcha-dialog-leave-to .captcha-dialog-container {
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
}

@media (max-width: 768px) {
  .captcha-dialog-container {
    min-width: auto;
    width: calc(100vw - 40px) !important;
    max-width: none;
    border-radius: 8px;
  }
  
  .captcha-dialog-header {
    padding: 12px 16px;
  }
  
  .captcha-dialog-content {
    padding: 16px;
  }
}
</style>
