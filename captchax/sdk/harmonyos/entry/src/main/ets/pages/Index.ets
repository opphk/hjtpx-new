import router from '@ohos.router';
import { CaptchaX } from '../../library/src/main/ets/core/CaptchaX';
import { CaptchaType, CaptchaData } from '../../library/src/main/ets/types/captcha.types';
import { CaptchaContainer } from '../../library/src/main/ets/components/CaptchaContainer';
import display from '@ohos.display';

@Entry
@Component
struct Index {
  @State private currentCaptchaType: CaptchaType = CaptchaType.SLIDER;
  @State private showCaptcha: boolean = false;
  @State private verificationStatus: string = '';
  @State private captchaData: CaptchaData | null = null;
  @State private isLoading: boolean = false;
  @State private screenWidth: number = 320;
  @State private screenHeight: number = 400;
  @State private containerWidth: number = 320;
  @State private containerHeight: number = 420;

  private captchaX: CaptchaX = CaptchaX.getInstance({
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
    retryCount: 3
  });

  aboutToAppear() {
    const displayData = display.getDefaultDisplaySync();
    this.screenWidth = displayData.width;
    this.screenHeight = displayData.height;

    this.containerWidth = Math.min(360, this.screenWidth * 0.9);
    this.containerHeight = 450;

    this.captchaX.setCallbacks({
      onReady: () => {
        console.info('CaptchaX SDK initialized');
      },
      onError: (error: string) => {
        console.error('CaptchaX error:', error);
        this.verificationStatus = '错误: ' + error;
      },
      onExpire: () => {
        this.verificationStatus = '验证码已过期，请刷新';
      }
    });
  }

