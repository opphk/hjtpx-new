import SwiftUI
import CaptchaX

struct ContentView: View {
    @State private var isVerified = false
    @State private var verificationStatus: String = "未验证"
    @State private var showingAlert = false
    @State private var alertMessage = ""
    @State private var showingCaptcha = false
    @State private var selectedCaptchaType: CaptchaType = .slider

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    headerSection

                    statusSection

                    captchaTypeSelector

                    actionButtons
                }
                .padding()
            }
            .background(Color(.systemGroupedBackground))
            .navigationTitle("CaptchaX")
            .navigationBarTitleDisplayMode(.large)
            .alert("验证结果", isPresented: $showingAlert) {
                Button("确定", role: .cancel) { }
            } message: {
                Text(alertMessage)
            }
            .sheet(isPresented: $showingCaptcha) {
                CaptchaView_SwiftUI(
                    captchaType: selectedCaptchaType,
                    scene: "login",
                    onSuccess: { result in
                        handleSuccess(result)
                    },
                    onError: { error in
                        handleError(error)
                    },
                    onClose: {
                        showingCaptcha = false
                    }
                )
            }
        }
    }

    private var headerSection: some View {
        VStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(isVerified ? Color.green.opacity(0.1) : Color.blue.opacity(0.1))
                    .frame(width: 120, height: 120)

                Image(systemName: isVerified ? "checkmark.shield.fill" : "lock.shield.fill")
                    .font(.system(size: 60))
                    .foregroundColor(isVerified ? .green : .blue)
                    .symbolEffect(.bounce, value: isVerified)
            }
            .animation(.spring(response: 0.5, dampingFraction: 0.6), value: isVerified)

            Text("CaptchaX iOS SDK")
                .font(.title)
                .fontWeight(.bold)

            Text("SwiftUI 示例")
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        .padding(.vertical)
    }

    private var statusSection: some View {
        HStack {
            Image(systemName: isVerified ? "checkmark.circle.fill" : "circle")
                .foregroundColor(isVerified ? .green : .gray)
                .font(.title2)

            Text("状态: \(verificationStatus)")
                .font(.headline)

            Spacer()

            if isVerified {
                Text("已验证")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Color.green)
                    .clipShape(Capsule())
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    private var captchaTypeSelector: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("选择验证类型")
                .font(.headline)
                .foregroundColor(.primary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 12) {
                ForEach(CaptchaType.allCases, id: \.self) { type in
                    CaptchaTypeButton(
                        type: type,
                        isSelected: selectedCaptchaType == type
                    ) {
                        withAnimation(.spring(response: 0.3)) {
                            selectedCaptchaType = type
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 8, x: 0, y: 4)
    }

    private var actionButtons: some View {
        VStack(spacing: 12) {
            Button(action: performVerification) {
                HStack {
                    Image(systemName: "checkmark.shield")
                    Text(isVerified ? "重新验证" : "开始验证")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(isVerified ? Color.orange : Color.blue)
                .foregroundColor(.white)
                .cornerRadius(16)
                .font(.headline)
            }
            .scaleEffect(isVerified ? 0.95 : 1.0)
            .animation(.spring(response: 0.3), value: isVerified)

            Button(action: {
                showingCaptcha = true
            }) {
                HStack {
                    Image(systemName: selectedCaptchaType.icon)
                    Text("打开\(selectedCaptchaType.displayName)")
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color(.secondarySystemGroupedBackground))
                .foregroundColor(.primary)
                .cornerRadius(16)
                .font(.headline)
            }

            HStack(spacing: 12) {
                Button(action: {
                    CaptchaX.shared.preload(scene: "login")
                    alertMessage = "预加载成功"
                    showingAlert = true
                }) {
                    HStack {
                        Image(systemName: "arrow.down.circle")
                        Text("预加载")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.tertiarySystemGroupedBackground))
                    .foregroundColor(.secondary)
                    .cornerRadius(16)
                }

                Button(action: {
                    CacheManager.shared.clearCache()
                    alertMessage = "缓存已清除"
                    showingAlert = true
                }) {
                    HStack {
                        Image(systemName: "trash")
                        Text("清除缓存")
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color(.tertiarySystemGroupedBackground))
                    .foregroundColor(.secondary)
                    .cornerRadius(16)
                }
            }
        }
    }

    private func performVerification() {
        CaptchaX.shared.verify(scene: "login") { result in
            handleResult(result)
        }
    }

    private func handleSuccess(_ result: CaptchaResult) {
        isVerified = true
        verificationStatus = "已验证"
        alertMessage = "验证成功！Token: \(result.token.prefix(20))..."
        showingAlert = true
        showingCaptcha = false
    }

    private func handleError(_ error: Error) {
        alertMessage = "验证失败: \(error.localizedDescription)"
        showingAlert = true
    }

    private func handleResult(_ result: Result<CaptchaResult, Error>) {
        switch result {
        case .success(let captchaResult):
            handleSuccess(captchaResult)
        case .failure(let error):
            handleError(error)
        }
    }
}

struct CaptchaTypeButton: View {
    let type: CaptchaType
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: type.icon)
                    .font(.title2)
                    .foregroundColor(isSelected ? .white : .blue)

                Text(type.displayName)
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundColor(isSelected ? .white : .primary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isSelected ? Color.blue : Color(.tertiarySystemGroupedBackground))
            .cornerRadius(12)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ContentView()
}
