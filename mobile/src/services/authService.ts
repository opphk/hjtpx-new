import { apiClient, get, post, handleApiError } from '../api/client';
import {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
} from '../types';

// 认证服务类
class AuthService {
  // 用户登录
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await post<AuthResponse>('/auth/login', credentials);
      if (response.success && response.data) {
        await this.saveAuthData(response.data);
        return response.data;
      }
      throw new Error(response.message || '登录失败');
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }

  // 用户注册
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await post<AuthResponse>('/auth/register', userData);
      if (response.success && response.data) {
        await this.saveAuthData(response.data);
        return response.data;
      }
      throw new Error(response.message || '注册失败');
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }

  // 退出登录
  async logout(): Promise<void> {
    try {
      await post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await this.clearAuthData();
    }
  }

  // 获取当前用户信息
  async getCurrentUser(): Promise<User> {
    try {
      const response = await get<User>('/auth/me');
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || '获取用户信息失败');
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }

  // 刷新Token
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const response = await post<AuthResponse>('/auth/refresh', {
        refreshToken,
      });
      if (response.success && response.data) {
        await this.saveAuthData(response.data);
        return response.data;
      }
      throw new Error(response.message || '刷新Token失败');
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }

  // 检查是否已登录
  async checkAuth(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }

  // 保存认证数据到本地存储
  private async saveAuthData(data: AuthResponse): Promise<void> {
    try {
      // 在实际应用中，这里会使用AsyncStorage或SecureStorage保存数据
      console.log('Saving auth data:', {
        user: data.user,
        token: data.token.substring(0, 20) + '...',
      });
    } catch (error) {
      console.error('Error saving auth data:', error);
      throw error;
    }
  }

  // 清除本地存储的认证数据
  private async clearAuthData(): Promise<void> {
    try {
      console.log('Clearing auth data');
    } catch (error) {
      console.error('Error clearing auth data:', error);
    }
  }

  // 从本地存储获取Token
  private async getStoredToken(): Promise<string | null> {
    try {
      return null;
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  }

  // 更新用户信息
  async updateProfile(userData: Partial<User>): Promise<User> {
    try {
      const response = await post<User>('/auth/profile', userData);
      if (response.success && response.data) {
        return response.data;
      }
      throw new Error(response.message || '更新用户信息失败');
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }

  // 修改密码
  async changePassword(
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    try {
      const response = await post('/auth/change-password', {
        oldPassword,
        newPassword,
      });
      if (!response.success) {
        throw new Error(response.message || '修改密码失败');
      }
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }

  // 发送重置密码邮件
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await post('/auth/forgot-password', { email });
      if (!response.success) {
        throw new Error(response.message || '发送重置密码邮件失败');
      }
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }

  // 重置密码
  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      const response = await post('/auth/reset-password', {
        token,
        newPassword,
      });
      if (!response.success) {
        throw new Error(response.message || '重置密码失败');
      }
    } catch (error) {
      throw new Error(handleApiError(error as any));
    }
  }
}

// 导出单例实例
export const authService = new AuthService();
