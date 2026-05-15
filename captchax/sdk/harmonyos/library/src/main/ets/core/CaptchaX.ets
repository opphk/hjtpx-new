import { NetworkService } from '../services/network.service';
import { StorageService } from '../services/storage.service';
import {
  CaptchaType,
  CaptchaConfig,
  CaptchaResponse,
  CaptchaData,
  CaptchaVerifyRequest,
  CaptchaVerifyResponse,
  CaptchaResult,
  CaptchaCallbacks
} from '../types/captcha.types';

export class CaptchaX {
  private static instance: CaptchaX;
  private networkService: NetworkService;
  private storageService: StorageService;
  private config: CaptchaConfig;
  private currentCaptchaId: string | null = null;
  private callbacks: CaptchaCallbacks = {};
  private isInitialized: boolean = false;

  private constructor(config?: CaptchaConfig) {
    this.config = config || {};
    this.networkService = new NetworkService(this.config);
    this.storageService = new StorageService();
  }

  static getInstance(config?: CaptchaConfig): CaptchaX {
    if (!CaptchaX.instance) {
      CaptchaX.instance = new CaptchaX(config);
    }
    return CaptchaX.instance;
  }

  async initialize(context: any): Promise<void> {
    if (this.isInitialized) {
      return;
    }
    await this.storageService.init(context);
    this.isInitialized = true;
    this.callbacks.onReady?.();
  }

  updateConfig(config: CaptchaConfig): void {
    this.config = { ...this.config, ...config };
    this.networkService.updateConfig(config);
  }

  setCallbacks(callbacks: CaptchaCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  async getCaptcha(type: CaptchaType): Promise<CaptchaResponse<CaptchaData>> {
    const response = await this.networkService.request<CaptchaData>(
      `/api/v1/captcha/${type}`,
      'POST',
      { locale: this.config.locale }
    );

    if (response.success && response.data) {
      this.currentCaptchaId = response.data.captchaId;
      await this.cacheCaptcha(response.data);
    }

    return response;
  }

  async verify(request: CaptchaVerifyRequest): Promise<CaptchaResult> {
    if (!request.captchaId) {
      request.captchaId = this.currentCaptchaId || '';
    }

    const response = await this.networkService.request<CaptchaVerifyResponse>(
      `/api/v1/captcha/${this.getCaptchaTypeFromId(request.captchaId)}/verify`,
      'POST',
      request
    );

    const result: CaptchaResult = {
      verified: response.success && response.data?.success === true,
      token: response.data?.token,
      message: response.data?.message || response.error || ''
    };

    this.callbacks.onVerify?.(result);
    return result;
  }

  async refresh(type: CaptchaType): Promise<CaptchaResponse<CaptchaData>> {
    return this.getCaptcha(type);
  }

  async getToken(): Promise<string | null> {
    return await this.storageService.get('captcha_token');
  }

  async setToken(token: string): Promise<void> {
    await this.storageService.set('captcha_token', token);
  }

  async clearToken(): Promise<void> {
    await this.storageService.remove('captcha_token');
  }

  close(): void {
    this.currentCaptchaId = null;
    this.callbacks.onClose?.();
  }

  private async cacheCaptcha(data: CaptchaData): Promise<void> {
    await this.storageService.set(`captcha_${data.captchaId}`, JSON.stringify(data));

    if (data.expiresAt) {
      const expiresIn = new Date(data.expiresAt).getTime() - Date.now();
      if (expiresIn > 0) {
        setTimeout(() => {
          this.callbacks.onExpire?.();
        }, expiresIn);
      }
    }
  }

  private getCaptchaTypeFromId(captchaId: string): string {
    const parts = captchaId.split('_');
    return parts.length > 0 ? parts[0] : 'slider';
  }

  getCurrentCaptchaId(): string | null {
    return this.currentCaptchaId;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
}

export default CaptchaX;
