<template>
  <div class="captcha-icon">
    <div class="captcha-icon__header">
      <span class="captcha-icon__title">{{ titleText }}</span>
      <span class="captcha-icon__count">{{ selectedIcons.length }} / {{ requiredCount }}</span>
    </div>
    
    <div class="captcha-icon__grid" :style="gridStyle">
      <div 
        v-for="icon in displayedIcons" 
        :key="icon.id"
        class="captcha-icon__item"
        :class="{ 'captcha-icon__item--selected': icon.selected }"
        @click="toggleIcon(icon)"
      >
        <div class="captcha-icon__icon">{{ icon.icon }}</div>
        <div v-if="icon.name" class="captcha-icon__name">{{ icon.name }}</div>
      </div>
    </div>
    
    <div class="captcha-icon__actions">
      <button 
        class="captcha-icon__btn captcha-icon__btn--reset"
        @click="resetSelection"
        :disabled="selectedIcons.length === 0"
      >
        重置
      </button>
      <button 
        class="captcha-icon__btn captcha-icon__btn--submit"
        @click="submitSelection"
        :disabled="selectedIcons.length !== requiredCount"
      >
        确认
      </button>
    </div>
    
    <div v-if="showTips && !isVerified" class="captcha-icon__tips">
      {{ tipsText }}
    </div>
    
    <div v-if="isVerified" class="captcha-icon__success">
      ✓ 验证成功
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CaptchaIconProps, IconItem } from '../types';
import { useCaptchaState } from '../composables/useCaptchaState';

const props = withDefaults(defineProps<CaptchaIconProps>(), {
  targetImage: '',
  icons: () => [],
  requiredCount: 3,
  iconSize: 60,
  showCount: true,
  showTips: true,
  tipsText: '请选择所有指定的图标'
});

const emit = defineEmits<{
  success: [token: string, icons: IconItem[]];
  error: [error: Error];
  select: [icon: IconItem];
}>();

const { setVerified, setToken, setError } = useCaptchaState();

const selectedIcons = ref<IconItem[]>([]);
const isVerified = ref(false);
const displayedIcons = ref<IconItem[]>([]);

const titleText = computed(() => {
  if (props.icons.length > 0 && props.icons[0]?.name) {
    return `请依次选择: ${props.icons.slice(0, props.requiredCount).map(i => i.name).join(', ')}`;
  }
  return `请选择 ${props.requiredCount} 个图标`;
});

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(auto-fill, minmax(${props.iconSize}px, 1fr))`,
  gap: '12px'
}));

const defaultIcons: IconItem[] = [
  { id: '1', icon: '🌙', name: '月亮', selected: false },
  { id: '2', icon: '☀️', name: '太阳', selected: false },
  { id: '3', icon: '⭐', name: '星星', selected: false },
  { id: '4', icon: '🌈', name: '彩虹', selected: false },
  { id: '5', icon: '❄️', name: '雪花', selected: false },
  { id: '6', icon: '🌸', name: '樱花', selected: false },
  { id: '7', icon: '🍎', name: '苹果', selected: false },
  { id: '8', icon: '🍕', name: '披萨', selected: false }
];

const shuffleArray = (array: IconItem[]): IconItem[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const initializeIcons = () => {
  if (props.icons.length > 0) {
    displayedIcons.value = shuffleArray(props.icons);
  } else {
    displayedIcons.value = shuffleArray(defaultIcons);
  }
};

const toggleIcon = (icon: IconItem) => {
  if (isVerified.value) return;
  
  const index = selectedIcons.value.findIndex(s => s.id === icon.id);
  
  if (index > -1) {
    selectedIcons.value.splice(index, 1);
    icon.selected = false;
  } else if (selectedIcons.value.length < props.requiredCount) {
    selectedIcons.value.push(icon);
    icon.selected = true;
    emit('select', icon);
  }
  
  if (selectedIcons.value.length === props.requiredCount) {
    submitSelection();
  }
};

const resetSelection = () => {
  selectedIcons.value = [];
  displayedIcons.value.forEach(icon => {
    icon.selected = false;
  });
};

const submitSelection = async () => {
  if (selectedIcons.value.length !== props.requiredCount) return;
  
  isVerified.value = true;
  
  try {
    const token = `icon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setVerified(true);
    setToken(token);
    emit('success', token, selectedIcons.value);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    setError(err);
    emit('error', err);
  }
};

initializeIcons();
</script>

<style scoped>
.captcha-icon {
  width: 300px;
  user-select: none;
}

.captcha-icon__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.captcha-icon__title {
  font-size: 14px;
  color: #262626;
  font-weight: 500;
}

.captcha-icon__count {
  font-size: 14px;
  color: #8c8c8c;
}

.captcha-icon__grid {
  display: grid;
  gap: 12px;
}

.captcha-icon__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.captcha-icon__item:hover {
  background: #f0f0f0;
  transform: scale(1.05);
}

.captcha-icon__item--selected {
  background: rgba(24, 144, 255, 0.1);
  border-color: #1890ff;
}

.captcha-icon__icon {
  font-size: 32px;
  line-height: 1;
  margin-bottom: 4px;
}

.captcha-icon__name {
  font-size: 12px;
  color: #666;
}

.captcha-icon__actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.captcha-icon__btn {
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.captcha-icon__btn--reset {
  background: #f0f0f0;
  color: #666;
}

.captcha-icon__btn--reset:hover:not(:disabled) {
  background: #e8e8e8;
}

.captcha-icon__btn--submit {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%);
  color: white;
}

.captcha-icon__btn--submit:hover:not(:disabled) {
  background: linear-gradient(135deg, #40a9ff 0%, #69c0ff 100%);
}

.captcha-icon__btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.captcha-icon__tips {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #8c8c8c;
}

.captcha-icon__success {
  text-align: center;
  margin-top: 12px;
  font-size: 14px;
  color: #52c41a;
  font-weight: 500;
}
</style>
