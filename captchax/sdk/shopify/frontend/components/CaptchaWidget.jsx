import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Card,
  Button,
  Spinner,
  Banner,
  RadioButton,
  Checkbox,
  TextField,
  RangeSlider,
  Icon,
  InlineError
} from '@shopify/polaris';

const CaptchaWidget = ({
  shop,
  type = 'image',
  token,
  apiUrl = 'https://captchax.example.com',
  theme = 'light',
  language = 'zh-CN',
  position = 'bottom-right',
  onVerify,
  onClose,
  onError
}) => {
  const [status, setStatus] = useState('loading');
  const [attempts, setAttempts] = useState(0);
  const [selectedImages, setSelectedImages] = useState([]);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const widgetRef = useRef(null);

  useEffect(() => {
    if (token) {
      initializeCaptcha();
    }
  }, [token]);

  const initializeCaptcha = async () => {
    try {
      setStatus('ready');
      setError(null);
    } catch (err) {
      setError('验证码加载失败');
      setStatus('error');
      onError?.(err);
    }
  };

  const handleVerification = async (responseData) => {
    try {
      setStatus('verifying');

      const response = await fetch(`${apiUrl}/captcha/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          response: responseData
        })
      });

      if (!response.ok) {
        throw new Error('验证请求失败');
      }

      const result = await response.json();

      if (result.success) {
        setResult(result);
        setStatus('success');
        onVerify?.(result);
      } else {
        throw new Error(result.message || '验证失败');
      }
    } catch (err) {
      setAttempts(prev => prev + 1);
      setError(err.message);
      setStatus('ready');
      onError?.(err);
    }
  };

  const handleImageSelect = (imageIndex) => {
    if (type === 'image' || type === 'icon') {
      setSelectedImages([imageIndex]);
    } else if (type === 'grid' || type === 'concat') {
      if (selectedImages.includes(imageIndex)) {
        setSelectedImages(selectedImages.filter(i => i !== imageIndex));
      } else {
        setSelectedImages([...selectedImages, imageIndex]);
      }
    }
  };

  const handleSliderComplete = () => {
    const targetPosition = Math.floor(Math.random() * 40) + 30;
    const userPosition = sliderPosition;
    
    if (Math.abs(userPosition - targetPosition) < 10) {
      handleVerification({ type: 'slider', position: userPosition });
    } else {
      setAttempts(prev => prev + 1);
      setError('位置不正确，请重试');
      setSliderPosition(0);
    }
  };

  const handleRotationComplete = () => {
    const targetAngle = Math.floor(Math.random() * 360);
    const userAngle = rotationAngle;
    
    const diff = Math.abs(((userAngle - targetAngle + 180) % 360) - 180);
    
    if (diff < 15) {
      handleVerification({ type: 'rotate', angle: userAngle });
    } else {
      setAttempts(prev => prev + 1);
      setError('角度不正确，请重试');
      setRotationAngle(0);
    }
  };

  const handleSubmit = () => {
    if (type === 'slider') {
      handleSliderComplete();
    } else if (type === 'rotate') {
      handleRotationComplete();
    } else {
      handleVerification({
        type,
        selected: selectedImages,
        attempts
      });
    }
  };

  const renderImageCaptcha = () => (
    <div className="captcha-images-grid">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
        <div
          key={index}
          className={`captcha-image-item ${selectedImages.includes(index) ? 'selected' : ''}`}
          onClick={() => handleImageSelect(index)}
        >
          <div className="captcha-image-placeholder">
            <span>图 {index + 1}</span>
          </div>
        </div>
      ))}
      <InlineError
        message="请选择包含指定内容的图像"
        fieldID="captcha"
      />
    </div>
  );

  const renderSliderCaptcha = () => (
    <div className="captcha-slider-container">
      <div className="captcha-slider-track">
        <div className="captcha-slider-target">
          <div className="target-indicator" />
        </div>
        <div
          className="captcha-slider-handle"
          style={{ left: `${sliderPosition}%` }}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => {
            setIsDragging(false);
            handleSliderComplete();
          }}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => {
            setIsDragging(false);
            handleSliderComplete();
          }}
        >
          <span className="slider-arrow">→</span>
        </div>
      </div>
      <p className="captcha-slider-hint">拖动滑块到正确位置</p>
    </div>
  );

  const renderGridCaptcha = () => (
    <div className="captcha-grid-container">
      <div className="captcha-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <div
            key={index}
            className={`captcha-grid-item ${selectedImages.includes(index) ? 'selected' : ''}`}
            onClick={() => handleImageSelect(index)}
          >
            <div className="grid-placeholder">图 {index + 1}</div>
          </div>
        ))}
      </div>
      <p className="captcha-grid-hint">选择所有包含 "汽车" 的图像</p>
    </div>
  );

  const renderConcatCaptcha = () => (
    <div className="captcha-concat-container">
      <div className="captcha-concat-sequence">
        <p>请按顺序点击：1 → 2 → 3 → 4</p>
      </div>
      <div className="captcha-concat-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <div
            key={index}
            className={`captcha-concat-item ${selectedImages.includes(index) ? 'clicked' : ''}`}
            onClick={() => handleImageSelect(index)}
          >
            <div className="concat-placeholder">{index + 1}</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderIconCaptcha = () => (
    <div className="captcha-icon-container">
      <p className="captcha-icon-hint">请点击所有包含 "苹果" 图标的图像</p>
      <div className="captcha-icon-grid">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
          <div
            key={index}
            className={`captcha-icon-item ${selectedImages.includes(index) ? 'selected' : ''}`}
            onClick={() => handleImageSelect(index)}
          >
            <div className="icon-placeholder">🍎</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRotateCaptcha = () => (
    <div className="captcha-rotate-container">
      <div className="captcha-rotate-image">
        <div 
          className="rotate-handle"
          onMouseDown={(e) => {
            let startAngle = rotationAngle;
            let startY = e.clientY;
            
            const handleMove = (moveEvent) => {
              const deltaY = moveEvent.clientY - startY;
              setRotationAngle(startAngle + deltaY);
            };
            
            const handleUp = () => {
              document.removeEventListener('mousemove', handleMove);
              document.removeEventListener('mouseup', handleUp);
            };
            
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
          }}
          style={{ transform: `rotate(${rotationAngle}deg)` }}
        >
          <div className="rotate-indicator">↻</div>
        </div>
      </div>
      <RangeSlider
        label="旋转角度"
        value={rotationAngle}
        onChange={setRotationAngle}
        min={0}
        max={360}
        output
      />
      <Button onClick={handleRotationComplete}>确认旋转</Button>
    </div>
  );

  const renderCaptchaContent = () => {
    switch (type) {
      case 'image':
        return renderImageCaptcha();
      case 'slider':
        return renderSliderCaptcha();
      case 'grid':
        return renderGridCaptcha();
      case 'concat':
        return renderConcatCaptcha();
      case 'icon':
        return renderIconCaptcha();
      case 'rotate':
        return renderRotateCaptcha();
      default:
        return renderImageCaptcha();
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="captcha-loading">
            <Spinner size="large" />
            <p>正在加载验证码...</p>
          </div>
        );
      
      case 'ready':
        return (
          <div className="captcha-content">
            <div className="captcha-header">
              <h3>CaptchaX 验证码</h3>
              <span className="captcha-type-badge">{type}</span>
            </div>
            
            {error && (
              <Banner
                title="验证失败"
                status="warning"
                onDismiss={() => setError(null)}
              >
                {error}
              </Banner>
            )}
            
            {renderCaptchaContent()}
            
            <div className="captcha-footer">
              <p className="captcha-attempts">
                尝试次数: {attempts}
              </p>
              <Button 
                onClick={handleSubmit}
                disabled={type !== 'slider' && type !== 'rotate' && selectedImages.length === 0}
              >
                验证
              </Button>
            </div>
          </div>
        );
      
      case 'verifying':
        return (
          <div className="captcha-verifying">
            <Spinner size="large" />
            <p>正在验证...</p>
          </div>
        );
      
      case 'success':
        return (
          <div className="captcha-success">
            <Banner
              title="验证成功"
              status="success"
            >
              验证码验证通过
            </Banner>
            {onClose && (
              <Button onClick={onClose}>关闭</Button>
            )}
          </div>
        );
      
      case 'error':
        return (
          <div className="captcha-error">
            <Banner
              title="加载失败"
              status="critical"
            >
              {error || '验证码加载失败，请重试'}
            </Banner>
            <Button onClick={initializeCaptcha}>重试</Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div 
      ref={widgetRef}
      className={`captcha-widget captcha-widget-${position} captcha-widget-${theme}`}
      data-captcha-type={type}
    >
      <Card>
        {renderContent()}
      </Card>
    </div>
  );
};

export default CaptchaWidget;
