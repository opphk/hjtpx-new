import SwiftUI

public struct CaptchaView_SwiftUI: View {
    let captchaType: CaptchaType
    let scene: String
    let onSuccess: (CaptchaResult) -> Void
    let onError: (Error) -> Void
    let onClose: () -> Void

    @State private var isLoading = true
    @State private var isSuccess = false
    @State private var sliderPosition: CGFloat = 0
    @State private var isDragging = false
    @State private var selectedIcons: Set<Int> = []
    @State private var rotationAngle: Double = 0
    @State private var textInput: String = ""
    @State private var puzzleOffset: CGSize = .zero
    @State private var clickItems: [ClickItem] = []
    @State private var clickCount = 0
    @Environment(\.dismiss) private var dismiss

    public init(
        captchaType: CaptchaType,
        scene: String,
        onSuccess: @escaping (CaptchaResult) -> Void,
        onError: @escaping (Error) -> Void,
        onClose: @escaping () -> Void
    ) {
        self.captchaType = captchaType
        self.scene = scene
        self.onSuccess = onSuccess
        self.onError = onError
        self.onClose = onClose
    }

    public var body: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()
                .onTapGesture {
                    onClose()
                }

            VStack(spacing: 0) {
                header

                captchaContent
                    .frame(height: 400)
                    .padding()

                footer
            }
            .frame(maxWidth: 400)
            .background(Color(.systemBackground))
            .cornerRadius(24)
            .shadow(color: .black.opacity(0.2), radius: 20, x: 0, y: 10)
            .padding()
        }
        .onAppear {
            setupCaptcha()
        }
    }

    private var header: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(captchaType.displayName)
                    .font(.headline)
                    .foregroundColor(.primary)

                Text(captchaType.description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            Spacer()

            Button(action: {
                onClose()
            }) {
                Image(systemName: "xmark.circle.fill")
                    .font(.title2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
    }

    @ViewBuilder
    private var captchaContent: some View {
        switch captchaType {
        case .slider:
            SliderCaptchaView(
                isLoading: $isLoading,
                isSuccess: $isSuccess,
                sliderPosition: $sliderPosition,
                isDragging: $isDragging,
                onSuccess: handleSuccess
            )

        case .click:
            ClickCaptchaView(
                isLoading: $isLoading,
                isSuccess: $isSuccess,
                selectedItems: $selectedIcons,
                onSuccess: handleSuccess
            )

        case .rotate:
            RotateCaptchaView(
                isLoading: $isLoading,
                isSuccess: $isSuccess,
                rotationAngle: $rotationAngle,
                onSuccess: handleSuccess
            )

        case .puzzle:
            PuzzleCaptchaView(
                isLoading: $isLoading,
                isSuccess: $isSuccess,
                puzzleOffset: $puzzleOffset,
                onSuccess: handleSuccess
            )

        case .text:
            TextCaptchaView(
                isLoading: $isLoading,
                isSuccess: $isSuccess,
                textInput: $textInput,
                onSuccess: handleSuccess
            )

        case .icon:
            IconCaptchaView(
                isLoading: $isLoading,
                isSuccess: $isSuccess,
                selectedIcons: $selectedIcons,
                onSuccess: handleSuccess
            )
        }
    }

    private var footer: some View {
        HStack {
            Button(action: {
                resetCaptcha()
            }) {
                Label("重置", systemImage: "arrow.counterclockwise")
                    .font(.subheadline)
            }
            .foregroundColor(.blue)

            Spacer()

            if isLoading {
                ProgressView()
                    .scaleEffect(0.8)
            } else if isSuccess {
                Label("验证成功", systemImage: "checkmark.circle.fill")
                    .font(.subheadline)
                    .foregroundColor(.green)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
    }

    private func setupCaptcha() {
        isLoading = true
        isSuccess = false
        sliderPosition = 0
        selectedIcons = []
        rotationAngle = 0
        textInput = ""
        puzzleOffset = .zero
        clickItems = generateClickItems()
        clickCount = 0

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            isLoading = false
        }
    }

    private func resetCaptcha() {
        withAnimation(.spring()) {
            setupCaptcha()
        }
    }

    private func handleSuccess() {
        withAnimation(.spring(response: 0.5, dampingFraction: 0.6)) {
            isSuccess = true
        }

        let result = CaptchaResult(
            token: "swiftui_token_\(UUID().uuidString)",
            expiresAt: Date().adding(minutes: 5)
        )

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            onSuccess(result)
        }
    }

    private func generateClickItems() -> [ClickItem] {
        let icons = ["☀️", "🌙", "⭐", "☁️", "🌧️", "❄️", "🌈", "⚡"]
        let targets = [0, 3, 6]

        return icons.enumerated().map { index, icon in
            ClickItem(
                id: index,
                icon: icon,
                isTarget: targets.contains(index)
            )
        }
    }
}

struct SliderCaptchaView: View {
    @Binding var isLoading: Bool
    @Binding var isSuccess: Bool
    @Binding var sliderPosition: CGFloat
    @Binding var isDragging: Bool
    let onSuccess: () -> Void

    @State private var trackWidth: CGFloat = 0

    var body: some View {
        GeometryReader { geometry in
            VStack(spacing: 20) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [Color.blue.opacity(0.3), Color.purple.opacity(0.3)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(height: 200)

                    if isLoading {
                        ProgressView()
                    } else {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 40))
                            .foregroundColor(.white.opacity(0.5))
                    }
                }

                VStack(spacing: 8) {
                    Text("请将滑块拖动到最右侧")
                        .font(.subheadline)
                        .foregroundColor(.secondary)

                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 20)
                            .fill(Color.gray.opacity(0.3))
                            .frame(height: 50)

                        RoundedRectangle(cornerRadius: 20)
                            .fill(
                                LinearGradient(
                                    colors: [Color.blue, Color.purple],
                                    startPoint: .leading,
                                    endPoint: .trailing
                                )
                            )
                            .frame(width: max(0, sliderPosition - 4), height: 42)
                            .padding(.horizontal, 4)

                        if !isSuccess {
                            Circle()
                                .fill(Color.white)
                                .frame(width: 46, height: 46)
                                .overlay(
                                    Image(systemName: "chevron.right.2")
                                        .foregroundColor(.blue)
                                )
                                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                                .offset(x: sliderPosition - 23)
                                .gesture(
                                    DragGesture()
                                        .onChanged { value in
                                            isDragging = true
                                            sliderPosition = min(max(0, value.location.x), trackWidth - 46)
                                        }
                                        .onEnded { _ in
                                            isDragging = false
                                            checkSliderPosition()
                                        }
                                )
                        } else {
                            Circle()
                                .fill(Color.green)
                                .frame(width: 46, height: 46)
                                .overlay(
                                    Image(systemName: "checkmark")
                                        .foregroundColor(.white)
                                )
                                .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                                .offset(x: trackWidth - 69)
                        }
                    }
                    .frame(height: 50)
                    .background(
                        GeometryReader { geo in
                            Color.clear.onAppear {
                                trackWidth = geo.size.width
                            }
                        }
                    )
                }
            }
        }
    }

    private func checkSliderPosition() {
        let threshold = trackWidth * 0.85

        withAnimation(.spring()) {
            if sliderPosition > threshold {
                sliderPosition = trackWidth - 46
                isSuccess = true
                onSuccess()
            } else {
                sliderPosition = 0
            }
        }
    }
}

