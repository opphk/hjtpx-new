@Component
export struct TextCaptcha {
  @State private userInput: string = '';
  @State private isVerified: boolean = false;
  @State private verificationStatus: string = '';
  @State private isLoading: boolean = false;

  @Prop text: string = '';
  @Prop hint: string = '请输入上方文字';
  @Prop width: number = 300;

  @Event onVerified: EventEmitter<TextVerifyResult> = new EventEmitter();
  @Event onError: EventEmitter<string> = new EventEmitter();
  @Event onRefresh: EventEmitter<void> = new EventEmitter();
  @Event onInputChange: EventEmitter<string> = new EventEmitter();

  private inputController: TextInputController = new TextInputController();

  build() {
    Column() {
      Column() {
        Row() {
          Text(this.text)
            .fontSize(24)
            .fontColor('#333333')
            .fontWeight(FontWeight.Medium)
            .letterSpacing(8)
            .textAlign(TextAlign.Center)
        }
        .width('100%')
        .height(60)
        .justifyContent(FlexAlign.Center)
        .backgroundColor('#f5f5f5')
        .borderRadius(8)
        .onClick(() => {
          this.onRefresh.emit();
        })
      }
      .width(this.width)
      .padding(16)
      .backgroundColor('#ffffff')
      .borderRadius(8)
      .shadow({
        radius: 10,
        color: '#1a000000',
        offsetX: 0,
        offsetY: 2
      })

      Column() {
        TextInput({
          placeholder: this.hint,
          text: this.userInput,
          controller: this.inputController
        })
          .width('100%')
          .height(44)
          .fontSize(16)
          .placeholderFont({
            size: 14,
            weight: FontWeight.Normal
          })
          .backgroundColor('#ffffff')
          .border({
            width: 1,
            color: '#d9d9d9',
            radius: 4
          })
          .padding({ left: 12, right: 12 })
          .onChange((value: string) => {
            this.userInput = value;
            this.onInputChange.emit(value);
          })

        Row() {
          Text('点击文字可刷新')
            .fontSize(12)
            .fontColor('#999999')

          Blank()

          Text('刷新')
            .fontSize(14)
            .fontColor('#1890ff')
            .onClick(() => {
              this.resetInput();
              this.onRefresh.emit();
            })
        }
        .width('100%')
        .padding({ top: 12 })
      }
      .width(this.width)
      .padding(16)
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

  private verifyText() {
    const isCorrect = this.userInput.trim().toLowerCase() === this.text.trim().toLowerCase();

    this.isVerified = isCorrect;

    const result: TextVerifyResult = {
      verified: isCorrect,
      input: this.userInput,
      expected: this.text
    };

    if (isCorrect) {
      this.verificationStatus = '验证成功';
      this.onVerified.emit(result);
    } else {
      this.verificationStatus = '验证失败，请重试';
      this.onError.emit('输入的文字不正确');
      setTimeout(() => {
        this.resetInput();
      }, 1000);
    }
  }

  private resetInput() {
    this.userInput = '';
    this.isVerified = false;
    this.verificationStatus = '';
    this.inputController.stopEditing();
  }

  reset() {
    this.resetInput();
  }

  setVerified(verified: boolean) {
    this.isVerified = verified;
  }

  setText(text: string) {
    this.text = text;
  }

  getInput(): string {
    return this.userInput;
  }

  clearInput() {
    this.userInput = '';
    this.inputController.stopEditing();
  }
}

interface TextVerifyResult {
  verified: boolean;
  input: string;
  expected: string;
}
