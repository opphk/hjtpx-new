'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CaptchaClickProps } from '../types';

export function CaptchaClick({
  onSuccess,
  onError,
  onClose,
  scene = 'default',
  targetCount = 4,
  imageUrl,
  width = 300,
  height = 200
}: CaptchaClickProps) {
  const [clickPositions, setClickPositions] = useState<Array<{ x: number; y: number }>>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isVerifying) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    if (clickPositions.length < targetCount) {
      setClickPositions(prev => [...prev, { x, y }]);
      setError(null);
    }
  }, [clickPositions.length, targetCount, isVerifying]);

  const handleVerify = useCallback(async () => {
    if (clickPositions.length !== targetCount) {
      setError(`请点击 ${targetCount} 个目标`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/captcha/click/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          positions: clickPositions,
          imageUrl,
          width,
          height
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess?.(data.token);
      } else {
        const err = new Error(data.error || 'Verification failed');
        setError(data.error || 'Verification failed');
        onError?.(err);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsVerifying(false);
    }
  }, [clickPositions, scene, imageUrl, width, height, targetCount, onSuccess, onError]);

  const handleReset = useCallback(() => {
    setClickPositions([]);
    setError(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div 
      ref={containerRef}
      style={{
        width: width,
        height: height,
        position: 'relative',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#f9fafb'
      }}
    >
      <div
        onClick={handleImageClick}
        style={{
          width: '100%',
          height: '100%',
          cursor: 'crosshair',
          backgroundImage: imageUrl ? `url(${imageUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      >
        {clickPositions.map((pos, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              left: pos.x - 15,
              top: pos.y - 15,
              width: 30,
              height: 30,
              borderRadius: '50%',
              border: '2px solid #4F46E5',
              backgroundColor: 'rgba(79, 70, 229, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4F46E5',
              fontSize: '12px',
              fontWeight: 'bold',
              pointerEvents: 'none'
            }}
          >
            {index + 1}
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{ marginBottom: '8px', fontSize: '14px', color: '#374151' }}>
          {clickPositions.length}/{targetCount} 个目标已选择
        </div>
        
        {error && (
          <div style={{ marginBottom: '8px', fontSize: '13px', color: '#ef4444' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleReset}
            disabled={isVerifying}
            style={{
              flex: 1,
              padding: '8px 16px',
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
            disabled={isVerifying || clickPositions.length !== targetCount}
            style={{
              flex: 1,
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: clickPositions.length === targetCount ? '#4F46E5' : '#9ca3af',
              color: 'white',
              cursor: clickPositions.length === targetCount ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            {isVerifying ? '验证中...' : '验证'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CaptchaClick;
