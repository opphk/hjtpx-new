export interface VerifyOptions {
  token: string;
  scene?: string;
  ip?: string;
  userAgent?: string;
}

export interface VerifyResponse {
  success: boolean;
  score?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  error?: string;
}

export interface CaptchaConfig {
  apiKey: string;
  apiSecret?: string;
  serverUrl?: string;
}

export interface CaptchaProviderProps {
  children: React.ReactNode;
  apiKey: string;
  serverUrl?: string;
  locale?: string;
  theme?: 'light' | 'dark' | 'auto';
  errorBoundary?: boolean;
  onError?: (error: Error) => void;
}

export interface CaptchaButtonProps {
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

export interface CaptchaDialogProps {
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

export interface CaptchaSliderProps {
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

export interface CaptchaClickProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  scene?: string;
  targetCount?: number;
  imageUrl?: string;
  width?: number;
  height?: number;
}

export interface CaptchaPuzzleProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  scene?: string;
  backgroundImage?: string;
  puzzleImage?: string;
  width?: number;
  height?: number;
}

export interface CaptchaRotateProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  scene?: string;
  imageUrl?: string;
  targetAngle?: number;
  tolerance?: number;
  width?: number;
  height?: number;
}

export interface CaptchaTextProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  scene?: string;
  question?: string;
  answer?: string;
  caseSensitive?: boolean;
  maxLength?: number;
}

export interface CaptchaIconProps {
  onSuccess: (token: string) => void;
  onError?: (error: Error) => void;
  onClose?: () => void;
  scene?: string;
  icons?: string[];
  targetIcon?: string;
  gridSize?: number;
}

export interface UseCaptchaOptions {
  scene?: string;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  serverUrl?: string;
  apiKey?: string;
  autoVerify?: boolean;
}

export interface UseCaptchaReturn {
  token: string | null;
  loading: boolean;
  error: Error | null;
  isVerified: boolean;
  verify: () => Promise<string | null>;
  reset: () => void;
}

export interface UseCaptchaVerifyOptions {
  scene?: string;
  onSuccess?: (token: string) => void;
  onError?: (error: Error) => void;
  serverUrl?: string;
  apiKey?: string;
}

export interface UseCaptchaVerifyReturn {
  token: string | null;
  loading: boolean;
  error: Error | null;
  verify: () => Promise<string | null>;
  reset: () => void;
  isVerified: boolean;
}

export interface MiddlewareOptions {
  apiKey?: string;
  apiSecret?: string;
  serverUrl?: string;
  protectedPaths?: string[];
  captchaPaths?: string[];
  tokenCookieName?: string;
  tokenHeaderName?: string;
  bypassPaths?: string[];
  customVerify?: (token: string) => Promise<boolean>;
}

export interface CaptchaXServerConfig {
  apiKey: string;
  apiSecret: string;
  serverUrl?: string;
  timeout?: number;
  retries?: number;
}

export type CaptchaType = 'slider' | 'click' | 'puzzle' | 'rotate' | 'text' | 'icon';

export interface CaptchaChallenge {
  id: string;
  type: CaptchaType;
  data: {
    backgroundImage?: string;
    sliderImage?: string;
    targetPosition?: { x: number; y: number };
    clickPositions?: Array<{ x: number; y: number }>;
    rotationAngle?: number;
    text?: string;
    icons?: string[];
    targetIcon?: string;
  };
  expiresAt: number;
}

export interface CaptchaResult {
  success: boolean;
  token?: string;
  score?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  error?: string;
}

export interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface CaptchaValidationResult {
  isValid: boolean;
  score?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  error?: string;
}

export interface CaptchaContextValue {
  verify: (scene?: string) => Promise<string>;
  getChallenge: (scene?: string) => Promise<CaptchaChallenge>;
  verifyToken: (token: string) => Promise<CaptchaResult>;
  config: {
    apiKey: string;
    serverUrl: string;
  };
}
