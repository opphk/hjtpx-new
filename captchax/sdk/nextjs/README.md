# CaptchaX Next.js Integration Package

Complete Next.js 15 integration for CaptchaX captcha verification service.

## Features

- **Next.js 15 Support** - Full compatibility with Next.js 15 and React 19
- **Server Components** - Server-side verification and data fetching
- **Client Components** - Interactive captcha components
- **Server Actions** - Form handling and verification with Server Actions
- **Middleware Support** - Route protection and API verification
- **TypeScript** - Complete type definitions
- **Multiple Captcha Types** - Slider, click, puzzle, rotate, text, icon
- **App Router** - Optimized App Router components

## Installation

```bash
npm install @captchax/nextjs
# or
yarn add @captchax/nextjs
# or
pnpm add @captchax/nextjs
```

## Environment Setup

Create `.env.local` file:

```bash
# Client-side configuration
NEXT_PUBLIC_CAPTCHA_API_KEY=your_api_key
NEXT_PUBLIC_CAPTCHA_SERVER_URL=http://localhost:3000

# Server-side configuration
CAPTCHA_API_KEY=your_api_key
CAPTCHA_API_SECRET=your_api_secret
CAPTCHA_SERVER_URL=http://localhost:3000
```

## Quick Start

### 1. Add Provider

Create `app/providers.tsx`:

```typescript
'use client';

import { CaptchaProvider } from '@captchax/nextjs';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CaptchaProvider 
      apiKey={process.env.NEXT_PUBLIC_CAPTCHA_API_KEY!}
      serverUrl={process.env.NEXT_PUBLIC_CAPTCHA_SERVER_URL}
      theme="light"
      locale="zh-CN"
    >
      {children}
    </CaptchaProvider>
  );
}
```

Update `app/layout.tsx`:

```typescript
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### 2. Use Captcha Components

#### CaptchaButton - Basic Button Verification

```typescript
'use client';

import { CaptchaButton } from '@captchax/nextjs';

export default function LoginPage() {
  const handleSuccess = (token: string) => {
    console.log('Verified:', token);
  };
  
  return (
    <CaptchaButton 
      scene="login"
      onSuccess={handleSuccess}
      text="点击验证"
      size="large"
      variant="primary"
    />
  );
}
```

#### CaptchaSlider - Slider Verification

```typescript
'use client';

import { CaptchaSlider } from '@captchax/nextjs';
import { useState } from 'react';

export default function RegisterPage() {
  const [token, setToken] = useState<string | null>(null);

  const handleSuccess = (newToken: string) => {
    setToken(newToken);
  };

  return (
    <div>
      <h1>注册</h1>
      <CaptchaSlider
        scene="register"
        onSuccess={handleSuccess}
        width={300}
        height={150}
        difficulty="medium"
      />
    </div>
  );
}
```

#### CaptchaClick - Click Verification

```typescript
'use client';

import { CaptchaClick } from '@captchax/nextjs';

export default function CommentPage() {
  const handleSuccess = (token: string) => {
    console.log('Click verified:', token);
  };

  return (
    <CaptchaClick
      scene="comment"
      onSuccess={handleSuccess}
      targetCount={4}
    />
  );
}
```

#### CaptchaPuzzle - Puzzle Verification

```typescript
'use client';

import { CaptchaPuzzle } from '@captchax/nextjs';

export default function CheckoutPage() {
  const handleSuccess = (token: string) => {
    console.log('Puzzle verified:', token);
  };

  return (
    <CaptchaPuzzle
      scene="checkout"
      onSuccess={handleSuccess}
      width={300}
      height={200}
    />
  );
}
```

#### CaptchaRotate - Rotation Verification

```typescript
'use client';

import { CaptchaRotate } from '@captchax/nextjs';

export default function FeedbackPage() {
  const handleSuccess = (token: string) => {
    console.log('Rotate verified:', token);
  };

  return (
    <CaptchaRotate
      scene="feedback"
      onSuccess={handleSuccess}
      targetAngle={45}
      tolerance={10}
    />
  );
}
```

#### CaptchaText - Text Verification

```typescript
'use client';

import { CaptchaText } from '@captchax/nextjs';

export default function ContactPage() {
  const handleSuccess = (token: string) => {
    console.log('Text verified:', token);
  };

  return (
    <CaptchaText
      scene="contact"
      onSuccess={handleSuccess}
      caseSensitive={false}
      maxLength={6}
    />
  );
}
```

#### CaptchaIcon - Icon Verification

```typescript
'use client';

import { CaptchaIcon } from '@captchax/nextjs';

export default function SurveyPage() {
  const handleSuccess = (token: string) => {
    console.log('Icon verified:', token);
  };

  return (
    <CaptchaIcon
      scene="survey"
      onSuccess={handleSuccess}
      gridSize={3}
    />
  );
}
```

### 3. Use Hooks

#### useCaptcha Hook

```typescript
'use client';

