import { ref, reactive, readonly, computed } from 'vue';
import type { UseCaptchaStateReturn } from '../types';

interface CaptchaStateInternal {
  isVisible: boolean;
  isLoading: boolean;
  isVerified: boolean;
  token: string | null;
  error: Error | null;
  attempts: number;
}

const createInitialState = (): CaptchaStateInternal => ({
  isVisible: false,
  isLoading: false,
  isVerified: false,
  token: null,
  error: null,
  attempts: 0
});

const state = reactive<CaptchaStateInternal>(createInitialState());

export const useCaptchaState = (): UseCaptchaStateReturn => {
  const show = () => {
    state.isVisible = true;
    state.error = null;
  };
  
  const hide = () => {
    state.isVisible = false;
  };
  
  const setLoading = (loading: boolean) => {
    state.isLoading = loading;
  };
  
  const setVerified = (verified: boolean) => {
    state.isVerified = verified;
    if (verified) {
      state.isVisible = false;
    }
  };
  
  const setToken = (token: string | null) => {
    state.token = token;
  };
  
  const setError = (error: Error | null) => {
    state.error = error;
  };
  
  const setAttempts = (attempts: number) => {
    state.attempts = attempts;
  };
  
  const incrementAttempts = () => {
    state.attempts += 1;
  };
  
  const reset = () => {
    state.token = null;
    state.error = null;
    state.isLoading = false;
    state.isVerified = false;
    state.isVisible = false;
    state.attempts = 0;
  };
  
  const isValidToken = computed(() => {
    if (!state.token) return false;
    
    try {
      const parts = state.token.split('_');
      if (parts.length >= 3) {
        const timestamp = parseInt(parts[2], 10);
        const expiryTime = 5 * 60 * 1000;
        return Date.now() - timestamp < expiryTime;
      }
      return false;
    } catch {
      return false;
    }
  });
  
  return {
    show,
    hide,
    setLoading,
    setVerified,
    setToken,
    setError,
    setAttempts,
    incrementAttempts,
    reset,
    isVisible: readonly(ref(state.isVisible)),
    isLoading: readonly(ref(state.isLoading)),
    isVerified: readonly(ref(state.isVerified)),
    token: readonly(ref(state.token)),
    error: readonly(ref(state.error)),
    attempts: readonly(ref(state.attempts))
  };
};

export const createCaptchaState = () => {
  const localState = reactive<CaptchaStateInternal>(createInitialState());
  
  return {
    show: () => {
      localState.isVisible = true;
      localState.error = null;
    },
    hide: () => {
      localState.isVisible = false;
    },
    setLoading: (loading: boolean) => {
      localState.isLoading = loading;
    },
    setVerified: (verified: boolean) => {
      localState.isVerified = verified;
      if (verified) {
        localState.isVisible = false;
      }
    },
    setToken: (token: string | null) => {
      localState.token = token;
    },
    setError: (error: Error | null) => {
      localState.error = error;
    },
    setAttempts: (attempts: number) => {
      localState.attempts = attempts;
    },
    incrementAttempts: () => {
      localState.attempts += 1;
    },
    reset: () => {
      localState.token = null;
      localState.error = null;
      localState.isLoading = false;
      localState.isVerified = false;
      localState.isVisible = false;
      localState.attempts = 0;
    },
    isVisible: readonly(ref(localState.isVisible)),
    isLoading: readonly(ref(localState.isLoading)),
    isVerified: readonly(ref(localState.isVerified)),
    token: readonly(ref(localState.token)),
    error: readonly(ref(localState.error)),
    attempts: readonly(ref(localState.attempts))
  };
};
