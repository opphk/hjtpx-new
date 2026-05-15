import { SliderCaptcha } from './SliderCaptcha';
import { ClickCaptcha } from './ClickCaptcha';
import { PuzzleCaptcha } from './PuzzleCaptcha';
import { RotateCaptcha } from './RotateCaptcha';
import { TextCaptcha } from './TextCaptcha';
import { IconCaptcha } from './IconCaptcha';
import { CaptchaType, CaptchaData } from '../types/captcha.types';

@Component
export struct CaptchaContainer {
  @State private captchaType: CaptchaType = CaptchaType.SLIDER;
  @State private captchaData: CaptchaData | null = null;
  @State private isLoading: boolean = false;
  @State private isVerified: boolean = false;
  @State private errorMessage: string = '';

  @Prop width: number = 320;
  @Prop height: number = 400;
  @Prop borderRadius: number = 12;

  @Event onVerified: EventEmitter<any> = new EventEmitter();
  @Event onError: EventEmitter<string> = new EventEmitter();
  @Event onRefresh: EventEmitter<void> = new EventEmitter();
  @Event onClose: EventEmitter<void> = new EventEmitter();

  build() {
    Column() {
      Row() {
        Text(this.getTitle())
          .fontSize(18)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333333')

        Blank()

        Text('×')
          .fontSize(24)
          .fontColor('#999999')
          .onClick(() => {
            this.onClose.emit();
          })
      }
      .width('100%')
      .padding({ left: 16, right: 16, top: 16, bottom: 12 })
      .alignItems(VerticalAlign.Center)

      if (this.isLoading) {
        LoadingProgress()
          .width(50)
          .height(50)
          .margin({ top: 100, bottom: 100 })
      } else if (this.captchaData) {
        if (this.captchaType === CaptchaType.SLIDER) {
          SliderCaptcha({
            backgroundImage: this.captchaData.backgroundImage || '',
            thumbnailUrl: this.captchaData.thumbnailUrl || '',
            targetX: (this.captchaData as any).targetX || 200,
            width: this.width - 32,
            height: this.height - 150,
            onVerified: (result) => this.handleVerify(result),
            onError: (error) => this.handleError(error),
            onRefresh: () => this.handleRefresh()
          })
        } else if (this.captchaType === CaptchaType.CLICK) {
          ClickCaptcha({
            backgroundImage: this.captchaData.backgroundImage || '',
            width: this.width - 32,
            height: this.height - 150,
            targets: (this.captchaData as any).targets || [],
            onVerified: (result) => this.handleVerify(result),
            onError: (error) => this.handleError(error),
            onRefresh: () => this.handleRefresh()
          })
        } else if (this.captchaType === CaptchaType.PUZZLE) {
          PuzzleCaptcha({
            backgroundImage: this.captchaData.backgroundImage || '',
            thumbnailUrl: this.captchaData.thumbnailUrl || '',
            puzzleUrl: (this.captchaData as any).puzzleUrl || '',
            targetX: (this.captchaData as any).targetX || 200,
            targetY: (this.captchaData as any).targetY || 50,
            width: this.width - 32,
            height: this.height - 150,
            onVerified: (result) => this.handleVerify(result),
            onError: (error) => this.handleError(error),
            onRefresh: () => this.handleRefresh()
          })
        } else if (this.captchaType === CaptchaType.ROTATE) {
          RotateCaptcha({
            imageUrl: this.captchaData.imageUrl || '',
            targetAngle: (this.captchaData as any).targetAngle || 45,
            width: (this.width - 32) * 0.6,
            height: (this.width - 32) * 0.6,
            onVerified: (result) => this.handleVerify(result),
            onError: (error) => this.handleError(error),
            onRefresh: () => this.handleRefresh()
          })
        } else if (this.captchaType === CaptchaType.TEXT) {
          TextCaptcha({
            text: (this.captchaData as any).text || '',
            hint: '请输入上方文字',
            width: this.width - 32,
            onVerified: (result) => this.handleVerify(result),
            onError: (error) => this.handleError(error),
            onRefresh: () => this.handleRefresh()
          })
        } else if (this.captchaType === CaptchaType.ICON) {
          IconCaptcha({
            imageUrl: this.captchaData.imageUrl || '',
            instruction: (this.captchaData as any).instruction || '请点击所有包含"汽车"的图标',
            width: this.width - 32,
            height: (this.height - 150) * 0.6,
            onVerified: (result) => this.handleVerify(result),
            onError: (error) => this.handleError(error),
            onRefresh: () => this.handleRefresh()
          })
        }
      } else {
        Column() {
          Text(this.errorMessage || '加载失败')
            .fontSize(14)
            .fontColor('#ff4d4f')
            .margin({ top: 100, bottom: 20 })

          Button('重试')
            .onClick(() => {
              this.handleRefresh();
            })
        }
      }
    }
    .width(this.width)
    .backgroundColor('#ffffff')
    .borderRadius(this.borderRadius)
    .shadow({
      radius: 20,
      color: '#40000000',
      offsetX: 0,
      offsetY: 4
    })
  }

  private getTitle(): string {
    switch (this.captchaType) {
      case CaptchaType.SLIDER:
        return '滑块验证';
      case CaptchaType.CLICK:
        return '点选验证';
      case CaptchaType.PUZZLE:
        return '拼图验证';
      case CaptchaType.ROTATE:
        return '旋转验证';
      case CaptchaType.TEXT:
        return '文字验证';
      case CaptchaType.ICON:
        return '图标验证';
      default:
        return '验证码';
    }
  }

  private handleVerify(result: any) {
    this.isVerified = true;
    this.onVerified.emit(result);
  }

  private handleError(error: string) {
    this.errorMessage = error;
    this.onError.emit(error);
  }

  private handleRefresh() {
    this.onRefresh.emit();
  }

  setType(type: CaptchaType) {
    this.captchaType = type;
  }

  setData(data: CaptchaData) {
    this.captchaData = data;
    this.isLoading = false;
    this.errorMessage = '';
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string) {
    this.errorMessage = error;
    this.isLoading = false;
  }

  getVerified(): boolean {
    return this.isVerified;
  }

  reset() {
    this.isVerified = false;
    this.errorMessage = '';
  }
}