import { useCaptcha } from '@captchax/nextjs';

export default function FormPage() {
  const { token, loading, error, isVerified, verify, reset } = useCaptcha({
    scene: 'form',
    onSuccess: (token) => console.log('Verified:', token)
  });

  return (
    <div>
      <button onClick={verify} disabled={loading || isVerified}>
        {loading ? '验证中...' : isVerified ? '已验证' : '验证'}
      </button>
      {token && <p>Token: {token}</p>}
      <button onClick={reset}>重置</button>
    </div>
  );
}
```

#### useCaptchaVerify Hook

```typescript
'use client';

import { useCaptchaVerify } from '@captchax/nextjs';

export default function LoginForm() {
  const { token, loading, error, isVerified, verify } = useCaptchaVerify({
    scene: 'login',
    apiKey: process.env.NEXT_PUBLIC_CAPTCHA_API_KEY,
    serverUrl: process.env.NEXT_PUBLIC_CAPTCHA_SERVER_URL
  });

  return (
    <form>
      <button onClick={verify} disabled={loading}>
        {loading ? '验证中...' : '登录'}
      </button>
    </form>
  );
}
```

### 4. Use Server Actions

#### Basic Verification

```typescript
// app/actions.ts
'use server';

import { verifyCaptchaAction } from '@captchax/nextjs/server-actions';

export async function handleFormSubmit(formData: FormData) {
  const token = formData.get('captchaToken') as string;
  
  const result = await verifyCaptchaAction({
    token,
    scene: 'form',
    required: true
  });

  if (!result.success) {
    return { error: result.message };
  }

  return { success: true };
}
```

#### Form Submission

```typescript
// app/actions.ts
'use server';

import { submitFormAction } from '@captchax/nextjs/server-actions';

export async function registerAction(formData: FormData) {
  const result = await submitFormAction({
    data: {
      email: formData.get('email'),
      password: formData.get('password')
    },
    captchaToken: formData.get('captchaToken') as string,
    scene: 'register',
    validate: async (data) => {
      const errors: Record<string, string> = {};
      
      if (!data.email) {
        errors.email = '邮箱不能为空';
      }
      
      return errors;
    }
  });

  return result;
}
```

#### Login/Register Actions

```typescript
// app/actions.ts
'use server';

import { loginAction, registerAction } from '@captchax/nextjs/server-actions';

export async function handleLogin(formData: FormData) {
  const result = await loginAction({
    username: formData.get('username') as string,
    password: formData.get('password') as string,
    captchaToken: formData.get('captchaToken') as string
  });

  return result;
}

export async function handleRegister(formData: FormData) {
  const result = await registerAction({
    username: formData.get('username') as string,
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    captchaToken: formData.get('captchaToken') as string
  });

  return result;
}
```

#### Comment Action

```typescript
// app/actions.ts
'use server';

import { commentAction } from '@captchax/nextjs/server-actions';

export async function handleComment(formData: FormData) {
  const result = await commentAction({
    content: formData.get('content') as string,
    postId: formData.get('postId') as string,
    captchaToken: formData.get('captchaToken') as string
  });

  return result;
}
```

### 5. Server-Side Verification

#### Server Components

```typescript
import { verifyCaptcha } from '@captchax/nextjs/server';

export default async function LoginPage({
  searchParams
}: {
  searchParams: { token?: string }
}) {
  if (searchParams.token) {
    const result = await verifyCaptcha(searchParams.token, {
      scene: 'login'
    });
    
    if (result.success) {
      console.log('Verified on server:', result.score);
    }
  }
  
  return <div>登录页面</div>;
}
```

#### API Routes

```typescript
// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha } from '@captchax/nextjs/server';

export async function POST(request: NextRequest) {
  const { token, scene } = await request.json();

  const result = await verifyCaptcha(token, {
    scene: scene || 'default'
  });

  if (result.success) {
    return NextResponse.json({ 
      success: true,
      score: result.score,
      riskLevel: result.riskLevel
    });
  }

  return NextResponse.json({ 
    success: false, 
    error: result.error 
  }, { status: 400 });
}
```

### 6. Middleware Protection

Create `middleware.ts`:

```typescript
import { captchaMiddleware } from '@captchax/nextjs/middleware';

export default captchaMiddleware;

export const config = {
  matcher: ['/login/:path*', '/register/:path*', '/checkout/:path*']
};
```

Custom Configuration:

```typescript
import { createCaptchaMiddleware } from '@captchax/nextjs/middleware';

