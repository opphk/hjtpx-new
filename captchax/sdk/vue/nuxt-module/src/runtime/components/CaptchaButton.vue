<template>
  <button 
    class="captcha-button"
    :class="buttonClasses"
    :disabled="disabled || loading"
    :style="buttonStyles"
    @click="handleClick"
  >
    <span v-if="loading" class="captcha-button__loader"></span>
    <span v-if="icon && !loading" class="captcha-button__icon">{{ icon }}</span>
    <span class="captcha-button__text">
      <slot>{{ loading && loadingText ? loadingText : text }}</slot>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCaptcha } from '../composables/useCaptcha';
import { useCaptchaState } from '../composables/useCaptchaState';

interface Props {
  scene?: string;
  text?: string;
  size?: 'small' | 'medium' | 'large';
  theme?: 'light' | 'dark';
  disabled?: boolean;
  block?: boolean;
  icon?: string;
  loadingText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  scene: 'default',
  text: '安全验证',
  size: 'medium',
  theme: 'light',
  disabled: false,
  block: false,
  loadingText: '验证中...'
});

const emit = defineEmits<{
  success: [token: string];
  error: [error: Error];
  click: [event: MouseEvent];
}>();

const { verify } = useCaptcha();
const { setLoading, setToken, setError } = useCaptchaState();
const loading = ref(false);

const buttonClasses = computed(() => [
  `captcha-button--${props.size}`,
  `captcha-button--${props.theme}`,
  {
    'captcha-button--block': props.block,
    'captcha-button--loading': loading.value
  }
]));

const buttonStyles = computed(() => {
  return {};
});

const handleClick = async (event: MouseEvent) => {
  emit('click', event);
  
  if (loading.value || props.disabled) {
    return;
  }
  
  loading.value = true;
  setLoading(true);
  setError(null);
  
  try {
    const token = await verify(props.scene);
    setToken(token);
    emit('success', token);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setError(err);
    emit('error', err);
  } finally {
    loading.value = false;
    setLoading(false);
  }
};
</script>

<style scoped>
.captcha-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  transition: all 0.2s ease;
  outline: none;
  user-select: none;
  white-space: nowrap;
}

.captcha-button:focus-visible {
  box-shadow: 0 0 0 3px rgba(24, 144, 255, 0.3);
}

.captcha-button--block {
  display: flex;
  width: 100%;
}

.captcha-button--small {
  font-size: 12px;
  padding: 6px 12px;
  min-height: 28px;
}

.captcha-button--medium {
  font-size: 14px;
  padding: 8px 16px;
  min-height: 36px;
}

.captcha-button--large {
  font-size: 16px;
  padding: 12px 24px;
  min-height: 44px;
}

.captcha-button--light {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3);
}

.captcha-button--light:hover:not(:disabled) {
  background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
  box-shadow: 0 4px 8px rgba(24, 144, 255, 0.4);
  transform: translateY(-1px);
}

.captcha-button--light:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(24, 144, 255, 0.3);
}

.captcha-button--dark {
  background: linear-gradient(135deg, #001529 0%, #003a70 100%);
  color: #ffffff;
  box-shadow: 0 2px 4px rgba(0, 21, 41, 0.3);
}

.captcha-button--dark:hover:not(:disabled) {
  background: linear-gradient(135deg, #003a70 0%, #004b8c 100%);
  box-shadow: 0 4px 8px rgba(0, 21, 41, 0.4);
  transform: translateY(-1px);
}

.captcha-button--dark:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 21, 41, 0.3);
}

.captcha-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

.captcha-button--loading {
  cursor: wait;
}

.captcha-button__loader {
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-top-color: transparent;
  border-radius: 50%;
  animation: captcha-button-spin 0.8s linear infinite;
}

.captcha-button__icon {
  font-size: 16px;
  line-height: 1;
}

.captcha-button__text {
  display: inline-flex;
  align-items: center;
}

@keyframes captcha-button-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .captcha-button--small {
    font-size: 11px;
    padding: 5px 10px;
  }
  
  .captcha-button--medium {
    font-size: 13px;
    padding: 7px 14px;
  }
  
  .captcha-button--large {
    font-size: 15px;
    padding: 10px 20px;
  }
}
</style>