struct ClickCaptchaView: View {
    @Binding var isLoading: Bool
    @Binding var isSuccess: Bool
    @Binding var selectedItems: Set<Int>
    let onSuccess: () -> Void

    let icons = ["☀️", "🌙", "⭐", "☁️", "🌧️", "❄️", "🌈", "⚡"]
    let targetIndex = 1

    var body: some View {
        VStack(spacing: 20) {
            Text("请点击所有月亮 🌙")
                .font(.headline)
                .foregroundColor(.primary)

            if isLoading {
                ProgressView()
                    .frame(height: 200)
            } else {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
                    ForEach(0..<icons.count, id: \.self) { index in
                        Button(action: {
                            toggleSelection(index)
                        }) {
                            Text(icons[index])
                                .font(.system(size: 32))
                                .frame(width: 70, height: 70)
                                .background(
                                    selectedItems.contains(index) ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1)
                                )
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            selectedItems.contains(index) ? Color.blue : Color.clear,
                                            lineWidth: 3
                                        )
                                )
                                .scaleEffect(selectedItems.contains(index) ? 1.1 : 1.0)
                        }
                        .buttonStyle(.plain)
                        .animation(.spring(response: 0.3), value: selectedItems.contains(index))
                    }
                }
            }
        }
    }

    private func toggleSelection(_ index: Int) {
        guard !isSuccess else { return }

        withAnimation(.spring()) {
            if selectedItems.contains(index) {
                selectedItems.remove(index)
            } else {
                selectedItems.insert(index)
            }
        }

        if selectedItems.count >= 2 && selectedItems.contains(targetIndex) && selectedItems.contains(5) {
            isSuccess = true
            onSuccess()
        }
    }
}

