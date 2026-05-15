'use client';

import { useState } from 'react';
import { CaptchaProvider, CaptchaButton } from '@captchax/nextjs';
import { useCaptcha } from '@captchax/nextjs';

export default function HomePage() {
  return (
    <CaptchaProvider 
      apiKey={process.env.NEXT_PUBLIC_CAPTCHA_API_KEY!}
      serverUrl={process.env.NEXT_PUBLIC_CAPTCHA_SERVER_URL}
    >
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '24px', color: '#111827' }}>
          CaptchaX Next.js 示例
        </h1>
        
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            基础按钮验证
          </h2>
          <BasicButtonExample />
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            useCaptcha Hook
          </h2>
          <UseCaptchaExample />
        </section>
      </div>
    </CaptchaProvider>
  );
}

function BasicButtonExample() {
  const [token, setToken] = useState<string | null>(null);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
    console.log('Button verified:', newToken);
  };

  const handleError = (error: Error) => {
    console.error('Button error:', error);
  };

  return (
    <div>
      <CaptchaButton
        scene="homepage"
        onSuccess={handleSuccess}
        onError={handleError}
        text="点击验证"
        size="large"
        variant="primary"
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

function UseCaptchaExample() {
  const { token, loading, error, isVerified, verify, reset } = useCaptcha({
    scene: 'hook-example',
    onSuccess: (newToken) => console.log('Hook verified:', newToken)
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
        <button
          onClick={verify}
          disabled={loading || isVerified}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: isVerified ? '#10b981' : '#4F46E5',
            color: 'white',
            cursor: loading || isVerified ? 'default' : 'pointer',
            fontWeight: 500
          }}
        >
          {loading ? '验证中...' : isVerified ? '已验证' : '验证'}
        </button>
        
        <button
          onClick={reset}
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            border: '1px solid #d1d5db',
            backgroundColor: 'white',
            color: '#374151',
            cursor: 'pointer',
            fontWeight: 500
          }}
        >
          重置
        </button>
      </div>

      {token && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#d1fae5', borderRadius: '6px' }}>
          <p style={{ color: '#059669', fontWeight: '500' }}>Token: {token}</p>
        </div>
      )}

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#fee', borderRadius: '6px' }}>
          <p style={{ color: '#ef4444', fontWeight: '500' }}>错误: {error.message}</p>
        </div>
      )}
    </div>
  );
}
