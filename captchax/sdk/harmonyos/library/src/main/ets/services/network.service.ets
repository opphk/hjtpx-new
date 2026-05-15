import http from '@ohos.net.http';
import { CaptchaConfig, CaptchaResponse } from '../types/captcha.types';

export class NetworkService {
  private baseUrl: string;
  private timeout: number;
  private retryCount: number;
  private retryDelay: number;

  constructor(config?: CaptchaConfig) {
    this.baseUrl = config?.baseUrl || 'http://localhost:3000';
    this.timeout = config?.timeout || 30000;
    this.retryCount = config?.retryCount || 3;
    this.retryDelay = config?.retryDelay || 1000;
  }

  async request<T>(url: string, method: string = 'GET', data?: any, headers?: Record<string, string>): Promise<CaptchaResponse<T>> {
    let lastError: Error | null = null;

    for (let i = 0; i < this.retryCount; i++) {
      try {
        const result = await this.executeRequest<T>(url, method, data, headers);
        return result;
      } catch (error) {
        lastError = error as Error;
        if (i < this.retryCount - 1) {
          await this.delay(this.retryDelay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Network request failed'
    };
  }

  private async executeRequest<T>(
    url: string,
    method: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<CaptchaResponse<T>> {
    const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

    const httpRequest = http.createHttp();
    try {
      const options: http.HttpRequestOptions = {
        method: method === 'POST' ? http.RequestMethod.POST : http.RequestMethod.GET,
        header: {
          'Content-Type': 'application/json',
          ...headers
        },
        expectDataType: http.HttpDataType.JSON,
        connectTimeout: this.timeout,
        readTimeout: this.timeout
      };

      if (data && method === 'POST') {
        options.extraData = JSON.stringify(data);
      }

      const response = await httpRequest.request(fullUrl, options);
      const result = response.result as CaptchaResponse<T>;

      return {
        success: response.responseCode === 200,
        data: result?.data,
        error: result?.error,
        message: result?.message
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message
      };
    } finally {
      httpRequest.destroy();
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateConfig(config: CaptchaConfig): void {
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    if (config.timeout) {
      this.timeout = config.timeout;
    }
    if (config.retryCount) {
      this.retryCount = config.retryCount;
    }
    if (config.retryDelay) {
      this.retryDelay = config.retryDelay;
    }
  }
}
