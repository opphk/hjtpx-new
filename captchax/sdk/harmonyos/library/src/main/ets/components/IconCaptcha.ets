@Component
export struct IconCaptcha {
  @State private selectedIcons: IconItem[] = [];
  @State private isVerified: boolean = false;
  @State private verificationStatus: string = '';
  @State private icons: IconItem[] = [];
  @State private correctCount: number = 0;

  @Prop imageUrl: string = '';
  @Prop instruction: string = '请点击所有包含"{target}"的图标';
  @Prop width: number = 300;
  @Prop height: number = 200;

  @Event onVerified: EventEmitter<IconVerifyResult> = new EventEmitter();
  @Event onError: EventEmitter<string> = new EventEmitter();
  @Event onRefresh: EventEmitter<void> = new EventEmitter();

  aboutToAppear() {
    this.generateIcons();
  }

  build() {
    Column() {
      Stack() {
        Image(this.imageUrl)
          .width('100%')
          .height('100%')
          .objectFit(ImageFit.Cover)
          .onClick(() => {
            this.onRefresh.emit();
          })
      }
      .width(this.width)
      .height(this.height)
      .clip(true)
      .borderRadius(8)
      .backgroundColor('#f0f0f0')

      Column() {
        Text(this.instruction)
          .fontSize(14)
          .fontColor('#666666')
          .textAlign(TextAlign.Center)
          .width('100%')
          .padding(12)

        Row() {
          ForEach(this.icons, (icon: IconItem, index: number) => {
            Stack() {
              Image(icon.imageUrl)
                .width(50)
                .height(50)
                .objectFit(ImageFit.Contain)
                .borderRadius(4)
                .opacity(icon.isSelected ? 1 : 0.7)
                .border({
                  width: icon.isSelected ? 2 : 0,
                  color: icon.isCorrect ? '#52c41a' : '#ff4d4f',
                  radius: 4
                })
                .onClick(() => {
                  this.toggleIcon(index);
                })

              if (icon.isSelected) {
                Text(icon.isCorrect ? '✓' : '✗')
                  .fontSize(16)
                  .fontColor(icon.isCorrect ? '#52c41a' : '#ff4d4f')
                  .position({ x: 30, y: -5 })
              }
            }
            .margin({ right: 8, bottom: 8 })
          })
        }
        .width('100%')
        .padding({ left: 12, right: 12, bottom: 8 })
        .justifyContent(FlexAlign.Center)

        Row() {
          Row() {
            ForEach(this.selectedIcons, (icon: IconItem) => {
              Image(icon.imageUrl)
                .width(30)
                .height(30)
                .objectFit(ImageFit.Contain)
                .borderRadius(2)
                .margin({ right: 4 })
            })
          }
          .width('50%')

          Blank()

          Row() {
            Text('刷新')
              .fontSize(14)
              .fontColor('#1890ff')
              .onClick(() => {
                this.resetCaptcha();
                this.onRefresh.emit();
              })
          }
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
    }
    .padding(16)
  }

  private generateIcons() {
    const iconUrls = [
      'https://example.com/icon1.png',
      'https://example.com/icon2.png',
      'https://example.com/icon3.png',
      'https://example.com/icon4.png',
      'https://example.com/icon5.png',
      'https://example.com/icon6.png',
      'https://example.com/icon7.png',
      'https://example.com/icon8.png'
    ];

    this.icons = iconUrls.map((url, index) => ({
      id: `icon_${index}`,
      imageUrl: url,
      isSelected: false,
      isCorrect: Math.random() > 0.5
    }));
  }

  private toggleIcon(index: number) {
    if (this.isVerified) return;

    const icon = this.icons[index];
    icon.isSelected = !icon.isSelected;

    if (icon.isSelected) {
      this.selectedIcons.push(icon);
    } else {
      const idx = this.selectedIcons.findIndex(i => i.id === icon.id);
      if (idx !== -1) {
        this.selectedIcons.splice(idx, 1);
      }
    }

    this.verifyIcons();
  }

  private verifyIcons() {
    const correctIcons = this.icons.filter(i => i.isCorrect);
    const selectedCorrectIcons = this.selectedIcons.filter(i => i.isCorrect);
    const selectedIncorrectIcons = this.selectedIcons.filter(i => !i.isCorrect);

    const allCorrectSelected = correctIcons.every(i => i.isSelected);
    const noIncorrectSelected = selectedIncorrectIcons.length === 0;
    const isCorrect = allCorrectSelected && noIncorrectSelected;

    this.correctCount = selectedCorrectIcons.length;

    if (this.selectedIcons.length > 0) {
      this.isVerified = isCorrect;

      const result: IconVerifyResult = {
        verified: isCorrect,
        selectedIcons: this.selectedIcons,
        correctCount: selectedCorrectIcons.length,
        totalCorrect: correctIcons.length
      };

      if (isCorrect) {
        this.verificationStatus = '验证成功';
        this.onVerified.emit(result);
      } else if (noIncorrectSelected && selectedCorrectIcons.length === correctIcons.length) {
        this.verificationStatus = '验证成功';
        this.onVerified.emit(result);
      } else {
        this.verificationStatus = `选择了 ${selectedCorrectIcons.length}/${correctIcons.length} 个`;
      }
    }
  }

  private resetCaptcha() {
    this.selectedIcons = [];
    this.isVerified = false;
    this.verificationStatus = '';
    this.correctCount = 0;
    this.generateIcons();
  }

  reset() {
    this.resetCaptcha();
  }

  setVerified(verified: boolean) {
    this.isVerified = verified;
  }
}

interface IconItem {
  id: string;
  imageUrl: string;
  isSelected: boolean;
  isCorrect: boolean;
}

interface IconVerifyResult {
  verified: boolean;
  selectedIcons: IconItem[];
  correctCount: number;
  totalCorrect: number;
}
