// 通用工具函数库

// 格式化日期
export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
};

// 格式化相对时间
export const formatRelativeTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return '刚刚';
  if (diffMin < 60) return `${diffMin}分钟前`;
  if (diffHour < 24) return `${diffHour}小时前`;
  if (diffDay < 7) return `${diffDay}天前`;
  
  return formatDate(d, 'YYYY-MM-DD');
};

// 防抖函数
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// 节流函数
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// 深拷贝
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map((item) => deepClone(item)) as any;
  if (obj instanceof Object) {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

// 生成随机ID
export const generateId = (length: number = 16): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// 验证邮箱格式
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 验证手机号格式
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

// 脱敏处理
export const maskString = (str: string, start: number = 3, end: number = 4): string => {
  if (str.length <= start + end) return str;
  const startPart = str.substring(0, start);
  const endPart = str.substring(str.length - end);
  const maskedPart = '*'.repeat(str.length - start - end);
  return startPart + maskedPart + endPart;
};

// 格式化数字
export const formatNumber = (num: number, decimals: number = 2): string => {
  return num.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

// 金额格式化
export const formatCurrency = (amount: number, currency: string = '¥'): string => {
  return `${currency}${formatNumber(amount, 2)}`;
};

// 存储键前缀
export const StorageKeys = {
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_INFO: '@user_info',
  SETTINGS: '@settings',
} as const;

// 本地存储操作
export const storage = {
  get: async (key: string): Promise<any | null> => {
    try {
      // 在实际应用中，这里会使用AsyncStorage
      return null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  set: async (key: string, value: any): Promise<void> => {
    try {
      // 在实际应用中，这里会使用AsyncStorage
      console.log('Storage set:', key, value);
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  remove: async (key: string): Promise<void> => {
    try {
      // 在实际应用中，这里会使用AsyncStorage
      console.log('Storage remove:', key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
  clear: async (): Promise<void> => {
    try {
      // 在实际应用中，这里会使用AsyncStorage
      console.log('Storage clear');
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};
