@Component
export struct PuzzleCaptcha {
  @State private puzzleX: number = 0;
  @State private isDragging: boolean = false;
  @State private isVerified: boolean = false;
  @State private verificationStatus: string = '';
  @State private backgroundLoadError: boolean = false;
  @State private puzzleLoadError: boolean = false;
  @State private trackPoints: PuzzleTrackPoint[] = [];

  @Prop backgroundImage: string = '';
  @Prop thumbnailUrl: string = '';
  @Prop puzzleUrl: string = '';
  @Prop targetX: number = 200;
  @Prop targetY: number = 50;
  @Prop width: number = 300;
  @Prop height: number = 200;
  @Prop puzzleSize: number = 50;

  @Event onVerified: EventEmitter<PuzzleVerifyResult> = new EventEmitter();
  @Event onError: EventEmitter<string> = new EventEmitter();
  @Event onRefresh: EventEmitter<void> = new EventEmitter();

  private trackWidth: number = 300;
  private lastX: number = 0;
  private startTime: number = 0;

  build() {
    Column() {
      Stack() {
        Image(this.backgroundImage)
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Cover)
          .onError(() => {
            this.backgroundLoadError = true;
          })

        Stack() {
          Image(this.puzzleUrl || this.thumbnailUrl)
            .width(this.puzzleSize)
            .height(this.puzzleSize)
            .objectFit(ImageFit.Cover)
            .onError(() => {
              this.puzzleLoadError = true;
            })
        }
        .width(this.puzzleSize)
        .height(this.puzzleSize)
        .clip(true)
        .borderRadius(4)
        .border({
          width: 2,
          color: '#ffffff',
          radius: 4
        })
        .shadow({
          radius: 8,
          color: '#40000000',
          offsetX: 2,
          offsetY: 2
        })
        .position({ x: this.puzzleX, y: this.targetY })
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

              const deltaX = event.fingerX - this.lastX;
              this.lastX = event.fingerX;

              this.puzzleX = Math.max(0, Math.min(this.puzzleX + deltaX, this.trackWidth - this.puzzleSize));

              this.trackPoints.push({
                x: this.puzzleX,
                y: this.targetY,
                timestamp: Date.now() - this.startTime
              });
            })
            .onActionEnd(() => {
              if (this.isVerified || !this.isDragging) return;
              this.isDragging = false;
              this.verifyPuzzle();
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

        Stack() {
          Column() {
            Row() {
              ForEach(Array(3).fill(0), (_, i: number) => {
                Row() {
                  if (i === 1) {
                    Circle()
                      .width(8)
                      .height(8)
                      .fill('#1890ff')
                  }
                }
                .width(this.puzzleSize)
                .height(this.puzzleSize)
                .backgroundColor('rgba(0, 0, 0, 0.1)')
                .border({
                  width: 1,
                  color: 'rgba(255, 255, 255, 0.3)'
                })
              })
            }
          }
          .position({ x: this.targetX, y: this.targetY })
        }
        .width(this.puzzleSize)
        .height(this.puzzleSize)
      }
      .width(this.width)
      .height(this.height)
      .clip(true)
      .borderRadius(8)
      .backgroundColor('#f0f0f0')

      Column() {
        Row() {
          Text('将拼图移动到正确位置')
            .fontSize(14)
            .fontColor('#666666')

          Blank()

          Text('刷新')
            .fontSize(14)
            .fontColor('#1890ff')
            .onClick(() => {
              this.resetPuzzle();
              this.onRefresh.emit();
            })
        }
        .width('100%')
        .padding({ left: 12, right: 12, top: 8, bottom: 8 })

        Row() {
          Row() {
            Text('▶')
              .fontSize(16)
              .fontColor('#666666')
          }
          .width(this.puzzleSize)
          .height(this.trackWidth / 8)
          .backgroundColor('#f7f7f7')
          .borderRadius({ topLeft: 20, bottomLeft: 20 })
          .justifyContent(FlexAlign.Center)
        }
        .width(this.puzzleX + this.puzzleSize)
        .height(this.trackWidth / 8)
        .clip(true)
        .backgroundColor('#e8e8e8')
        .borderRadius(20)
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

              const deltaX = event.fingerX - this.lastX;
              this.lastX = event.fingerX;

              this.puzzleX = Math.max(0, Math.min(this.puzzleX + deltaX, this.trackWidth - this.puzzleSize));

              this.trackPoints.push({
                x: this.puzzleX,
                y: this.targetY,
                timestamp: Date.now() - this.startTime
              });
            })
            .onActionEnd(() => {
              if (this.isVerified || !this.isDragging) return;
              this.isDragging = false;
              this.verifyPuzzle();
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

  private verifyPuzzle() {
    const threshold = 10;
    const isCorrect = Math.abs(this.puzzleX - this.targetX) <= threshold;

    this.isVerified = isCorrect;

    const result: PuzzleVerifyResult = {
      verified: isCorrect,
      puzzleX: this.puzzleX,
      targetX: this.targetX,
      track: this.trackPoints
    };

    if (isCorrect) {
      this.verificationStatus = '验证成功';
      this.onVerified.emit(result);
    } else {
      this.verificationStatus = '验证失败，请重试';
      this.onError.emit('拼图位置不正确');
      setTimeout(() => {
        this.resetPuzzle();
      }, 1000);
    }
  }

  private resetPuzzle() {
    this.puzzleX = 0;
    this.isVerified = false;
    this.verificationStatus = '';
    this.trackPoints = [];
    this.isDragging = false;
  }

  reset() {
    this.resetPuzzle();
  }

  setVerified(verified: boolean) {
    this.isVerified = verified;
  }
}

interface PuzzleTrackPoint {
  x: number;
  y: number;
  timestamp: number;
}

interface PuzzleVerifyResult {
  verified: boolean;
  puzzleX: number;
  targetX: number;
  track: PuzzleTrackPoint[];
}