struct RotateCaptchaView: View {
    @Binding var isLoading: Bool
    @Binding var isSuccess: Bool
    @Binding var rotationAngle: Double
    let onSuccess: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Text("将图片旋转至正确方向 (0°)")
                .font(.headline)
                .foregroundColor(.primary)

            if isLoading {
                ProgressView()
                    .frame(width: 200, height: 200)
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(
                            LinearGradient(
                                colors: [Color.orange, Color.red, Color.pink],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(width: 200, height: 200)
                        .shadow(color: .black.opacity(0.2), radius: 10, x: 0, y: 5)

                    Image(systemName: "arrow.up")
                        .font(.system(size: 60, weight: .bold))
                        .foregroundColor(.white)
                        .rotationEffect(.degrees(rotationAngle))
                }

                Slider(value: $rotationAngle, in: 0...360, step: 1) {
                    Text("旋转角度")
                }
                .padding(.horizontal)

                Button(action: {
                    checkRotation()
                }) {
                    Text("确认")
                        .font(.headline)
                        .foregroundColor(.white)
                        .frame(width: 200)
                        .padding()
                        .background(Color.blue)
                        .cornerRadius(12)
                }
            }
        }
    }

    private func checkRotation() {
        let normalizedAngle = rotationAngle.truncatingRemainder(dividingBy: 360)

        if normalizedAngle < 10 || normalizedAngle > 350 {
            withAnimation(.spring()) {
                isSuccess = true
            }
            onSuccess()
        } else {
            withAnimation(.spring()) {
                rotationAngle = 0
            }
        }
    }
}

struct PuzzleCaptchaView: View {
    @Binding var isLoading: Bool
    @Binding var isSuccess: Bool
    @Binding var puzzleOffset: CGSize
    let onSuccess: () -> Void

    @State private var targetPosition: CGFloat = 0

    var body: some View {
        VStack(spacing: 20) {
            Text("将拼图拖动到正确位置")
                .font(.headline)
                .foregroundColor(.primary)

            if isLoading {
                ProgressView()
                    .frame(height: 200)
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(
                            LinearGradient(
                                colors: [Color.green, Color.teal],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                        .frame(height: 200)

                    VStack(spacing: 20) {
                        HStack {
                            Rectangle()
                                .fill(Color.white.opacity(0.3))
                                .frame(width: 60, height: 60)
                                .cornerRadius(8)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 8)
                                        .stroke(style: StrokeStyle(lineWidth: 2, dash: [5]))
                                        )
                                        .foregroundColor(.white)
                                )

                            Spacer()

                            Text("目标位置")
                                .font(.caption)
                                .foregroundColor(.white.opacity(0.7))
                        }
                        .padding(.horizontal)

                        HStack {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(Color.white)
                                .frame(width: 60, height: 60)
                                .shadow(color: .black.opacity(0.3), radius: 5, x: 2, y: 2)
                                .offset(puzzleOffset)
                                .gesture(
                                    DragGesture()
                                        .onChanged { value in
                                            puzzleOffset = value.translation
                                        }
                                        .onEnded { _ in
                                            checkPuzzlePosition()
                                        }
                                )

                            Spacer()
                        }
                        .padding(.horizontal)
                    }
                }
            }
        }
    }

    private func checkPuzzlePosition() {
        let threshold: CGFloat = 30

        withAnimation(.spring()) {
            if abs(puzzleOffset.width - 150) < threshold {
                puzzleOffset = CGSize(width: 150, height: puzzleOffset.height)
                isSuccess = true
                onSuccess()
            } else {
                puzzleOffset = .zero
            }
        }
    }
}

