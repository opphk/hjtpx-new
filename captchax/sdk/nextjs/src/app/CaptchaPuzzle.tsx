'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { CaptchaPuzzleProps } from '../types';

export function CaptchaPuzzle({
  onSuccess,
  onError,
  onClose,
  scene = 'default',
  backgroundImage,
  puzzleImage,
  width = 300,
  height = 200
}: CaptchaPuzzleProps) {
  const [puzzlePosition, setPuzzlePosition] = useState(0.3);
  const [isDragging, setIsDragging] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const targetPosition = 0.6;
  const puzzleWidth = 50;
  const puzzleHeight = height;

  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    if (isVerifying || isSuccess) return;
    setIsDragging(true);
    event.preventDefault();
  }, [isVerifying, isSuccess]);

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || isVerifying || isSuccess || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = (event.clientX - rect.left) / rect.width;
    setPuzzlePosition(Math.max(0, Math.min(1 - puzzleWidth / width, newPosition)));
  }, [isDragging, isVerifying, isSuccess, puzzleWidth, width]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleVerify = useCallback(async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/v1/captcha/puzzle/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene,
          position: puzzlePosition,
          targetPosition,
          backgroundImage,
          puzzleImage,
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
        setError('验证失败，请重试');
        onError?.(err);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Verification failed');
      setError(error.message);
      onError?.(error);
    } finally {
      setIsVerifying(false);
    }
  }, [puzzlePosition, targetPosition, scene, backgroundImage, puzzleImage, width, height, onSuccess, onError]);

  const handleReset = useCallback(() => {
    setPuzzlePosition(0.3);
    setError(null);
    setIsSuccess(false);
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
        height: height + 120,
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}
    >
      <div
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          width: width,
          height: height,
          position: 'relative',
          borderRadius: '6px',
          overflow: 'hidden',
          backgroundColor: '#e5e7eb',
          marginBottom: '12px',
          cursor: isDragging ? 'grabbing' : 'grab'
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: targetPosition * width,
            width: puzzleWidth,
            height: puzzleHeight,
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: -targetPosition * width + puzzlePosition * width,
              width: width,
              height: height,
              backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: '3px solid rgba(255, 255, 255, 0.8)',
              borderRadius: '4px',
              boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.2)'
            }}
          />
        </div>

        <div
          onMouseDown={handleMouseDown}
          style={{
            position: 'absolute',
            top: 0,
            left: puzzlePosition * width,
            width: puzzleWidth,
            height: puzzleHeight,
            backgroundImage: puzzleImage ? `url(${puzzleImage})` : 'linear-gradient(135deg, #4F46E5 0%, #7c3aed 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'box-shadow 0.2s ease'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '24px',
            height: '24px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <span style={{ fontSize: '14px', color: '#6b7280' }}>
          拖动滑块完成拼图
        </span>
        <div style={{ flex: 1, height: '4px', backgroundColor: '#e5e7eb', borderRadius: '2px', position: 'relative' }}>
          <div 
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${puzzlePosition * 100}%`,
              backgroundColor: isSuccess ? '#10b981' : '#4F46E5',
              borderRadius: '2px',
              transition: 'width 0.1s ease'
            }}
          />
        </div>
        <span style={{ fontSize: '14px', color: '#6b7280', minWidth: '80px', textAlign: 'right' }}>
          {Math.round(puzzlePosition * 100)}%
        </span>
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
        按 ESC 键关闭
      </div>
    </div>
  );
}

export default CaptchaPuzzle;
