export type CaptchaType = 'slider' | 'click' | 'puzzle' | 'rotate' | 'text' | 'icon';

export type CaptchaSize = 'small' | 'medium' | 'large';

export type CaptchaTheme = 'light' | 'dark';

export interface CaptchaConfig {
  apiKey: string;
  apiSecret: string;
  serverUrl: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface CaptchaResult {
  token: string;
  expiresAt: number;
  scene: string;
  timestamp: number;
}

export interface CaptchaVerifyOptions {
  scene?: string;
  type?: CaptchaType;
  timeout?: number;
}

export interface CaptchaButtonProps {
  scene?: string;
  text?: string;
  size?: CaptchaSize;
  theme?: CaptchaTheme;
  disabled?: boolean;
  block?: boolean;
  icon?: string;
  loadingText?: string;
}

export interface CaptchaDialogProps {
  visible: boolean;
  type?: CaptchaType;
  title?: string;
  targetImage?: string;
  sliderImage?: string;
  width?: string | number;
  showClose?: boolean;
  maskClosable?: boolean;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
}

export interface CaptchaSliderProps {
  targetImage?: string;
  sliderImage?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  showTips?: boolean;
  tipsText?: string;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  onChange?: (distance: number) => void;
}

export interface CaptchaClickProps {
  targetImage?: string;
  clickImages?: string[];
  maxClicks?: number;
  requiredCount?: number;
  showClickCount?: boolean;
  showTips?: boolean;
  onSuccess?: (token: string, clicks: ClickPoint[]) => void;
  onError?: (error: Error) => void;
  onClick?: (point: ClickPoint) => void;
}

export interface CaptchaPuzzleProps {
  targetImage?: string;
  sliderImage?: string;
  gapSize?: number;
  showGap?: boolean;
  showTips?: boolean;
  tipsText?: string;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
}

export interface CaptchaRotateProps {
  targetImage?: string;
  referenceImage?: string;
  targetAngle?: number;
  tolerance?: number;
  showAngle?: boolean;
  showTips?: boolean;
  tipsText?: string;
  showReference?: boolean;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  onRotate?: (angle: number) => void;
}

export interface CaptchaTextProps {
  texts?: string[];
  requiredCount?: number;
  caseSensitive?: boolean;
  placeholder?: string;
  maxLength?: number;
  showTips?: boolean;
  tipsText?: string;
  textImage?: string;
  onSuccess?: (token: string, texts: string[]) => void;
  onError?: (error: Error) => void;
}

export interface CaptchaIconProps {
  targetImage?: string;
  icons?: IconItem[];
  requiredCount?: number;
  iconSize?: number;
  showCount?: boolean;
  showTips?: boolean;
  tipsText?: string;
  onSuccess?: (token: string, icons: IconItem[]) => void;
  onError?: (error: Error) => void;
  onSelect?: (icon: IconItem) => void;
}

export interface CaptchaState {
  isVisible: boolean;
  isLoading: boolean;
  isVerified: boolean;
  token: string | null;
  error: Error | null;
  attempts: number;
}

export interface UseCaptchaReturn {
  verify: (scene?: string, options?: CaptchaVerifyOptions) => Promise<string>;
  config: Readonly<CaptchaConfig>;
  isClient: boolean;
  getToken: () => string | null;
  clearToken: () => void;
}

export interface UseCaptchaStateReturn {
  show: () => void;
  hide: () => void;
  setLoading: (loading: boolean) => void;
  setVerified: (verified: boolean) => void;
  setToken: (token: string | null) => void;
  setError: (error: Error | null) => void;
  setAttempts: (attempts: number) => void;
  incrementAttempts: () => void;
  reset: () => void;
  isVisible: Readonly<import('vue').Ref<boolean>>;
  isLoading: Readonly<import('vue').Ref<boolean>>;
  isVerified: Readonly<import('vue').Ref<boolean>>;
  token: Readonly<import('vue').Ref<string | null>>;
  error: Readonly<import('vue').Ref<Error | null>>;
  attempts: Readonly<import('vue').Ref<number>>;
}

export interface ClickPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface IconItem {
  id: string;
  icon: string;
  name?: string;
  selected?: boolean;
}
