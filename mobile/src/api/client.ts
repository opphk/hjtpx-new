import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';

// API配置常量
const API_BASE_URL = 'http://localhost:3000/api/v1';
const REQUEST_TIMEOUT = 10000;

// 创建API客户端实例
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: REQUEST_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  client.interceptors.request.use(
    (config) => {
      const token = getStoredToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  client.interceptors.response.use(
    (response) => {
      return response;
    },
    async (error: AxiosError<ApiResponse>) => {
      if (error.response?.status === 401) {
        // 处理401未授权错误
        await handleUnauthorized();
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// 获取存储的Token
const getStoredToken = (): string | null => {
  // 在实际应用中，这里会从AsyncStorage或SecureStorage获取token
  return null;
};

// 处理未授权情况
const handleUnauthorized = async (): Promise<void> => {
  // 清除本地存储的token
  // 导航到登录页面
  console.log('Unauthorized - should navigate to login');
};

// API响应错误处理
export const handleApiError = (error: AxiosError<ApiResponse>): string => {
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return data?.message || '请求参数错误';
      case 401:
        return '登录已过期，请重新登录';
      case 403:
        return '没有权限访问此资源';
      case 404:
        return '请求的资源不存在';
      case 422:
        return data?.message || '数据验证失败';
      case 500:
        return '服务器内部错误';
      default:
        return data?.message || '网络请求失败';
    }
  } else if (error.request) {
    return '网络连接失败，请检查网络设置';
  } else {
    return error.message || '请求配置错误';
  }
};

// API客户端实例
export const apiClient = createApiClient();

// 通用GET请求
export const get = async <T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.get<ApiResponse<T>>(url, config);
  return response.data;
};

// 通用POST请求
export const post = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.post<ApiResponse<T>>(url, data, config);
  return response.data;
};

// 通用PUT请求
export const put = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.put<ApiResponse<T>>(url, data, config);
  return response.data;
};

// 通用DELETE请求
export const del = async <T>(
  url: string,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.delete<ApiResponse<T>>(url, config);
  return response.data;
};

// 通用PATCH请求
export const patch = async <T>(
  url: string,
  data?: any,
  config?: AxiosRequestConfig
): Promise<ApiResponse<T>> => {
  const response = await apiClient.patch<ApiResponse<T>>(url, data, config);
  return response.data;
};

export default apiClient;
