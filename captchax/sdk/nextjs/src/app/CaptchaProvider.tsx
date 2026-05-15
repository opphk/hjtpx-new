'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { CaptchaContextValue, CaptchaChallenge, CaptchaResult, CaptchaProviderProps } from '../types';

const CaptchaContext = createContext<CaptchaContextValue | null>(null);

export function CaptchaProvider({ 
  children, 
  apiKey,
  serverUrl = 'https://api.captchax.com',
  locale = 'zh-CN',
  theme = 'auto',
  onError
}: CaptchaProviderProps) {
  const [tokenCache] = useState<Map<string, string>>(new Map());

  const verify = useCallback(async (scene: string = 'default'): Promise<string> => {
    try {
      const response = await fetch(`${serverUrl}/api/v1/captcha/${scene}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scene,
          apiKey,
          timestamp: Date.now()
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Verification failed');
      }
      
      const token = data.token;
      tokenCache.set(scene, token);
      return token;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Verification failed');
      onError?.(err);
      throw err;
    }
  }, [apiKey, serverUrl, onError, tokenCache]);

  const getChallenge = useCallback(async (scene: string = 'default'): Promise<CaptchaChallenge> => {
    try {
      const response = await fetch(`${serverUrl}/api/v1/captcha/challenge`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept-Language': locale
        },
        body: JSON.stringify({ 
          scene,
          apiKey,
          timestamp: Date.now()
        })
      });
      
      const data = await response.json();
      return data as CaptchaChallenge;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to get challenge');
      onError?.(err);
      throw err;
    }
  }, [apiKey, serverUrl, locale, onError]);

  const verifyToken = useCallback(async (token: string): Promise<CaptchaResult> => {
    try {
      const response = await fetch(`${serverUrl}/api/v2/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      
      const data = await response.json();
      return data as CaptchaResult;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to verify token');
      onError?.(err);
      return {
        success: false,
        error: err.message
      };
    }
  }, [serverUrl, onError]);

  useEffect(() => {
    if (theme !== 'auto') {
      document.documentElement.setAttribute('data-captcha-theme', theme);
    }
  }, [theme]);

  return (
    <CaptchaContext.Provider value={{ verify, getChallenge, verifyToken, config: { apiKey, serverUrl } }}>
      {children}
    </CaptchaContext.Provider>
  );
}

export function useCaptchaContext(): CaptchaContextValue {
  const context = useContext(CaptchaContext);
  if (!context) {
    throw new Error('useCaptchaContext must be used within CaptchaProvider');
  }
  return context;
}

export { CaptchaContext };

