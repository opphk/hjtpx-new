'use client';

import { useState } from 'react';
import { CaptchaProvider, CaptchaSlider } from '@captchax/nextjs';

export default function SliderExamplePage() {
  return (
    <CaptchaProvider 
      apiKey={process.env.NEXT_PUBLIC_CAPTCHA_API_KEY!}
      serverUrl={process.env.NEXT_PUBLIC_CAPTCHA_SERVER_URL}
    >
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' }}>
          滑块验证码示例
        </h1>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            基础滑块验证
          </h2>
          <BasicSliderExample />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            不同难度
          </h2>
          <DifficultyExamples />
        </section>
      </div>
    </CaptchaProvider>
  );
}

function BasicSliderExample() {
  const [token, setToken] = useState<string | null>(null);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
    console.log('Slider verified:', newToken);
  };

  const handleError = (error: Error) => {
    console.error('Slider error:', error);
  };

  return (
    <div>
      <CaptchaSlider
        scene="slider-basic"
        onSuccess={handleSuccess}
        onError={handleError}
        width={350}
        height={180}
        difficulty="medium"
      />
      {token && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#d1fae5', borderRadius: '6px' }}>
          <p style={{ color: '#059669', fontWeight: '500' }}>验证成功！</p>
          <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>Token: {token}</p>
        </div>
      )}
    </div>
  );
}

function DifficultyExamples() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          简单模式
        </h3>
        <SliderWithToken scene="slider-easy" difficulty="easy" />
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          中等模式
        </h3>
        <SliderWithToken scene="slider-medium" difficulty="medium" />
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          困难模式
        </h3>
        <SliderWithToken scene="slider-hard" difficulty="hard" />
      </div>
    </div>
  );
}

function SliderWithToken({ scene, difficulty }: { scene: string; difficulty: 'easy' | 'medium' | 'hard' }) {
  const [token, setToken] = useState<string | null>(null);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
  };

  return (
    <div>
      <CaptchaSlider
        scene={scene}
        onSuccess={handleSuccess}
        width={300}
        height={150}
        difficulty={difficulty}
      />
      {token && (
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#d1fae5', borderRadius: '4px' }}>
          <p style={{ color: '#059669', fontSize: '14px' }}>已验证 ✓</p>
        </div>
      )}
    </div>
  );
}