  build() {
    Stack() {
      Column() {
        Text('CaptchaX SDK')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333333')
          .margin({ top: 40, bottom: 20 })

        Text('HarmonyOS 验证码集成示例')
          .fontSize(16)
          .fontColor('#666666')
          .margin({ bottom: 40 })

        Column() {
          ForEach([
            { type: CaptchaType.SLIDER, name: '滑块验证', icon: '🔲' },
            { type: CaptchaType.CLICK, name: '点选验证', icon: '👆' },
            { type: CaptchaType.PUZZLE, name: '拼图验证', icon: '🧩' },
            { type: CaptchaType.ROTATE, name: '旋转验证', icon: '🔄' },
            { type: CaptchaType.TEXT, name: '文字验证', icon: '📝' },
            { type: CaptchaType.ICON, name: '图标验证', icon: '🎯' }
          ], (item: any) => {
            Row() {
              Text(item.icon)
                .fontSize(24)
                .width(40)

              Text(item.name)
                .fontSize(16)
                .fontColor('#333333')
                .layoutWeight(1)

              Image('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAARCAYAAADQWvz5AAAACXBIWXMAAAsTAAALEwEAmpwYAAAA0UlEQVQ4y6WTuw3CQBBEn1hQxANKegAlPQBKeggWFIoLKO4BOYBwAdUdWAgLC8HCwMBAsLCwMDEQxMRCa1a7duzEdmI7Vhz5J7uz3p2ZfVuSNwOwxR6xF8g7YRd5G4D7Qd5F3g2wD9wNsiuQd4W8G+RekHeDvAvkXSDvCnlXyLtC3hXybpB3hbwb5N0g7wZ5N8i7Qd4N8m6Qd4O8G+TdIO8GeTfIu0HeDfJukHeDvBvk3SDvBnk3yLtB3g3ybpB3g7wb5N0g7wZ5N8i7Qd4N8m6Qd4O8G+TdIO8GeTfIu0HeDfJukHeDvBvk3SDvBnk3yLtB3g3ybpB3g7wb5N0g7wZ5N8i7wT/hG3YdNqP0AAAAAElFTkSuQmCC')
                .width(20)
                .height(20)
                .objectFit(ImageFit.Contain)
            }
            .width('100%')
            .height(50)
            .padding({ left: 20, right: 20 })
            .backgroundColor(this.currentCaptchaType === item.type ? '#e6f7ff' : '#ffffff')
            .borderRadius(8)
            .onClick(() => {
              this.currentCaptchaType = item.type;
            })
            .margin({ bottom: 8 })
          })
        }
        .width('90%')
        .padding(16)
        .backgroundColor('#f5f5f5')
        .borderRadius(12)

        Button('显示验证码')
          .width('90%')
          .height(48)
          .fontSize(16)
          .fontColor('#ffffff')
          .backgroundColor('#1890ff')
          .borderRadius(24)
          .margin({ top: 30 })
          .onClick(() => {
            this.showCaptchaModal();
          })

        if (this.verificationStatus) {
          Text(this.verificationStatus)
            .fontSize(14)
            .fontColor(this.verificationStatus.includes('成功') ? '#52c41a' : '#ff4d4f')
            .margin({ top: 20 })
        }

        Blank()
      }
      .width('100%')
      .height('100%')

      if (this.showCaptcha) {
        Column() {
          Row() {
            Text(this.getCaptchaTitle())
              .fontSize(20)
              .fontWeight(FontWeight.Bold)
              .fontColor('#333333')

            Blank()

            Text('×')
              .fontSize(28)
              .fontColor('#999999')
              .onClick(() => {
                this.showCaptcha = false;
                this.captchaX.close();
              })
          }
          .width('100%')
          .padding({ left: 20, right: 20, top: 16, bottom: 12 })

          if (this.isLoading) {
            LoadingProgress()
              .width(60)
              .height(60)
              .margin({ top: 150, bottom: 150 })
          } else if (this.captchaData) {
            this.CaptchaContent()
          } else {
            Column() {
              Text('加载验证码失败')
                .fontSize(14)
                .fontColor('#ff4d4f')
                .margin({ top: 150, bottom: 20 })

              Button('重试')
                .onClick(() => {
                  this.loadCaptcha();
                })
            }
          }
        }
        .width(this.containerWidth)
        .backgroundColor('#ffffff')
        .borderRadius(16)
        .shadow({
          radius: 30,
          color: '#40000000',
          offsetX: 0,
          offsetY: 8
        })
      }
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#f0f2f5')
  }

  @Builder
  CaptchaContent() {
    CaptchaContainer({
      width: this.containerWidth,
      height: this.containerHeight,
      onVerified: (result) => {
        this.handleVerified(result);
      },
      onError: (error) => {
        this.verificationStatus = '验证失败: ' + error;
      },
      onRefresh: () => {
        this.loadCaptcha();
      },
      onClose: () => {
        this.showCaptcha = false;
        this.captchaX.close();
      }
    })
  }

  private getCaptchaTitle(): string {
    switch (this.currentCaptchaType) {
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

  private showCaptchaModal() {
    this.showCaptcha = true;
    this.loadCaptcha();
  }

  private async loadCaptcha() {
    this.isLoading = true;
    this.verificationStatus = '';

    try {
      const response = await this.captchaX.getCaptcha(this.currentCaptchaType);

      if (response.success && response.data) {
        this.captchaData = response.data;
      } else {
        this.captchaData = this.getMockData();
      }
    } catch (error) {
      console.error('Failed to load captcha:', error);
      this.captchaData = this.getMockData();
    } finally {
      this.isLoading = false;
    }
  }

  private async handleVerified(result: any) {
    this.verificationStatus = '验证成功!';

    try {
      const verifyResult = await this.captchaX.verify({
        captchaId: this.captchaData?.captchaId || '',
        userResponse: result
      });

      if (verifyResult.verified) {
        this.verificationStatus = '验证成功! Token: ' + (verifyResult.token || 'N/A');
      } else {
        this.verificationStatus = '服务端验证失败';
      }
    } catch (error) {
      console.error('Verification error:', error);
    }

    setTimeout(() => {
      this.showCaptcha = false;
      this.captchaData = null;
    }, 2000);
  }

  private getMockData(): CaptchaData {
    const mockData: Record<CaptchaType, CaptchaData> = {
      [CaptchaType.SLIDER]: {
        captchaId: 'slider_123456',
        backgroundImage: 'https://picsum.photos/300/200?random=1',
        thumbnailUrl: 'https://picsum.photos/50/50?random=2',
        expiresAt: new Date(Date.now() + 300000).toISOString()
      },
      [CaptchaType.CLICK]: {
        captchaId: 'click_123456',
        backgroundImage: 'https://picsum.photos/300/200?random=3',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        data: {
          targets: [
            { x: 100, y: 80, width: 40, height: 40 },
            { x: 200, y: 120, width: 40, height: 40 }
          ]
        }
      },
      [CaptchaType.PUZZLE]: {
        captchaId: 'puzzle_123456',
        backgroundImage: 'https://picsum.photos/300/200?random=4',
        thumbnailUrl: 'https://picsum.photos/50/50?random=5',
        puzzleUrl: 'https://picsum.photos/50/50?random=6',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        data: {
          targetX: 200,
          targetY: 50
        }
      },
      [CaptchaType.ROTATE]: {
        captchaId: 'rotate_123456',
        imageUrl: 'https://picsum.photos/200/200?random=7',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        data: {
          targetAngle: 45
        }
      },
      [CaptchaType.TEXT]: {
        captchaId: 'text_123456',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        data: {
          text: 'ABC123'
        }
      },
      [CaptchaType.ICON]: {
        captchaId: 'icon_123456',
        imageUrl: 'https://picsum.photos/300/200?random=8',
        expiresAt: new Date(Date.now() + 300000).toISOString(),
        data: {
          instruction: '请点击所有包含"汽车"的图标'
        }
      }
    };

    return mockData[this.currentCaptchaType];
  }
}
