@Component
export struct RotateCaptcha {
  @State private rotationAngle: number = 0;
  @State private currentAngle: number = 0;
  @State private isDragging: boolean = false;
  @State private isVerified: boolean = false;
  @State private verificationStatus: string = '';
  @State private imageLoadError: boolean = false;

  @Prop imageUrl: string = '';
  @Prop targetAngle: number = 45;
  @Prop width: number = 200;
  @Prop height: number = 200;

  @Event onVerified: EventEmitter<RotateVerifyResult> = new EventEmitter();
  @Event onError: EventEmitter<string> = new EventEmitter();
  @Event onRefresh: EventEmitter<void> = new EventEmitter();

  private lastAngle: number = 0;

  aboutToAppear() {
    this.rotationAngle = Math.floor(Math.random() * 360);
    this.currentAngle = this.rotationAngle;
  }

  build() {
    Column() {
      Stack() {
        Image(this.imageUrl)
          .width(this.width)
          .height(this.height)
          .objectFit(ImageFit.Contain)
          .onError(() => {
            this.imageLoadError = true;
          })
          .rotate({
            z: 1,
            angle: this.currentAngle
          })
          .gesture(
            PanGesture()
              .onActionStart(() => {
                if (this.isVerified) return;
                this.isDragging = true;
                this.lastAngle = 0;
              })
              .onActionUpdate((event: GestureEvent) => {
                if (this.isVerified || !this.isDragging) return;

                const centerX = this.width / 2;
                const centerY = this.height / 2;

                const dx = event.fingerX - centerX;
                const dy = event.fingerY - centerY;

                let angle = Math.atan2(dy, dx) * (180 / Math.PI);

                const deltaAngle = angle - this.lastAngle;
                this.lastAngle = angle;

                this.currentAngle += deltaAngle;
              })
              .onActionEnd(() => {
                if (this.isVerified || !this.isDragging) return;
                this.isDragging = false;
                this.verifyRotation();
              })
          )

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
          .backgroundColor('rgba(82, 196, 26, 0.3)')
          .justifyContent(FlexAlign.Center)
        }
      }
      .width(this.width)
      .height(this.height)
      .clip(true)
      .borderRadius(this.width / 2)
      .backgroundColor('#f0f0f0')

      Column() {
        Row() {
          Text('旋转图片对齐')
            .fontSize(14)
            .fontColor('#666666')

          Blank()

          Text('刷新')
            .fontSize(14)
            .fontColor('#1890ff')
            .onClick(() => {
              this.resetRotation();
              this.onRefresh.emit();
            })
        }
        .width('100%')
        .padding({ left: 12, right: 12, top: 8, bottom: 8 })

        Row() {
          Text('当前角度:')
            .fontSize(14)
            .fontColor('#666666')

          Text(`${Math.round(this.currentAngle % 360)}°`)
            .fontSize(14)
            .fontColor('#1890ff')
            .margin({ left: 8 })

          Blank()

          Text('目标:')
            .fontSize(14)
            .fontColor('#666666')

          Text(`${this.targetAngle}°`)
            .fontSize(14)
            .fontColor('#52c41a')
            .margin({ left: 8 })
        }
        .width('100%')
        .padding({ left: 12, right: 12, bottom: 8 })
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

      Row() {
        Text('按住图片旋转')
          .fontSize(12)
          .fontColor('#999999')
      }
      .width(this.width)
      .padding({ top: 8 })
    }
    .padding(16)
  }

  private verifyRotation() {
    const normalizedCurrent = ((this.currentAngle % 360) + 360) % 360;
    const normalizedTarget = this.targetAngle;

    let diff = Math.abs(normalizedCurrent - normalizedTarget);
    if (diff > 180) {
      diff = 360 - diff;
    }

    const threshold = 15;
    const isCorrect = diff <= threshold;

    this.isVerified = isCorrect;

    const result: RotateVerifyResult = {
      verified: isCorrect,
      currentAngle: normalizedCurrent,
      targetAngle: normalizedTarget,
      difference: diff
    };

    if (isCorrect) {
      this.verificationStatus = '验证成功';
      this.onVerified.emit(result);
    } else {
      this.verificationStatus = '验证失败，请重试';
      this.onError.emit('旋转角度不正确');
      setTimeout(() => {
        this.resetRotation();
      }, 1000);
    }
  }

  private resetRotation() {
    this.rotationAngle = Math.floor(Math.random() * 360);
    this.currentAngle = this.rotationAngle;
    this.isVerified = false;
    this.verificationStatus = '';
    this.isDragging = false;
  }

  reset() {
    this.resetRotation();
  }

  setVerified(verified: boolean) {
    this.isVerified = verified;
  }

  setTargetAngle(angle: number) {
    this.targetAngle = angle;
  }
}

interface RotateVerifyResult {
  verified: boolean;
  currentAngle: number;
  targetAngle: number;
  difference: number;
}
