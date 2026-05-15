'use client';

import { useState, useCallback } from 'react';
import { useCaptchaContext } from '../app/CaptchaProvider';
import type { UseCaptchaOptions, UseCaptchaReturn } from '../types';

export function useCaptcha(options: UseCaptchaOptions = {}): UseCaptchaReturn {
  const { scene = 'default', onSuccess, onError, serverUrl, apiKey, autoVerify = false } = options;
  
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  let captchaContext;
  try {
    captchaContext = useCaptchaContext();
  } catch {
    captchaContext = null;
  }

  const verify = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let resultToken: string | null = null;
      
      if (captchaContext) {
        resultToken = await captchaContext.verify(scene);
      } else if (serverUrl && apiKey) {
        const response = await fetch(`${serverUrl}/api/v1/captcha/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            scene,
            apiKey,
            timestamp: Date.now()
          })
        });
        
        const data = await response.json();
        if (data.success) {
          resultToken = data.token;
        }
      }
      
      if (resultToken) {
        setToken(resultToken);
        setIsVerified(true);
        onSuccess?.(resultToken);
        return resultToken;
      } else {
        throw new Error('Verification failed');
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification failed');
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [scene, onSuccess, onError, captchaContext, serverUrl, apiKey]);

  const reset = useCallback(() => {
    setToken(null);
    setError(null);
    setIsVerified(false);
  }, []);

  return { token, loading, error, isVerified, verify, reset };
}

export default useCaptcha;
