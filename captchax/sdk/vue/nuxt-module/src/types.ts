import type { CaptchaConfig, UseCaptchaReturn, UseCaptchaStateReturn } from '../types';

declare module '@nuxt/schema' {
  interface NuxtConfig {
    captcha?: CaptchaModuleOptions;
  }
  
  interface RuntimeConfig {
    captcha: CaptchaModuleOptions;
  }
}

export interface CaptchaModuleOptions {
  apiKey?: string;
  apiSecret?: string;
  serverUrl?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enabled?: boolean;
  componentPrefix?: string;
  autoMount?: boolean;
}

export { CaptchaConfig, UseCaptchaReturn, UseCaptchaStateReturn };
