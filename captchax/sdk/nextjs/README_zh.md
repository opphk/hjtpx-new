# CaptchaX Next.js 集成包

CaptchaX 的官方 Next.js 15 集成包，提供完整的 Server Components、Client Components、Server Actions 和中间件支持。

## 特性

- ✅ **Next.js 15 支持** - 完美支持 Next.js 15 和 React 19
- ✅ **Server Components** - 服务端验证和数据获取
- ✅ **Client Components** - 交互式验证码组件
- ✅ **Server Actions** - 表单处理和验证的 Server Actions
- ✅ **中间件支持** - 路由保护和 API 验证
- ✅ **TypeScript** - 完整的类型定义
- ✅ **多种验证码类型** - 滑块、点选、拼图、旋转、文字、图标
- ✅ **App Router** - 优化的 App Router 组件

## 安装

```bash
npm install @captchax/nextjs
# 或
yarn add @captchax/nextjs
# 或
pnpm add @captchax/nextjs
```

## 环境配置

### 1. 配置环境变量

创建 `.env.local` 文件：

```bash
# 客户端配置
NEXT_PUBLIC_CAPTCHA_API_KEY=your_api_key
NEXT_PUBLIC_CAPTCHA_SERVER_URL=http://localhost:3000

# 服务端配置
CAPTCHA_API_KEY=your_api_key
CAPTCHA_API_SECRET=your_api_secret
CAPTCHA_SERVER_URL=http://localhost:3000
```

### 2. 开发环境配置

```bash
# .env.development
NEXT_PUBLIC_CAPTCHA_SERVER_URL=http://localhost:3000
CAPTCHA_SERVER_URL=http://localhost:3000
```

### 3. 生产环境配置

```bash
# .env.production
NEXT_PUBLIC_CAPTCHA_SERVER_URL=https://captchax.example.com
CAPTCHA_SERVER_URL=https://captchax.example.com
```

## 快速开始

### 1. 添加 Provider

创建 `app/providers.tsx`：

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

在 `app/layout.tsx` 中使用：

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

### 2. 使用验证码组件

#### CaptchaButton - 基础按钮验证

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

#### CaptchaSlider - 滑块验证

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

#### CaptchaClick - 点选验证

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

#### CaptchaPuzzle - 拼图验证

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

#### CaptchaRotate - 旋转验证

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

#### CaptchaText - 文字验证

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

#### CaptchaIcon - 图标验证

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

### 3. 使用 Hooks

#### useCaptcha - 基础 Hook

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

#### useCaptchaVerify - 验证 Hook

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

### 4. 使用 Server Actions

#### 验证码验证

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

#### 表单提交

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

#### 登录和注册

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

#### 评论提交

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

### 5. 服务端验证

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

### 6. 中间件保护

创建 `middleware.ts`：

```typescript
import { captchaMiddleware } from '@captchax/nextjs/middleware';

export default captchaMiddleware;

export const config = {
  matcher: ['/login/:path*', '/register/:path*', '/checkout/:path*']
};
```

自定义配置：

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

## API 参考

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

### 组件

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

### 服务端

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

## 验证码类型

| 类型 | 说明 | 适用场景 |
|------|------|----------|
| slider | 滑块验证码 | 用户注册、登录 |
| click | 点选验证码 | 评论、发帖 |
| puzzle | 拼图验证码 | 敏感操作 |
| rotate | 旋转验证码 | 高级验证 |
| text | 文字验证码 | 表单验证 |
| icon | 图标验证码 | 问卷调查 |

## 示例项目

参考 `examples/app-router-example` 目录下的完整示例：

- `app/home/page.tsx` - 基础按钮和 Hook 示例
- `app/slider/page.tsx` - 滑块验证码示例
- `app/click/page.tsx` - 点选验证码示例
- `app/login/page.tsx` - 登录表单验证示例
- `app/api/captcha/verify/route.ts` - API 验证路由
- `app/api/captcha/actions/route.ts` - Server Actions 示例

## 开发

```bash
# 安装依赖
npm install

# 构建
npm run build

# 测试
npm test

# 类型检查
npm run lint

# 格式化
npm run format
```

## 测试

项目使用 Jest 进行测试：

```bash
# 运行所有测试
npm test

# 运行测试并监视变化
npm test -- --watch

# 运行特定测试文件
npm test -- client.test.ts
```

## CaptchaX API 配置

- 开发环境: http://localhost:3000
- 生产环境: https://captchax.example.com

## 许可证

MIT License

## 支持

- 文档: https://docs.captchax.com
- GitHub: https://github.com/captchax/nextjs
- 邮箱: support@captchax.com
