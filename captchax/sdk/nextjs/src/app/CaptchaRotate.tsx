'use client';

import { useState, useCallback, useRef } from 'react';
import type { CaptchaRotateProps } from '../types';

export function CaptchaRotate({
  onSuccess,
  onError,
  onClose,
  scene = 'default',
  imageUrl,
  targetAngle = 45,
  tolerance = 10,
  width = 300,
  height = 300
}: CaptchaRotateProps) {
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastAngleRef = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (isVerifying) return;
    setIsDragging(true);
    lastAngleRef.current = Math.atan2(
      event.clientY - containerRef.current!.getBoundingClientRect().top - height / 2,
      event.clientX - containerRef.current!.getBoundingClientRect().left - width / 2
    ) * (180 / Math.PI);
  }, [isVerifying, width, height]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || isVerifying) return;
    
    const currentAngle = Math.atan2(
      event.clientY - containerRef.current!.getBoundingClientRect().top - height / 2,
      event.clientX - containerRef.current!.getBoundingClientRect().left - width / 2
    ) * (180 / Math.PI);
    
    const deltaAngle = currentAngle - lastAngleRef.current;
    setRotation(prev => prev + deltaAngle);
    lastAngleRef.current = currentAngle;
  }, [isDragging, isVerifying, width, height]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleVerify = useCallback(async () => {
    const normalizedRotation = ((rotation % 360) + 360) % 360;
    const normalizedTarget = ((targetAngle % 360) + 360) % 360;
    const diff = Math.min(
      Math.abs(normalizedRotation - normalizedTarget),
      Math.abs(normalizedRotation - normalizedTarget - 360),
      Math.abs(normalizedRotation - normalizedTarget + 360)
    );

    if (diff > tolerance) {
      setError(`旋转角度不正确，请旋转至 ${targetAngle}°`);
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/captcha/rotate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          rotation: normalizedRotation,
          targetAngle: normalizedTarget,
          imageUrl
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
  }, [rotation, targetAngle, tolerance, scene, imageUrl, onSuccess, onError]);

  const handleReset = useCallback(() => {
    setRotation(0);
    setError(null);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: width,
        height: height + 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        padding: '16px'
      }}
    >
      <div
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: width,
          height: height,
          borderRadius: '50%',
          overflow: 'hidden',
          cursor: isDragging ? 'grabbing' : 'grab',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
      >
        <div
          style={{
            width: width * 0.8,
            height: height * 0.8,
            borderRadius: '50%',
            backgroundImage: imageUrl ? `url(${imageUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: `rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease'
          }}
        />
      </div>

      <div style={{
        marginTop: '16px',
        textAlign: 'center',
        fontSize: '14px',
        color: '#374151'
      }}>
        当前角度: {Math.round(rotation)}°
      </div>

      {error && (
        <div style={{ marginTop: '8px', fontSize: '13px', color: '#ef4444' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px', width: '100%' }}>
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
          disabled={isVerifying}
          style={{
            flex: 1,
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: '#4F46E5',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          {isVerifying ? '验证中...' : '验证'}
        </button>
      </div>

      <div style={{
        marginTop: '12px',
        fontSize: '12px',
        color: '#6b7280',
        textAlign: 'center'
      }}>
        请旋转图片至正确角度
      </div>
    </div>
  );
}

export default CaptchaRotate;
