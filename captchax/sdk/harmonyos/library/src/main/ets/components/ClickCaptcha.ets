@Component
export struct ClickCaptcha {
  @State private selectedPoints: ClickPoint[] = [];
  @State private isVerified: boolean = false;
  @State private verificationStatus: string = '';
  @State private imageLoadError: boolean = false;
  @State private showHint: boolean = false;

  @Prop backgroundImage: string = '';
  @Prop width: number = 300;
  @Prop height: number = 200;
  @Prop targets: ClickTarget[] = [];

  @Event onVerified: EventEmitter<ClickVerifyResult> = new EventEmitter();
  @Event onError: EventEmitter<string> = new EventEmitter();
  @Event onRefresh: EventEmitter<void> = new EventEmitter();
  @Event onPointSelected: EventEmitter<ClickPoint> = new EventEmitter();

  private containerWidth: number = 300;
  private containerHeight: number = 200;

  aboutToAppear() {
    this.containerWidth = this.width;
    this.containerHeight = this.height;
  }

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
          .onClick((event: ClickEvent) => {
            if (this.isVerified) return;
            this.handleImageClick(event.x, event.y);
          })

        ForEach(this.selectedPoints, (point: ClickPoint, index: number) => {
          Stack() {
            Circle()
              .width(point.size)
              .height(point.size)
              .fill(point.isCorrect ? '#52c41a' : '#ff4d4f')
              .stroke('#ffffff')
              .strokeWidth(2)

            Text(String(index + 1))
              .fontSize(12)
              .fontColor('#ffffff')
              .fontWeight(FontWeight.Bold)
          }
          .position({ x: point.x - point.size / 2, y: point.y - point.size / 2 })
        })

        if (this.showHint && !this.isVerified) {
          ForEach(this.targets, (target: ClickTarget, index: number) => {
            Stack() {
              Circle()
                .width(40)
                .height(40)
                .fill('rgba(24, 144, 255, 0.3)')
                .stroke('#1890ff')
                .strokeWidth(2)

              Text(String(index + 1))
                .fontSize(14)
                .fontColor('#1890ff')
                .fontWeight(FontWeight.Bold)
            }
            .position({ x: target.x - 20, y: target.y - 20 })
          })
        }
      }
      .width(this.width)
      .height(this.height)
      .clip(true)
      .borderRadius(8)
      .gesture(
        TapGesture({ count: 1 })
          .onAction((event: GestureEvent) => {
            if (this.isVerified) return;
            this.handleImageClick(event.fingerX || 0, event.fingerY || 0);
          })
      )

      Column() {
        Row() {
          Text('点击图中所有')
            .fontSize(14)
            .fontColor('#666666')
          Text('目标')
            .fontSize(14)
            .fontColor('#1890ff')
            .margin({ left: 4, right: 4 })
          Text(`(${this.selectedPoints.length}/${this.targets.length})`)
            .fontSize(14)
            .fontColor('#1890ff')

          Blank()

          Text('刷新')
            .fontSize(14)
            .fontColor('#1890ff')
            .onClick(() => {
              this.resetCaptcha();
              this.onRefresh.emit();
            })
        }
        .width('100%')
        .padding({ left: 12, right: 12, top: 8, bottom: 8 })

        Row() {
          ForEach(this.selectedPoints, (point: ClickPoint, index: number) => {
            Circle()
              .width(20)
              .height(20)
              .fill(point.isCorrect ? '#52c41a' : '#ff4d4f')
              .stroke('#ffffff')
              .strokeWidth(1)
              .margin({ right: 8 })
          })
        }
        .width('100%')
        .height(30)
        .padding({ left: 12, right: 12 })
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

  private handleImageClick(x: number, y: number) {
    const newPoint: ClickPoint = {
      x: x,
      y: y,
      size: 30,
      timestamp: Date.now(),
      isCorrect: this.isTargetPoint(x, y)
    };

    this.selectedPoints.push(newPoint);
    this.onPointSelected.emit(newPoint);

    if (this.selectedPoints.length >= this.targets.length) {
      this.verifyCaptcha();
    }
  }

  private isTargetPoint(x: number, y: number): boolean {
    for (const target of this.targets) {
      const dx = x - target.x;
      const dy = y - target.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= (target.width || 40) / 2) {
        return true;
      }
    }
    return false;
  }

  private verifyCaptcha() {
    const correctCount = this.selectedPoints.filter(p => p.isCorrect).length;
    const isCorrect = correctCount === this.targets.length;

    this.isVerified = isCorrect;

    const result: ClickVerifyResult = {
      verified: isCorrect,
      points: this.selectedPoints,
      correctCount: correctCount,
      totalTargets: this.targets.length
    };

    if (isCorrect) {
      this.verificationStatus = '验证成功';
      this.showHint = false;
      this.onVerified.emit(result);
    } else {
      this.verificationStatus = `验证失败 (${correctCount}/${this.targets.length})`;
      this.onError.emit('点击位置不正确');
      setTimeout(() => {
        this.showHint = true;
      }, 500);
    }
  }

  private resetCaptcha() {
    this.selectedPoints = [];
    this.isVerified = false;
    this.verificationStatus = '';
    this.showHint = false;
  }

  reset() {
    this.resetCaptcha();
  }

  setVerified(verified: boolean) {
    this.isVerified = verified;
  }
}

interface ClickPoint {
  x: number;
  y: number;
  size: number;
  timestamp: number;
  isCorrect: boolean;
}

interface ClickTarget {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface ClickVerifyResult {
  verified: boolean;
  points: ClickPoint[];
  correctCount: number;
  totalTargets: number;
}
