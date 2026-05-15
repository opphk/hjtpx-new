export interface CaptchaConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface CaptchaTrack {
  x: number;
  y: number;
  timestamp: number;
}

export interface CaptchaData {
  captchaId: string;
  imageUrl?: string;
  backgroundImage?: string;
  thumbnailUrl?: string;
  track: CaptchaTrack[];
  expiresAt: string;
  puzzleImage?: string;
  targetAngle?: number;
  text?: string;
  icons?: string[];
  clickPositions?: Array<{ x: number; y: number }>;
}

export interface CaptchaResponse {
  success: boolean;
  data?: CaptchaData;
  error?: string;
  message?: string;
}

export interface VerifyRequest {
  captchaId: string;
  track: CaptchaTrack[];
  userResponse: SliderResponse | ClickResponse | RotateResponse | TextResponse | IconResponse | PuzzleResponse;
}

export interface SliderResponse {
  offsetX: number;
  offsetY?: number;
  track: CaptchaTrack[];
}

export interface ClickResponse {
  positions: Array<{ x: number; y: number }>;
  track: CaptchaTrack[];
}

export interface RotateResponse {
  angle: number;
  track: CaptchaTrack[];
}

export interface TextResponse {
  text: string;
  track: CaptchaTrack[];
}

export interface IconResponse {
  selectedIcons: number[];
  track: CaptchaTrack[];
}

export interface PuzzleResponse {
  offsetX: number;
  offsetY: number;
  track: CaptchaTrack[];
}

export interface VerifyResponse {
  success: boolean;
  message?: string;
  score?: number;
  token?: string;
}

export type CaptchaType = 'slider' | 'click' | 'puzzle' | 'rotate' | 'text' | 'icon';

export interface CaptchaComponentProps {
  captchaData: CaptchaData;
  onSuccess: (result: VerifyResponse) => void;
  onFail?: (error: string) => void;
  onClose?: () => void;
  onRefresh?: () => void;
  width?: number;
  height?: number;
}

export interface SliderCaptchaProps extends CaptchaComponentProps {
  targetPosition: { x: number; y: number };
  imageWidth?: number;
  imageHeight?: number;
}

export interface ClickCaptchaProps extends CaptchaComponentProps {
  targetPositions: Array<{ x: number; y: number }>;
  maxClicks?: number;
}

export interface RotateCaptchaProps extends CaptchaComponentProps {
  targetAngle: number;
}

export interface TextCaptchaProps extends CaptchaComponentProps {
  expectedText: string;
  options?: Array<{ id: string; text: string }>;
}

export interface IconCaptchaProps extends CaptchaComponentProps {
  iconCount: number;
  targetIcons: number[];
}

export interface PuzzleCaptchaProps extends CaptchaComponentProps {
  targetPosition: { x: number; y: number };
  imageWidth?: number;
  imageHeight?: number;
}
