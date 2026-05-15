'use client';

import { useState, useCallback } from 'react';
import type { CaptchaButtonProps } from '../types';

async function verifyCaptchaClient(
  scene: string,
  serverUrl: string,
  apiKey: string
): Promise<string> {
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
  
  if (!data.success) {
    throw new Error(data.error || 'Verification failed');
  }
  
  return data.token;
}

export function CaptchaButton({
  children,
  scene = 'default',
  onSuccess,
  onError,
  text = '验证',
  disabled = false,
  className = '',
  style,
  serverUrl = 'https://api.captchax.com',
  apiKey = '',
  size = 'medium',
  variant = 'primary',
  loadingText = '验证中...',
  successText = '已验证'
}: CaptchaButtonProps) {
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const sizeStyles = {
    small: { padding: '6px 12px', fontSize: '12px' },
    medium: { padding: '10px 20px', fontSize: '14px' },
    large: { padding: '14px 28px', fontSize: '16px' }
  };

  const variantStyles = {
    primary: { backgroundColor: '#4F46E5', color: 'white', border: 'none' },
    secondary: { backgroundColor: '#6b7280', color: 'white', border: 'none' },
    outline: { backgroundColor: 'white', color: '#4F46E5', border: '2px solid #4F46E5' }
  };

  const currentVariant = isSuccess ? 'secondary' : variant;
  const currentText = isSuccess ? successText : loading ? loadingText : (children || text);

  const handleClick = useCallback(async () => {
    if (!apiKey) {
      const error = new Error('API key is required');
      onError?.(error);
      return;
    }

    if (disabled || loading || isSuccess) return;

    setLoading(true);
    try {
      const token = await verifyCaptchaClient(scene, serverUrl, apiKey);
      setIsSuccess(true);
      onSuccess?.(token);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('Verification failed'));
    } finally {
      setLoading(false);
    }
  }, [scene, serverUrl, apiKey, disabled, loading, isSuccess, onSuccess, onError]);

  const handleReset = useCallback(() => {
    setIsSuccess(false);
  }, []);

  return (
    <button
      className={`captcha-button ${className} ${loading ? 'captcha-button-loading' : ''} ${isSuccess ? 'captcha-button-success' : ''}`}
      onClick={handleClick}
      disabled={disabled || loading}
      style={{
        ...sizeStyles[size],
        ...variantStyles[currentVariant],
        borderRadius: '6px',
        cursor: disabled || loading || isSuccess ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.6 : 1,
        transition: 'all 0.2s ease',
        fontWeight: 500,
        fontFamily: 'inherit',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        minWidth: '120px',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading && !isSuccess) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 6px rgba(79, 70, 229, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {loading && (
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          style={{ animation: 'spin 1s linear infinite' }}
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      )}
      {isSuccess && (
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      )}
      {currentText}
    </button>
  );
}

export default CaptchaButton;
