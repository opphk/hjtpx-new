import type { CaptchaConfig, CaptchaProviderValue } from './types';
import { CaptchaConfigKey } from './types';
import { useCaptchaState } from './composables/useCaptchaState';
import CaptchaButton from './components/CaptchaButton.vue';
import CaptchaDialog from './components/CaptchaDialog.vue';
import CaptchaSlider from './components/CaptchaSlider.vue';
import CaptchaClick from './components/CaptchaClick.vue';
import CaptchaPuzzle from './components/CaptchaPuzzle.vue';
import CaptchaRotate from './components/CaptchaRotate.vue';
import CaptchaText from './components/CaptchaText.vue';
import CaptchaIcon from './components/CaptchaIcon.vue';
import CaptchaProvider from './components/CaptchaProvider.vue';

export interface CaptchaPluginOptions {
  config: CaptchaConfig;
  autoMount?: boolean;
}

const defaultConfig: CaptchaConfig = {
  apiKey: '',
  apiSecret: '',
  serverUrl: 'https://captchax.example.com',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

export default {
  install(app, options: CaptchaPluginOptions = { config: defaultConfig, autoMount: true }) {
    const mergedConfig = {
      ...defaultConfig,
      ...options.config
    };
    
    app.provide(CaptchaConfigKey, mergedConfig);
    
    if (options.autoMount !== false) {
      const state = useCaptchaState();
      
      app.provide('captchaState', {
        config: mergedConfig,
        state: {
          isVisible: state.isVisible,
          isLoading: state.isLoading,
          isVerified: state.isVerified,
          token: state.token,
          error: state.error,
          attempts: state.attempts
        },
        actions: {
          show: state.show,
          hide: state.hide,
          setLoading: state.setLoading,
          setVerified: state.setVerified,
          setToken: state.setToken,
          setError: state.setError,
          setAttempts: state.setAttempts,
          incrementAttempts: state.incrementAttempts,
          reset: state.reset
        }
      } as CaptchaProviderValue);
    }
    
    app.component('CaptchaButton', CaptchaButton);
    app.component('CaptchaDialog', CaptchaDialog);
    app.component('CaptchaSlider', CaptchaSlider);
    app.component('CaptchaClick', CaptchaClick);
    app.component('CaptchaPuzzle', CaptchaPuzzle);
    app.component('CaptchaRotate', CaptchaRotate);
    app.component('CaptchaText', CaptchaText);
    app.component('CaptchaIcon', CaptchaIcon);
    app.component('CaptchaProvider', CaptchaProvider);
  }
};

export {
  CaptchaButton,
  CaptchaDialog,
  CaptchaSlider,
  CaptchaClick,
  CaptchaPuzzle,
  CaptchaRotate,
  CaptchaText,
  CaptchaIcon,
  CaptchaProvider
};

export * from './composables/useCaptcha';
export * from './composables/useCaptchaState';
export * from './types';
