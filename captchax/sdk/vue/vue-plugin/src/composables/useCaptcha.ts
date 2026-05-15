import { inject, readonly, computed } from 'vue';
import type { CaptchaConfig, UseCaptchaReturn, CaptchaVerifyOptions } from '../types';
import { CaptchaConfigKey } from '../types';

const defaultConfig: CaptchaConfig = {
  apiKey: '',
  apiSecret: '',
  serverUrl: 'https://captchax.example.com',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

export const useCaptcha = (): UseCaptchaReturn => {
  const config = inject<CaptchaConfig>(CaptchaConfigKey, defaultConfig);
  
  const isClient = typeof window !== 'undefined';
  
  const mergedConfig = computed(() => ({
    ...defaultConfig,
    ...config
  }));
  
  const createToken = (scene: string): string => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `cx_${scene}_${timestamp}_${random}`;
  };
  
  const verify = async (
    scene: string = 'default',
    options?: CaptchaVerifyOptions
  ): Promise<string> => {
    const currentConfig = mergedConfig.value;
    
    if (!currentConfig.apiKey) {
      throw new Error('CaptchaX API key is not configured');
    }
    
    if (!isClient) {
      throw new Error('CaptchaX verify must be called on client side');
    }
    
    const timeout = options?.timeout || currentConfig.timeout || 30000;
    const retryAttempts = currentConfig.retryAttempts || 3;
    const retryDelay = currentConfig.retryDelay || 1000;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const token = await attemptVerify(scene, currentConfig.serverUrl, timeout);
        return token;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < retryAttempts) {
          await sleep(retryDelay * attempt);
        }
      }
    }
    
    throw lastError || new Error('Verification failed after multiple attempts');
  };
  
  const attemptVerify = (
    scene: string,
    serverUrl: string,
    timeout: number
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Verification timeout'));
      }, timeout);
      
      const eventSource = new EventSource(
        `${serverUrl}/api/verify?scene=${scene}&apiKey=${mergedConfig.value.apiKey}`
      );
      
      eventSource.onmessage = (event) => {
        clearTimeout(timeoutId);
        eventSource.close();
        
        try {
          const data = JSON.parse(event.data);
          if (data.token) {
            resolve(data.token);
          } else if (data.error) {
            reject(new Error(data.error));
          } else {
            reject(new Error('Invalid verification response'));
          }
        } catch (error) {
          reject(new Error('Failed to parse verification response'));
        }
      };
      
      eventSource.onerror = () => {
        clearTimeout(timeoutId);
        eventSource.close();
        reject(new Error('Verification connection failed'));
      };
    });
  };
  
  const getToken = (): string | null => {
    if (!isClient) return null;
    
    const token = sessionStorage.getItem('captchax_token');
    const expiresAt = sessionStorage.getItem('captchax_token_expires');
    
    if (token && expiresAt) {
      const expiry = parseInt(expiresAt, 10);
      if (Date.now() < expiry) {
        return token;
      } else {
        clearToken();
      }
    }
    
    return null;
  };
  
  const clearToken = (): void => {
    if (!isClient) return;
    
    sessionStorage.removeItem('captchax_token');
    sessionStorage.removeItem('captchax_token_expires');
  };
  
  return {
    verify,
    config: readonly(mergedConfig) as Readonly<CaptchaConfig>,
    isClient,
    getToken,
    clearToken
  };
};

const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const createCaptchaVerifier = (config: CaptchaConfig) => {
  return async (scene: string, options?: CaptchaVerifyOptions): Promise<string> => {
    const mergedConfig = { ...defaultConfig, ...config };
    
    if (!mergedConfig.apiKey) {
      throw new Error('CaptchaX API key is not configured');
    }
    
    if (typeof window === 'undefined') {
      throw new Error('CaptchaX verify must be called on client side');
    }
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Verification timeout'));
      }, mergedConfig.timeout || 30000);
      
      const eventSource = new EventSource(
        `${mergedConfig.serverUrl}/api/verify?scene=${scene}&apiKey=${mergedConfig.apiKey}`
      );
      
      eventSource.onmessage = (event) => {
        clearTimeout(timeout);
        eventSource.close();
        
        try {
          const data = JSON.parse(event.data);
          if (data.token) {
            resolve(data.token);
          } else if (data.error) {
            reject(new Error(data.error));
          }
        } catch (error) {
          reject(new Error('Failed to parse verification response'));
        }
      };
      
      eventSource.onerror = () => {
        clearTimeout(timeout);
        eventSource.close();
        reject(new Error('Verification connection failed'));
      };
    });
  };
};
