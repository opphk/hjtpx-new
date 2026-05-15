export enum CaptchaType {
  SLIDER = 'slider',
  CLICK = 'click',
  PUZZLE = 'puzzle',
  ROTATE = 'rotate',
  TEXT = 'text',
  ICON = 'icon'
}

export interface CaptchaData {
  captchaId: string;
  imageUrl?: string;
  backgroundImage?: string;
  thumbnailUrl?: string;
  track?: TrackPoint[];
  expiresAt?: string;
  data?: Record<string, any>;
}

export interface TrackPoint {
  x: number;
  y: number;
  timestamp: number;
}

export interface CaptchaConfig {
  baseUrl?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  locale?: string;
}

export interface CaptchaVerifyRequest {
  captchaId: string;
  track?: TrackPoint[];
  userResponse?: any;
}

export interface CaptchaVerifyResponse {
  success: boolean;
  token?: string;
  expiresIn?: number;
  message?: string;
}

export interface CaptchaResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface CaptchaResult {
  verified: boolean;
  token?: string;
  message?: string;
}

export interface CaptchaCallbacks {
  onReady?: () => void;
  onVerify?: (result: CaptchaResult) => void;
  onError?: (error: string) => void;
  onExpire?: () => void;
  onClose?: () => void;
}

export interface SliderCaptchaData extends CaptchaData {
  backgroundImage: string;
  thumbnailUrl: string;
  track: TrackPoint[];
}

export interface ClickCaptchaData extends CaptchaData {
  backgroundImage: string;
  targets?: ClickTarget[];
}

export interface ClickTarget {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

export interface PuzzleCaptchaData extends CaptchaData {
  backgroundImage: string;
  thumbnailUrl: string;
  puzzleUrl?: string;
  targetX?: number;
  targetY?: number;
}

export interface RotateCaptchaData extends CaptchaData {
  imageUrl: string;
  angle?: number;
  targetAngle?: number;
}

export interface TextCaptchaData extends CaptchaData {
  text?: string;
  options?: string[];
}

export interface IconCaptchaData extends CaptchaData {
  imageUrl: string;
  options?: IconOption[];
}

export interface IconOption {
  id: string;
  imageUrl: string;
  isCorrect?: boolean;
}