const captchaMiddleware = createCaptchaMiddleware({
  apiKey: process.env.CAPTCHA_API_KEY,
  apiSecret: process.env.CAPTCHA_API_SECRET,
  serverUrl: process.env.CAPTCHA_SERVER_URL,
  protectedPaths: ['/api/*'],
  captchaPaths: ['/login', '/register', '/checkout'],
  bypassPaths: ['/api/health', '/api/public'],
  tokenCookieName: 'captcha_token',
  tokenHeaderName: 'x-captcha-token'
});

export default captchaMiddleware;

export const config = {
  matcher: ['/login/:path*', '/register/:path*']
};
```

## API Reference

### Provider

#### CaptchaProvider

```typescript
interface CaptchaProviderProps {
  children: React.ReactNode;
  apiKey: string;
  serverUrl?: string;
  locale?: string;
  theme?: 'light' | 'dark' | 'auto';
  errorBoundary?: boolean;
  onError?: (error: Error) => void;
}
```

### Components

#### CaptchaButton

```typescript
interface CaptchaButtonProps {
  children?: React.ReactNode;
  scene?: string;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  text?: string;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  serverUrl?: string;
  apiKey?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary' | 'secondary' | 'outline';
  loadingText?: string;
  successText?: string;
}
```

#### CaptchaSlider

```typescript
interface CaptchaSliderProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  scene?: string;
  backgroundImage?: string;
  sliderImage?: string;
  width?: number;
  height?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}
```

#### CaptchaDialog

```typescript
interface CaptchaDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  scene?: string;
  type?: CaptchaType;
  title?: string;
  description?: string;
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  width?: string | number;
  height?: string | number;
}
```

### Hooks

#### useCaptcha

```typescript
const { 
  token, 
  loading, 
  error, 
  isVerified, 
  verify, 
  reset 
} = useCaptcha({
  scene: 'login',
  onSuccess: (token) => console.log(token),
  onError: (error) => console.error(error),
  serverUrl: 'https://api.captchax.com',
  apiKey: 'your_api_key',
  autoVerify: false
});
```

#### useCaptchaVerify

```typescript
const { 
  token, 
  loading, 
  error, 
  isVerified, 
  verify, 
  reset 
} = useCaptchaVerify({
  scene: 'login',
  apiKey: 'your_api_key',
  serverUrl: 'https://api.captchax.com'
});
```

### Server Actions

#### verifyCaptchaAction

```typescript
const result = await verifyCaptchaAction({
  token: 'user_captcha_token',
  scene: 'login',
  required: true
});
```

#### submitFormAction

```typescript
const result = await submitFormAction({
  data: { email: 'test@example.com' },
  captchaToken: 'user_captcha_token',
  scene: 'form',
  validate: async (data) => {
    const errors: Record<string, string> = {};
    if (!data.email) errors.email = 'Required';
    return errors;
  }
});
```

#### loginAction

```typescript
const result = await loginAction({
  username: 'user',
  password: 'pass',
  captchaToken: 'user_captcha_token'
});
```

#### registerAction

```typescript
const result = await registerAction({
  username: 'user',
  email: 'test@example.com',
  password: 'pass',
  captchaToken: 'user_captcha_token'
});
```

#### commentAction

```typescript
const result = await commentAction({
  content: 'Great post!',
  postId: 'post_123',
  captchaToken: 'user_captcha_token'
});
```

### Server

#### CaptchaXServer

```typescript
import { CaptchaXServer } from '@captchax/nextjs/server';

const client = new CaptchaXServer({
  apiKey: 'your_api_key',
  apiSecret: 'your_api_secret',
  serverUrl: 'https://api.captchax.com',
  timeout: 5000,
  retries: 3
});

const result = await client.verify({
  token: 'user_token',
  scene: 'login',
  ip: 'user_ip',
  userAgent: 'user_agent'
});
```

## Captcha Types

| Type | Description | Use Case |
|------|-------------|----------|
| slider | Slider captcha | User registration, login |
| click | Click captcha | Comments, posts |
| puzzle | Puzzle captcha | Sensitive operations |
| rotate | Rotation captcha | Advanced verification |
| text | Text captcha | Form verification |
| icon | Icon captcha | Surveys |

## Examples

See the `examples/app-router-example` directory for complete examples:

- `app/home/page.tsx` - Basic button and hook examples
- `app/slider/page.tsx` - Slider captcha examples
- `app/click/page.tsx` - Click captcha examples
- `app/login/page.tsx` - Login form with verification
- `app/api/captcha/verify/route.ts` - API verification route
- `app/api/captcha/actions/route.ts` - Server actions example

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Type check
npm run lint

# Format
npm run format
```

## Testing

The project uses Jest for testing:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- client.test.ts
```

## CaptchaX API Configuration

- Development: http://localhost:3000
- Production: https://captchax.example.com

## License

MIT License

## Support

- Documentation: https://docs.captchax.com
- GitHub: https://github.com/captchax/nextjs
- Email: support@captchax.com
