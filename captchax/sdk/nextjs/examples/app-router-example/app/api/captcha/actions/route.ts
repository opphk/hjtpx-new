'use server';

import { verifyCaptchaAction } from '@captchax/nextjs/server-actions';
import { submitFormAction, loginAction, registerAction } from '@captchax/nextjs/server-actions';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'verify': {
        const result = await verifyCaptchaAction({
          token: data.token,
          scene: data.scene || 'default',
          required: true
        });
        return NextResponse.json(result);
      }

      case 'login': {
        const result = await loginAction({
          username: data.username,
          password: data.password,
          captchaToken: data.captchaToken
        });
        return NextResponse.json(result);
      }

      case 'register': {
        const result = await registerAction({
          username: data.username,
          email: data.email,
          password: data.password,
          captchaToken: data.captchaToken
        });
        return NextResponse.json(result);
      }

      case 'form': {
        const result = await submitFormAction({
          data: data.formData,
          captchaToken: data.captchaToken,
          scene: data.scene || 'form',
          validate: async (formData) => {
            const errors: Record<string, string> = {};
            
            if (!formData.email || !formData.email.includes('@')) {
              errors.email = '请输入有效的邮箱地址';
            }
            
            if (!formData.password || formData.password.length < 6) {
              errors.password = '密码至少需要6个字符';
            }
            
            return errors;
          }
        });
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
