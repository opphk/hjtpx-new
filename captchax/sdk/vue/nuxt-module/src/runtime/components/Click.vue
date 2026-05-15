<template>
  <div class="captcha-click">
    <div class="captcha-click__container" :style="containerStyle">
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
import { useCaptchaState } from '../composables/useCaptchaState';

interface Props {
  targetImage?: string;
  clickImages?: string[];
  maxClicks?: number;
  requiredCount?: number;
  showClickCount?: boolean;
  showTips?: boolean;
  tipsText?: string;
}

const props = withDefaults(defineProps<Props>(), {
  targetImage: '',
  clickImages: () => [],
  maxClicks: 5,
  requiredCount: 4,
  showClickCount: true,
  showTips: true,
  tipsText: '请依次点击图中指定的目标'
});

const emit = defineEmits<{
  success: [token: string, clicks: any[]];
  error: [error: Error];
  click: [point: any];
}>();

const { setVerified, setToken, setError, incrementAttempts } = useCaptchaState();

const containerRef = ref<HTMLElement | null>(null);
const userClicks = ref<any[]>([]);
const isVerified = ref(false);

const clickPoints = ref([
  { x: 50, y: 50 },
  { x: 200, y: 80 },
  { x: 150, y: 150 },
  { x: 250, y: 120 }
]);

const containerStyle = computed(() => ({
  backgroundImage: props.targetImage ? 'none' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  backgroundSize: 'cover'
}));

const handleClick = (event: MouseEvent) => {
  if (isVerified.value || userClicks.value.length >= props.maxClicks) return;
  
  const container = containerRef.value;
  if (!container) return;
  
  const rect = container.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  const point = { x, y, timestamp: Date.now() };
  userClicks.value.push(point);
  emit('click', point);
  
  if (userClicks.value.length >= props.requiredCount) {
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
    (containerRef.value as any).addEventListener('click', handleClick);
  }
});
</script>

<style scoped>
.captcha-click {
  width: 300px;
  user-select: none;
}

.captcha-click__container {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  background-size: cover;
  background-position: center;
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
  0% { transform: translate(-50%, -50%) scale(0); }
  50% { transform: translate(-50%, -50%) scale(1.2); }
  100% { transform: translate(-50%, -50%) scale(1); }
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
