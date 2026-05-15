'use client';

import { useState, useCallback } from 'react';
import type { CaptchaTextProps } from '../types';

export function CaptchaText({
  onSuccess,
  onError,
  onClose,
  scene = 'default',
  question,
  answer,
  caseSensitive = false,
  maxLength = 6
}: CaptchaTextProps) {
  const [inputValue, setInputValue] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const displayQuestion = question || '请输入下方显示的字符';
  const displayAnswer = answer || generateRandomText(maxLength);

  function generateRandomText(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    if (value.length <= maxLength) {
      setInputValue(value);
      setError(null);
    }
  }, [maxLength]);

  const handleVerify = useCallback(async () => {
    if (!inputValue.trim()) {
      setError('请输入验证码');
      return;
    }

    const expectedAnswer = caseSensitive ? displayAnswer : displayAnswer.toLowerCase();
    const userAnswer = caseSensitive ? inputValue : inputValue.toLowerCase();

    if (userAnswer !== expectedAnswer) {
      setError('验证码不正确');
      setInputValue('');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/captcha/text/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          answer: inputValue,
          expectedAnswer: displayAnswer,
          caseSensitive
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        onSuccess?.(data.token);
      } else {
        const err = new Error(data.error || 'Verification failed');
        setError(data.error || '验证失败');
        onError?.(err);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsVerifying(false);
    }
  }, [inputValue, caseSensitive, displayAnswer, scene, onSuccess, onError]);

  const handleReset = useCallback(() => {
    setInputValue('');
    setError(null);
    setIsSuccess(false);
  }, []);

  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !isVerifying && !isSuccess) {
      handleVerify();
    }
  }, [handleVerify, isVerifying, isSuccess]);

  return (
    <div
      style={{
        width: '320px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '24px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div style={{
        marginBottom: '16px',
        fontSize: '16px',
        fontWeight: 500,
        color: '#374151'
      }}>
        文字验证码
      </div>

      <div style={{
        marginBottom: '12px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        {displayQuestion}
      </div>

      <div
        style={{
          padding: '16px',
          backgroundColor: '#f3f4f6',
          borderRadius: '6px',
          marginBottom: '16px',
          textAlign: 'center',
          fontSize: '24px',
          fontWeight: 'bold',
          letterSpacing: '8px',
          fontFamily: 'monospace',
          color: '#4F46E5',
          userSelect: 'none',
          border: '2px dashed #d1d5db'
        }}
      >
        {displayAnswer}
      </div>

      <input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyPress={handleKeyPress}
        placeholder="请输入上方字符"
        disabled={isVerifying || isSuccess}
        maxLength={maxLength}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '6px',
          border: error ? '2px solid #ef4444' : '1px solid #d1d5db',
          fontSize: '16px',
          textAlign: 'center',
          letterSpacing: '4px',
          fontFamily: 'monospace',
          outline: 'none',
          marginBottom: '8px',
          boxSizing: 'border-box'
        }}
      />

      {error && (
        <div style={{ 
          marginBottom: '12px', 
          fontSize: '13px', 
          color: '#ef4444' 
        }}>
          {error}
        </div>
      )}

      {isSuccess && (
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px', 
          backgroundColor: '#d1fae5', 
          border: '1px solid #6ee7b7',
          borderRadius: '4px',
          fontSize: '13px', 
          color: '#059669',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          验证成功
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleReset}
          disabled={isVerifying}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            color: '#374151',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          重置
        </button>
        <button
          onClick={handleVerify}
          disabled={isVerifying || isSuccess}
          style={{
            flex: 1,
            padding: '10px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isSuccess ? '#10b981' : '#4F46E5',
            color: 'white',
            cursor: isSuccess ? 'default' : 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {isVerifying ? '验证中...' : isSuccess ? '已验证' : '验证'}
        </button>
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center'
      }}>
        {caseSensitive ? '区分大小写' : '不区分大小写'}
      </div>
    </div>
  );
}

export default CaptchaText;
