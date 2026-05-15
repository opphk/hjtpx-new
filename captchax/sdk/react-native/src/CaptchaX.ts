import {
  CaptchaConfig,
  CaptchaType,
  CaptchaResponse,
  VerifyRequest,
  VerifyResponse,
} from './types';

class CaptchaX {
  private baseUrl: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: CaptchaConfig) {
    this.baseUrl = config.baseUrl || 'https://captchax.example.com';
    this.timeout = config.timeout || 30000;
    this.headers = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
      throw new Error('Unknown error occurred');
    }
  }

  async getCaptcha(type: CaptchaType): Promise<CaptchaResponse> {
    try {
      const response = await this.request<CaptchaResponse>(
        `/api/v1/captcha/${type}`,
        {
          method: 'POST',
        }
      );
      return response;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get captcha',
      };
    }
  }

  async verifyCaptcha(request: VerifyRequest): Promise<VerifyResponse> {
    try {
      const response = await this.request<VerifyResponse>(
        `/api/v1/captcha/${this.inferCaptchaType(request)}/verify`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed',
      };
    }
  }

  private inferCaptchaType(request: VerifyRequest): CaptchaType {
    const response = request.userResponse;
    if ('offsetX' in response && 'track' in response) {
      return 'slider';
    }
    if ('positions' in response) {
      return 'click';
    }
    if ('angle' in response) {
      return 'rotate';
    }
    if ('text' in response) {
      return 'text';
    }
    if ('selectedIcons' in response) {
      return 'icon';
    }
    return 'puzzle';
  }

  async verifySliderCaptcha(
    captchaId: string,
    offsetX: number,
    track: any[]
  ): Promise<VerifyResponse> {
    return this.verifyCaptcha({
      captchaId,
      track,
      userResponse: {
        offsetX,
        track,
      },
    });
  }

  async verifyClickCaptcha(
    captchaId: string,
    positions: Array<{ x: number; y: number }>,
    track: any[]
  ): Promise<VerifyResponse> {
    return this.verifyCaptcha({
      captchaId,
      track,
      userResponse: {
        positions,
        track,
      },
    });
  }

  async verifyRotateCaptcha(
    captchaId: string,
    angle: number,
    track: any[]
  ): Promise<VerifyResponse> {
    return this.verifyCaptcha({
      captchaId,
      track,
      userResponse: {
        angle,
        track,
      },
    });
  }

  async verifyTextCaptcha(
    captchaId: string,
    text: string,
    track: any[]
  ): Promise<VerifyResponse> {
    return this.verifyCaptcha({
      captchaId,
      track,
      userResponse: {
        text,
        track,
      },
    });
  }

  async verifyIconCaptcha(
    captchaId: string,
    selectedIcons: number[],
    track: any[]
  ): Promise<VerifyResponse> {
    return this.verifyCaptcha({
      captchaId,
      track,
      userResponse: {
        selectedIcons,
        track,
      },
    });
  }

  async verifyPuzzleCaptcha(
    captchaId: string,
    offsetX: number,
    offsetY: number,
    track: any[]
  ): Promise<VerifyResponse> {
    return this.verifyCaptcha({
      captchaId,
      track,
      userResponse: {
        offsetX,
        offsetY,
        track,
      },
    });
  }

  updateConfig(config: Partial<CaptchaConfig>): void {
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    }
    if (config.timeout !== undefined) {
      this.timeout = config.timeout;
    }
    if (config.headers) {
      this.headers = { ...this.headers, ...config.headers };
    }
  }
}

export default CaptchaX;
export { CaptchaX };
