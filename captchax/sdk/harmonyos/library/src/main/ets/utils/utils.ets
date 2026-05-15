export class Logger {
  private static readonly PREFIX = '[CaptchaX]';

  static info(message: string, ...args: any[]): void {
    console.info(`${this.PREFIX} ${message}`, ...args);
  }

  static debug(message: string, ...args: any[]): void {
    console.debug(`${this.PREFIX} ${message}`, ...args);
  }

  static warn(message: string, ...args: any[]): void {
    console.warn(`${this.PREFIX} ${message}`, ...args);
  }

  static error(message: string, ...args: any[]): void {
    console.error(`${this.PREFIX} ${message}`, ...args);
  }
}

export class Validator {
  static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static isValidCaptchaId(captchaId: string): boolean {
    return captchaId && captchaId.length > 0 && captchaId.includes('_');
  }

  static isExpired(expiresAt: string | undefined): boolean {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() <= Date.now();
  }

  static isValidToken(token: string): boolean {
    return token && token.length > 0;
  }
}

export class Formatter {
  static formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toISOString();
  }

  static formatTimeRemaining(expiresAt: string | undefined): number {
    if (!expiresAt) return 0;
    const expiresIn = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, expiresIn);
  }

  static formatErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }
    return error?.message || error?.error || 'Unknown error';
  }
}

export class DeviceUtils {
  static getDeviceType(): string {
    return 'phone';
  }

  static isTablet(): boolean {
    return false;
  }

  static isFoldable(): boolean {
    return false;
  }

  static getSafeArea(): { top: number; bottom: number; left: number; right: number } {
    return {
      top: 0,
      bottom: 0,
      left: 0,
      right: 0
    };
  }
}

export class StringUtils {
  static isEmpty(str: string | undefined | null): boolean {
    return !str || str.trim().length === 0;
  }

  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }
}

export class ArrayUtils {
  static isEmpty<T>(arr: T[] | undefined | null): boolean {
    return !arr || arr.length === 0;
  }

  static isNotEmpty<T>(arr: T[] | undefined | null): boolean {
    return arr && arr.length > 0;
  }

  static remove<T>(arr: T[], predicate: (item: T) => boolean): T[] {
    return arr.filter(item => !predicate(item));
  }

  static unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
  }
}
