@Component
export struct SliderCaptcha {
  @State private sliderX: number = 0;
  @State private isDragging: boolean = false;
  @State private isVerified: boolean = false;
  @State private verificationStatus: string = '';
  @State private trackPoints: TrackPoint[] = [];
  @State private startTime: number = 0;
  @State private imageLoadError: boolean = false;

  @Prop backgroundImage: string = '';
  @Prop thumbnailUrl: string = '';
  @Prop targetX: number = 200;
  @Prop width: number = 300;
  @Prop height: number = 200;

  @Event onVerified: EventEmitter<VerifyResult> = new EventEmitter();
  @Event onError: EventEmitter<string> = new EventEmitter();
  @Event onRefresh: EventEmitter<void> = new EventEmitter();

  private readonly trackWidth: number = 300;
  private readonly trackHeight: number = 40;
  private readonly sliderSize: number = 40;
  private lastX: number = 0;

  build() {
    Column() {
      Stack() {
        Image(this.backgroundImage)
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Cover)
          .onError(() => {
            this.imageLoadError = true;
          })

        if (this.isVerified) {
          Row() {
            Text('✓')
              .fontSize(24)
              .fontColor('#52c41a')
            Text('验证成功')
              .fontSize(16)
              .fontColor('#52c41a')
              .margin({ left: 8 })
          }
          .width('100%')
          .height('100%')
          .backgroundColor('rgba(82, 196, 26, 0.2)')
          .justifyContent(FlexAlign.Center)
        }
      }
      .width(this.width)
      .height(this.height)
      .clip(true)
      .borderRadius(8)

      Column() {
        Row() {
          Text('向右滑动完成拼图')
            .fontSize(14)
            .fontColor('#666666')

          Blank()

          Text('刷新')
            .fontSize(14)
            .fontColor('#1890ff')
            .onClick(() => {
              this.resetSlider();
              this.onRefresh.emit();
            })
        }
        .width('100%')
        .padding({ left: 12, right: 12, top: 8, bottom: 8 })

        Stack() {
          Row() {
            Row() {
              Text('▶')
                .fontSize(16)
                .fontColor('#666666')
            }
            .width(this.sliderSize)
            .height(this.trackHeight)
            .backgroundColor('#f0f0f0')
            .borderRadius({ topLeft: 20, bottomLeft: 20 })
            .justifyContent(FlexAlign.Center)
            .alignItems(VerticalAlign.Center)
          }
          .width(this.sliderX + this.sliderSize)
          .height(this.trackHeight)
          .clip(true)
        }
        .width('100%')
        .height(this.trackHeight)
        .backgroundColor('#f7f7f7')
        .borderRadius(this.trackHeight / 2)
        .gesture(
          PanGesture()
            .onActionStart(() => {
              if (this.isVerified) return;
              this.isDragging = true;
              this.startTime = Date.now();
              this.lastX = 0;
              this.trackPoints = [];
            })
            .onActionUpdate((event: GestureEvent) => {
              if (this.isVerified || !this.isDragging) return;

              const deltaX = (event as any).fingerX - this.lastX;
              this.lastX = (event as any).fingerX;

              this.sliderX = Math.max(0, Math.min(this.sliderX + deltaX, this.trackWidth - this.sliderSize));

              this.trackPoints.push({
                x: this.sliderX,
                y: (event as any).fingerY,
                timestamp: Date.now() - this.startTime
              });
            })
            .onActionEnd(() => {
              if (this.isVerified || !this.isDragging) return;
              this.isDragging = false;
              this.verifySlide();
            })
        )
      }
      .width(this.width)
      .backgroundColor('#ffffff')
      .borderRadius(8)
      .shadow({
        radius: 10,
        color: '#1a000000',
        offsetX: 0,
        offsetY: 2
      })
    }
    .padding(16)
  }

  private verifySlide() {
    const threshold = this.targetX - 10;
    const isCorrect = this.sliderX >= threshold && this.sliderX <= threshold + 20;

    this.isVerified = isCorrect;

    const result: VerifyResult = {
      verified: isCorrect,
      sliderX: this.sliderX,
      targetX: this.targetX,
      track: this.trackPoints
    };

    if (isCorrect) {
      this.verificationStatus = '验证成功';
      this.onVerified.emit(result);
    } else {
      this.verificationStatus = '验证失败，请重试';
      this.onError.emit('滑块位置不正确');
      setTimeout(() => {
        this.resetSlider();
      }, 1000);
    }
  }

  private resetSlider() {
    this.sliderX = 0;
    this.isVerified = false;
    this.verificationStatus = '';
    this.trackPoints = [];
    this.isDragging = false;
  }

  reset() {
    this.resetSlider();
  }

  setVerified(verified: boolean) {
    this.isVerified = verified;
  }
}

interface TrackPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface VerifyResult {
  verified: boolean;
  sliderX: number;
  targetX: number;
  track: TrackPoint[];
}