struct TextCaptchaView: View {
    @Binding var isLoading: Bool
    @Binding var isSuccess: Bool
    @Binding var textInput: String
    let onSuccess: () -> Void

    @State private var verificationCode = ""

    private func generateCode() {
        let letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        verificationCode = String((0..<4).map { _ in letters.randomElement()! })
    }

    var body: some View {
        VStack(spacing: 20) {
            Text("请输入下方验证码")
                .font(.headline)
                .foregroundColor(.primary)

            if isLoading {
                ProgressView()
                    .frame(height: 100)
            } else {
                VStack(spacing: 16) {
                    HStack(spacing: 8) {
                        ForEach(Array(verificationCode.enumerated()), id: \.offset) { index, char in
                            Text(String(char))
                                .font(.system(size: 36, weight: .bold, design: .monospaced))
                                .foregroundColor(.primary)
                                .frame(width: 60, height: 80)
                                .background(Color.gray.opacity(0.1))
                                .cornerRadius(8)
                                .rotationEffect(.degrees(Double.random(in: -10...10)))
                        }
                    }

                    TextField("请输入验证码", text: $textInput)
                        .textFieldStyle(.roundedBorder)
                        .frame(width: 280)
                        .textInputAutocapitalization(.characters)
                        .autocorrectionDisabled()
                        .onAppear {
                            generateCode()
                        }

                    Button(action: {
                        verifyCode()
                    }) {
                        Text("验证")
                            .font(.headline)
                            .foregroundColor(.white)
                            .frame(width: 200)
                            .padding()
                            .background(Color.blue)
                            .cornerRadius(12)
                    }

                    Button(action: {
                        textInput = ""
                        generateCode()
                    }) {
                        Label("换一张", systemImage: "arrow.clockwise")
                            .font(.subheadline)
                            .foregroundColor(.blue)
                    }
                }
            }
        }
        .onAppear {
            generateCode()
        }
    }

    private func verifyCode() {
        if textInput.uppercased() == verificationCode {
            withAnimation(.spring()) {
                isSuccess = true
            }
            onSuccess()
        } else {
            withAnimation(.spring()) {
                textInput = ""
            }
            generateCode()
        }
    }
}

struct IconCaptchaView: View {
    @Binding var isLoading: Bool
    @Binding var isSuccess: Bool
    @Binding var selectedIcons: Set<Int>
    let onSuccess: () -> Void

    let icons = ["☀️", "🌙", "⭐", "☁️", "🌧️", "❄️", "🌈", "⚡"]

    var body: some View {
        VStack(spacing: 20) {
            Text("请选择所有包含「🌙」的图标")
                .font(.headline)
                .foregroundColor(.primary)

            if isLoading {
                ProgressView()
                    .frame(height: 200)
            } else {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 12) {
                    ForEach(0..<icons.count, id: \.self) { index in
                        Button(action: {
                            toggleIcon(index)
                        }) {
                            Text(icons[index])
                                .font(.system(size: 32))
                                .frame(width: 70, height: 70)
                                .background(
                                    selectedIcons.contains(index) ? Color.blue.opacity(0.2) : Color.gray.opacity(0.1)
                                )
                                .cornerRadius(12)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(
                                            selectedIcons.contains(index) ? Color.blue : Color.clear,
                                            lineWidth: 3
                                        )
                                )
                                .scaleEffect(selectedIcons.contains(index) ? 1.1 : 1.0)
                        }
                        .buttonStyle(.plain)
                        .animation(.spring(response: 0.3), value: selectedIcons.contains(index))
                    }
                }
            }
        }
    }

    private func toggleIcon(_ index: Int) {
        guard !isSuccess else { return }

        withAnimation(.spring()) {
            if selectedIcons.contains(index) {
                selectedIcons.remove(index)
            } else {
                selectedIcons.insert(index)
            }
        }

        if selectedIcons.count >= 2 && selectedIcons.contains(1) {
            isSuccess = true
            onSuccess()
        }
    }
}

struct ClickItem: Identifiable {
    let id: Int
    let icon: String
    let isTarget: Bool
}

#Preview {
    CaptchaView_SwiftUI(
        captchaType: .slider,
        scene: "test",
        onSuccess: { _ in },
        onError: { _ in },
        onClose: { }
    )
}
