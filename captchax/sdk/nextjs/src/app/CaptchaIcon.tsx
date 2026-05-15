'use client';

import { useState, useCallback } from 'react';
import type { CaptchaIconProps } from '../types';

export function CaptchaIcon({
  onSuccess,
  onError,
  onClose,
  scene = 'default',
  icons = ['🌟', '⭐', '🌙', '☀️', '🌈', '⚡', '🔥', '💎'],
  targetIcon = '🌟',
  gridSize = 3
}: CaptchaIconProps) {
  const [selectedIcons, setSelectedIcons] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [hintCount] = useState(Math.floor(Math.random() * 2) + 1);

  const displayIcons = [...icons].sort(() => Math.random() - 0.5);

  const handleIconClick = useCallback((icon: string) => {
    if (isVerifying || isSuccess) return;

    setSelectedIcons(prev => {
      if (prev.includes(icon)) {
        return prev.filter(i => i !== icon);
      }
      if (prev.length >= hintCount) {
        return [...prev.slice(1), icon];
      }
      return [...prev, icon];
    });
    setError(null);
  }, [isVerifying, isSuccess, hintCount]);

  const handleVerify = useCallback(async () => {
    if (selectedIcons.length !== hintCount) {
      setError(`请选择 ${hintCount} 个 ${targetIcon}`);
      return;
    }

    const allCorrect = selectedIcons.every(icon => icon === targetIcon);
    if (!allCorrect) {
      setError(`请选择 ${hintCount} 个 ${targetIcon}`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/captcha/icon/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          selectedIcons,
          targetIcon,
          hintCount
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
  }, [selectedIcons, targetIcon, hintCount, scene, onSuccess, onError]);

  const handleReset = useCallback(() => {
    setSelectedIcons([]);
    setError(null);
    setIsSuccess(false);
  }, []);

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
        图标验证码
      </div>

      <div style={{
        marginBottom: '12px',
        padding: '12px',
        backgroundColor: '#f3f4f6',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#4b5563'
      }}>
        <div style={{ marginBottom: '8px', fontWeight: 500 }}>
          请点击所有 <span style={{ fontSize: '20px' }}>{targetIcon}</span> 图标
        </div>
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          已选择: {selectedIcons.length}/{hintCount}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
          gap: '8px',
          marginBottom: '16px'
        }}
      >
        {displayIcons.map((icon, index) => {
          const isSelected = selectedIcons.includes(icon);
          return (
            <button
              key={`${icon}-${index}`}
              onClick={() => handleIconClick(icon)}
              disabled={isVerifying || isSuccess}
              style={{
                padding: '16px',
                fontSize: '32px',
                borderRadius: '6px',
                border: isSelected ? '3px solid #4F46E5' : '2px solid #e5e7eb',
                backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                cursor: isVerifying || isSuccess ? 'default' : 'pointer',
                transition: 'all 0.2s ease',
                transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isSelected ? '0 2px 4px rgba(79, 70, 229, 0.2)' : 'none'
              }}
            >
              {icon}
            </button>
          );
        })}
      </div>

      {error && (
        <div style={{ 
          marginBottom: '12px', 
          padding: '8px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
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
        点击选择 {targetIcon} 图标 {hintCount} 个
      </div>
    </div>
  );
}

export default CaptchaIcon;
