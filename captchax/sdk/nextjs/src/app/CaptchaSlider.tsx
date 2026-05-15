'use client';

import { useState, useCallback, useRef } from 'react';
import type { CaptchaSliderProps } from '../types';

export function CaptchaSlider({
  onSuccess,
  onError,
  onClose,
  scene = 'default',
  backgroundImage,
  sliderImage,
  width = 300,
  height = 150,
  difficulty = 'medium'
}: CaptchaSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  const targetPosition = difficulty === 'easy' ? 0.7 : difficulty === 'hard' ? 0.4 : 0.5;

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (isVerifying || isSuccess) return;
    setIsDragging(true);
    event.preventDefault();
  }, [isVerifying, isSuccess]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || isVerifying || isSuccess || !trackRef.current) return;
    
    const trackRect = trackRef.current.getBoundingClientRect();
    const newPosition = (event.clientX - trackRect.left) / trackRect.width;
    setSliderPosition(Math.max(0, Math.min(1, newPosition)));
  }, [isDragging, isVerifying, isSuccess]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/captcha/slider/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          position: sliderPosition,
          targetPosition,
          backgroundImage,
          sliderImage,
          width,
          height
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsSuccess(true);
        onSuccess?.(data.token);
      } else {
        const err = new Error(data.error || 'Verification failed');
        setError(data.error || '验证失败，请重试');
        onError?.(err);
        setSliderPosition(0);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsVerifying(false);
    }
  }, [sliderPosition, targetPosition, scene, backgroundImage, sliderImage, width, height, onSuccess, onError]);

  const handleReset = useCallback(() => {
    setSliderPosition(0);
    setError(null);
    setIsSuccess(false);
  }, []);

  const sliderWidth = 40;
  const trackWidth = width - sliderWidth;

  return (
    <div
      style={{
        width: width,
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div
        ref={trackRef}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: trackWidth,
          height: height,
          position: 'relative',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: '#e5e7eb',
          marginBottom: '12px'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: `${targetPosition * 100}%`,
            height: '100%',
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        <div
          ref={sliderRef}
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: sliderPosition * trackWidth,
            width: sliderWidth,
            height: height,
            backgroundImage: sliderImage ? `url(${sliderImage})` : 'linear-gradient(135deg, #4F46E5 0%, #7c3aed 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            cursor: isDragging ? 'grabbing' : 'grab',
            borderRadius: '6px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            transition: isDragging ? 'none' : 'left 0.1s ease'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        fontSize: '14px',
        color: '#6b7280'
      }}>
        <div style={{ flex: 1, height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', position: 'relative' }}>
          <div 
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${sliderPosition * 100}%`,
              backgroundColor: isSuccess ? '#10b981' : '#4F46E5',
              borderRadius: '2px',
              transition: 'width 0.1s ease'
            }}
          />
        </div>
        <span style={{ minWidth: '80px', textAlign: 'right' }}>
          {Math.round(sliderPosition * 100)}%
        </span>
      </div>

      {error && (
        <div style={{ 
          marginTop: '8px', 
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
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: '#efe', 
          border: '1px solid #cfc',
          borderRadius: '4px',
          fontSize: '13px', 
          color: '#10b981',
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

      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
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
          disabled={isVerifying || isSuccess}
          style={{
            flex: 1,
            padding: '8px 16px',
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
        拖动滑块完成拼图
      </div>
    </div>
  );
}

export default CaptchaSlider;
