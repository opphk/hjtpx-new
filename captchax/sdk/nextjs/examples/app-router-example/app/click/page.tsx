'use client';

import { useState } from 'react';
import { CaptchaProvider, CaptchaClick } from '@captchax/nextjs';

export default function ClickExamplePage() {
  return (
    <CaptchaProvider 
      apiKey={process.env.NEXT_PUBLIC_CAPTCHA_API_KEY!}
      serverUrl={process.env.NEXT_PUBLIC_CAPTCHA_SERVER_URL}
    >
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' }}>
          点选验证码示例
        </h1>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            基础点选验证
          </h2>
          <BasicClickExample />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            不同目标数量
          </h2>
          <TargetCountExamples />
        </section>
      </div>
    </CaptchaProvider>
  );
}

function BasicClickExample() {
  const [token, setToken] = useState<string | null>(null);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
    console.log('Click verified:', newToken);
  };

  const handleError = (error: Error) => {
    console.error('Click error:', error);
  };

  return (
    <div>
      <CaptchaClick
        scene="click-basic"
        onSuccess={handleSuccess}
        onError={handleError}
        targetCount={4}
        width={350}
        height={250}
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

function TargetCountExamples() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          2 个目标
        </h3>
        <ClickWithToken scene="click-2" targetCount={2} />
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          3 个目标
        </h3>
        <ClickWithToken scene="click-3" targetCount={3} />
      </div>
      <div>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#374151' }}>
          4 个目标
        </h3>
        <ClickWithToken scene="click-4" targetCount={4} />
      </div>
    </div>
  );
}

function ClickWithToken({ scene, targetCount }: { scene: string; targetCount: number }) {
  const [token, setToken] = useState<string | null>(null);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
  };

  return (
    <div>
      <CaptchaClick
        scene={scene}
        onSuccess={handleSuccess}
        targetCount={targetCount}
        width={280}
        height={200}
      />
      {token && (
        <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#d1fae5', borderRadius: '4px' }}>
          <p style={{ color: '#059669', fontSize: '14px' }}>已验证 ✓</p>
        </div>
      )}
    </div>
  );
}
