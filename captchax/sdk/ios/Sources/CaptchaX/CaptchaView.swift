import UIKit
import WebKit
import SnapKit

public class CaptchaView: UIView {
    public var onSuccess: ((String) -> Void)?
    public var onError: ((Error) -> Void)?
    public var onClose: (() -> Void)?

    private var webView: WKWebView?
    private var loadingView: UIActivityIndicatorView?
    private var closeButton: UIButton?
    private var containerView: UIView?
    private var currentType: CaptchaType = .slider
    private var isLoading = false

    private let containerCornerRadius: CGFloat = 24
    private let shadowRadius: CGFloat = 20
    private let shadowOpacity: Float = 0.2

    private var widthConstraint: Constraint?
    private var heightConstraint: Constraint?

    public override init(frame: CGRect) {
        super.init(frame: frame)
        setupBaseUI()
    }

    public required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupBaseUI()
    }

    private func setupBaseUI() {
        backgroundColor = UIColor.black.withAlphaComponent(0.5)
        alpha = 0

        containerView = UIView()
        containerView?.backgroundColor = .systemBackground
        containerView?.layer.cornerRadius = containerCornerRadius
        containerView?.layer.shadowColor = UIColor.black.cgColor
        containerView?.layer.shadowOffset = CGSize(width: 0, height: 10)
        containerView?.layer.shadowRadius = shadowRadius
        containerView?.layer.shadowOpacity = shadowOpacity
        containerView?.clipsToBounds = false

        if let container = containerView {
            addSubview(container)
            container.snp.makeConstraints { make in
                make.center.equalToSuperview()
                self.widthConstraint = make.width.equalTo(min(UIScreen.main.bounds.width - 40, 400)).constraint
                self.heightConstraint = make.height.equalTo(450).constraint
            }
        }

        setupCloseButton()
        setupLoadingView()
        setupResponsiveLayout()
    }

    private func setupResponsiveLayout() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOrientationChange),
            name: UIDevice.orientationDidChangeNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboardShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleKeyboardHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    @objc private func handleOrientationChange() {
        guard let container = containerView else { return }

        let screenWidth = UIScreen.main.bounds.width
        let maxWidth = min(screenWidth - 40, 400)

        widthConstraint?.update(offset: maxWidth)

        if UIDevice.current.userInterfaceIdiom == .pad {
            heightConstraint?.update(offset: 500)
        }

        UIView.animate(withDuration: 0.3) {
            container.layoutIfNeeded()
        }
    }

    @objc private func handleKeyboardShow(_ notification: Notification) {
        guard let container = containerView else { return }

        if let keyboardFrame = notification.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect {
            let keyboardHeight = keyboardFrame.height
            let availableHeight = bounds.height - keyboardHeight

            heightConstraint?.update(offset: min(availableHeight - 40, 450))

            UIView.animate(withDuration: 0.3) {
                container.transform = CGAffineTransform(translationX: 0, y: -keyboardHeight / 3)
                container.layoutIfNeeded()
            }
        }
    }

    @objc private func handleKeyboardHide(_ notification: Notification) {
        guard let container = containerView else { return }

        heightConstraint?.update(offset: 450)

        UIView.animate(withDuration: 0.3) {
            container.transform = .identity
            container.layoutIfNeeded()
        }
    }

    private func setupCloseButton() {
        closeButton = UIButton(type: .system)
        closeButton?.setImage(UIImage(systemName: "xmark.circle.fill"), for: .normal)
        closeButton?.tintColor = .secondaryLabel
        closeButton?.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        if let container = containerView, let button = closeButton {
            container.addSubview(button)
            button.snp.makeConstraints { make in
                make.top.equalToSuperview().offset(16)
                make.trailing.equalToSuperview().offset(-16)
                make.width.height.equalTo(30)
            }
        }
    }

    private func setupLoadingView() {
        loadingView = UIActivityIndicatorView(style: .large)
        loadingView?.color = .systemBlue
        loadingView?.hidesWhenStopped = true

        if let container = containerView, let loader = loadingView {
            container.addSubview(loader)
            loader.snp.makeConstraints { make in
                make.center.equalToSuperview()
            }
        }
    }

    public func load(captchaType: CaptchaType) {
        currentType = captchaType
        showWithAnimation()

        if CaptchaX.shared.config.cacheEnabled {
            preloadResources(for: captchaType)
        }

        loadCaptchaContent()
    }

    private func loadCaptchaContent() {
        isLoading = true
        loadingView?.startAnimating()

        let config = WKWebViewConfiguration()
        config.preferences.javaScriptEnabled = true
        config.allowsInlineMediaPlayback = true

        let contentController = WKUserContentController()
        contentController.add(self, name: "captchaSuccess")
        contentController.add(self, name: "captchaError")
        config.userContentController = contentController

        webView?.removeFromSuperview()
        webView = WKWebView(frame: containerView?.bounds ?? .zero, configuration: config)
        webView?.navigationDelegate = self
        webView?.scrollView.isScrollEnabled = false
        webView?.backgroundColor = .clear
        webView?.isOpaque = false

        if let container = containerView, let wv = webView {
            container.insertSubview(wv, at: 0)
            wv.snp.makeConstraints { make in
                make.edges.equalToSuperview()
            }
        }

        let baseURL = CaptchaX.shared.config.serverURL
        let widgetURL = "\(baseURL)/widget?type=\(captchaType.rawValue)&appId=\(CaptchaX.shared.config.apiKey)"

        if let url = URL(string: widgetURL) {
            let request = URLRequest(url: url)
            webView?.load(request)
        } else {
            loadDemoContent()
        }
    }

    private func loadDemoContent() {
        let demoHTML = generateDemoHTML(for: currentType)
        webView?.loadHTMLString(demoHTML, baseURL: URL(string: CaptchaX.shared.config.serverURL))
    }

    private func generateDemoHTML(for type: CaptchaType) -> String {
        switch type {
        case .slider:
            return generateSliderHTML()
        case .click:
            return generateClickHTML()
        case .rotate:
            return generateRotateHTML()
        case .puzzle:
            return generatePuzzleHTML()
        case .text:
            return generateTextHTML()
        case .icon:
            return generateIconHTML()
        }
    }

    private func generateSliderHTML() -> String {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: transparent; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h3 { color: #333; margin-bottom: 12px; text-align: center; font-size: 18px; }
                p { color: #666; margin-bottom: 16px; text-align: center; font-size: 14px; }
                .captcha-area { width: 100%; height: 180px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin-bottom: 20px; border-radius: 12px; position: relative; overflow: hidden; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2); }
                .slider { width: 50px; height: 50px; background: white; border-radius: 50%; position: absolute; top: 65px; left: 10px; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transition: transform 0.1s; }
                .slider:active { transform: scale(1.1); }
                .slider::after { content: '→'; font-size: 20px; color: #667eea; font-weight: bold; }
                .target { width: 45px; height: 45px; background: rgba(255,255,255,0.3); position: absolute; top: 67px; right: 60px; border-radius: 8px; border: 2px solid white; }
                .track { width: 100%; height: 45px; background: #f0f0f0; margin: 16px 0; border-radius: 22px; position: relative; overflow: hidden; }
                .track-fill { height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); width: 0%; border-radius: 22px; transition: width 0.1s; }
                .success { display: none; color: #4caf50; font-size: 20px; text-align: center; margin-top: 16px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h3>滑块验证</h3>
                <p>请将滑块拖动到最右侧</p>
                <div class="captcha-area">
                    <div class="target"></div>
                    <div class="slider" id="slider"></div>
                </div>
                <div class="track">
                    <div class="track-fill" id="trackFill"></div>
                </div>
                <div class="success" id="success">✓ 验证成功</div>
            </div>
            <script>
                const slider = document.getElementById('slider');
                const trackFill = document.getElementById('trackFill');
                const success = document.getElementById('success');
                const captchaArea = document.querySelector('.captcha-area');
                let isDragging = false;
                let startX = 0;
                const maxOffset = captchaArea.offsetWidth - 60;
                const trackWidth = document.querySelector('.track').offsetWidth;

                slider.addEventListener('touchstart', (e) => { isDragging = true; startX = e.touches[0].clientX - slider.offsetLeft; });
                document.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    e.preventDefault();
                    let newX = e.touches[0].clientX - startX;
                    newX = Math.max(0, Math.min(newX, maxOffset));
                    slider.style.left = newX + 'px';
                    trackFill.style.width = (newX / maxOffset * 100) + '%';
                });
                document.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    const pos = parseInt(slider.style.left || '0');
                    if (pos > maxOffset * 0.85) {
                        slider.style.left = maxOffset + 'px';
                        trackFill.style.width = '100%';
                        success.style.display = 'block';
                        setTimeout(() => { window.webkit.messageHandlers.captchaSuccess.postMessage({token: 'demo_token_\(UUID().uuidString)'}); }, 500);
                    } else {
                        slider.style.left = '0px';
                        trackFill.style.width = '0%';
                    }
                });
            </script>
        </body>
        </html>
        """
    }

    private func generateClickHTML() -> String {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: transparent; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h3 { color: #333; margin-bottom: 8px; text-align: center; font-size: 18px; }
                .instruction { color: #666; margin-bottom: 16px; text-align: center; font-size: 14px; }
                .captcha-area { width: 100%; height: 200px; background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); margin-bottom: 16px; border-radius: 12px; position: relative; display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; padding: 16px; }
                .click-item { width: 100%; aspect-ratio: 1; background: white; border-radius: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 36px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.2s; }
                .click-item:active { transform: scale(0.95); }
                .click-item.selected { background: #81c784; box-shadow: 0 4px 12px rgba(129, 199, 132, 0.4); }
                .success { display: none; color: #4caf50; font-size: 20px; text-align: center; margin-top: 16px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h3>点选验证</h3>
                <p class="instruction">请依次点击: 太阳</p>
                <div class="captcha-area" id="area">
                    <div class="click-item" data-value="sun">☀️</div>
                    <div class="click-item" data-value="moon">🌙</div>
                    <div class="click-item" data-value="star">⭐</div>
                    <div class="click-item" data-value="sun">☀️</div>
                    <div class="click-item" data-value="cloud">☁️</div>
                    <div class="click-item" data-value="rain">🌧️</div>
                </div>
                <div class="success" id="success">✓ 验证成功</div>
            </div>
            <script>
                const items = document.querySelectorAll('.click-item');
                const success = document.getElementById('success');
                let selected = [];

                items.forEach(item => {
                    item.addEventListener('click', () => {
                        item.classList.add('selected');
                        selected.push(item.dataset.value);

                        if (selected.filter(v => v === 'sun').length >= 2) {
                            success.style.display = 'block';
                            setTimeout(() => { window.webkit.messageHandlers.captchaSuccess.postMessage({token: 'demo_token_\(UUID().uuidString)'}); }, 500);
                        }
                    });
                });
            </script>
        </body>
        </html>
        """
    }

    private func generateRotateHTML() -> String {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: transparent; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h3 { color: #333; margin-bottom: 8px; text-align: center; font-size: 18px; }
                p { color: #666; margin-bottom: 16px; text-align: center; font-size: 14px; }
                .captcha-area { width: 180px; height: 180px; margin: 0 auto 16px; position: relative; }
                .puzzle-image { width: 100%; height: 100%; background: linear-gradient(45deg, #ff6b6b 25%, #4ecdc4 50%, #45b7d1 75%); border-radius: 16px; transition: transform 0.1s; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
                .puzzle-image::after { content: '↑'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 40px; color: white; font-weight: bold; }
                .slider-container { width: 100%; margin-bottom: 16px; }
                input[type="range"] { width: 100%; height: 8px; border-radius: 4px; background: #f0f0f0; outline: none; -webkit-appearance: none; }
                input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 24px; height: 24px; border-radius: 50%; background: #4ecdc4; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
                .angle { text-align: center; font-size: 16px; color: #333; margin-top: 8px; font-weight: bold; }
                button { display: block; width: 100%; padding: 14px; background: linear-gradient(135deg, #4ecdc4, #44a08d); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3); transition: transform 0.2s; }
                button:active { transform: scale(0.98); }
            </style>
        </head>
        <body>
            <div class="container">
                <h3>旋转验证</h3>
                <p>将图片旋转至正确方向 (箭头朝上)</p>
                <div class="captcha-area">
                    <div class="puzzle-image" id="puzzle"></div>
                </div>
                <div class="slider-container">
                    <input type="range" id="rotateSlider" min="0" max="360" value="0">
                    <p class="angle" id="angle">0°</p>
                </div>
                <button onclick="checkRotation()">确认</button>
            </div>
            <script>
                const slider = document.getElementById('rotateSlider');
                const puzzle = document.getElementById('puzzle');
                const angleText = document.getElementById('angle');

                slider.addEventListener('input', () => {
                    puzzle.style.transform = 'rotate(' + slider.value + 'deg)';
                    angleText.textContent = slider.value + '°';
                });

                function checkRotation() {
                    const angle = parseInt(slider.value) % 360;
                    if (angle < 10 || angle > 350) {
                        window.webkit.messageHandlers.captchaSuccess.postMessage({token: 'demo_token_\(UUID().uuidString)'});
                    } else {
                        slider.value = 0;
                        puzzle.style.transform = 'rotate(0deg)';
                        angleText.textContent = '0°';
                    }
                }
            </script>
        </body>
        </html>
        """
    }

    private func generatePuzzleHTML() -> String {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: transparent; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h3 { color: #333; margin-bottom: 8px; text-align: center; font-size: 18px; }
                p { color: #666; margin-bottom: 16px; text-align: center; font-size: 14px; }
                .captcha-area { width: 100%; height: 180px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); margin-bottom: 16px; border-radius: 12px; position: relative; overflow: hidden; box-shadow: inset 0 2px 10px rgba(0,0,0,0.2); }
                .puzzle-piece { width: 60px; height: 60px; background: white; position: absolute; border-radius: 8px; top: 60px; left: 10px; cursor: grab; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 24px; transition: transform 0.1s; }
                .puzzle-piece:active { cursor: grabbing; transform: scale(1.1); }
                .target-slot { width: 60px; height: 60px; border: 3px dashed rgba(255,255,255,0.8); position: absolute; border-radius: 8px; top: 60px; right: 70px; }
                .hint { text-align: center; color: white; font-size: 14px; margin-top: -140px; position: relative; z-index: 10; }
                .success { display: none; color: #4caf50; font-size: 20px; text-align: center; margin-top: 16px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h3>拼图验证</h3>
                <p>将拼图拖动到虚线框内</p>
                <div class="captcha-area">
                    <div class="target-slot"></div>
                    <div class="puzzle-piece" id="piece">🧩</div>
                </div>
                <div class="success" id="success">✓ 验证成功</div>
            </div>
            <script>
                const piece = document.getElementById('piece');
                const captchaArea = document.querySelector('.captcha-area');
                const success = document.getElementById('success');
                let isDragging = false;
                let startX, startY;
                const maxX = captchaArea.offsetWidth - 70;
                const maxY = captchaArea.offsetHeight - 70;

                piece.addEventListener('touchstart', (e) => {
                    isDragging = true;
                    startX = e.touches[0].clientX - piece.offsetLeft;
                    startY = e.touches[0].clientY - piece.offsetTop;
                });

                document.addEventListener('touchmove', (e) => {
                    if (!isDragging) return;
                    e.preventDefault();
                    let newX = e.touches[0].clientX - startX;
                    let newY = e.touches[0].clientY - startY;
                    newX = Math.max(0, Math.min(newX, maxX));
                    newY = Math.max(0, Math.min(newY, maxY));
                    piece.style.left = newX + 'px';
                    piece.style.top = newY + 'px';
                });

                document.addEventListener('touchend', () => {
                    if (!isDragging) return;
                    isDragging = false;
                    const left = parseInt(piece.style.left || '0');
                    const top = parseInt(piece.style.top || '0');

                    if (left > 150 && left < 230 && top > 40 && top < 100) {
                        piece.style.left = '190px';
                        piece.style.top = '60px';
                        success.style.display = 'block';
                        setTimeout(() => { window.webkit.messageHandlers.captchaSuccess.postMessage({token: 'demo_token_\(UUID().uuidString)'}); }, 500);
                    }
                });
            </script>
        </body>
        </html>
        """
    }

    private func generateTextHTML() -> String {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: transparent; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h3 { color: #333; margin-bottom: 8px; text-align: center; font-size: 18px; }
                p { color: #666; margin-bottom: 16px; text-align: center; font-size: 14px; }
                .captcha-code { font-size: 36px; font-weight: bold; letter-spacing: 12px; color: #333; background: linear-gradient(135deg, #f5f5f5, #e0e0e0); padding: 20px; border-radius: 12px; margin-bottom: 20px; display: flex; justify-content: center; gap: 8px; }
                .captcha-char { display: inline-block; animation: float 2s ease-in-out infinite; }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                input { width: 100%; padding: 14px; font-size: 20px; border: 2px solid #e0e0e0; border-radius: 12px; margin-bottom: 16px; text-align: center; letter-spacing: 8px; font-weight: bold; outline: none; transition: border-color 0.2s; }
                input:focus { border-color: #667eea; }
                button { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); transition: transform 0.2s; }
                button:active { transform: scale(0.98); }
            </style>
        </head>
        <body>
            <div class="container">
                <h3>文字验证</h3>
                <p>请输入下方验证码</p>
                <div class="captcha-code" id="code"></div>
                <input type="text" id="input" maxlength="4" placeholder="请输入验证码" autocomplete="off">
                <button onclick="verify()">验证</button>
            </div>
            <script>
                function generateCode() {
                    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                    let code = '';
                    for (let i = 0; i < 4; i++) {
                        code += '<span class="captcha-char" style="animation-delay: ' + (i * 0.2) + 's">' + chars.charAt(Math.floor(Math.random() * chars.length)) + '</span>';
                    }
                    document.getElementById('code').innerHTML = code;
                    return code.replace(/<[^>]*>/g, '');
                }

                let currentCode = generateCode();

                function verify() {
                    const input = document.getElementById('input').value.toUpperCase();
                    if (input === currentCode) {
                        window.webkit.messageHandlers.captchaSuccess.postMessage({token: 'demo_token_\(UUID().uuidString)'});
                    } else {
                        document.getElementById('input').value = '';
                        currentCode = generateCode();
                        document.getElementById('input').focus();
                    }
                }
            </script>
        </body>
        </html>
        """
    }

    private func generateIconHTML() -> String {
        return """
        <!DOCTYPE html>
        <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: transparent; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
                .container { background: white; border-radius: 16px; padding: 24px; width: 100%; max-width: 350px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
                h3 { color: #333; margin-bottom: 8px; text-align: center; font-size: 18px; }
                p { color: #666; margin-bottom: 16px; text-align: center; font-size: 14px; }
                .icon-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; margin-bottom: 16px; }
                .icon-item { width: 100%; aspect-ratio: 1; background: #f5f5f5; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 32px; cursor: pointer; border: 3px solid transparent; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .icon-item:active { transform: scale(0.95); }
                .icon-item.selected { border-color: #667eea; background: #e8eaf6; transform: scale(1.05); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3); }
                .success { display: none; color: #4caf50; font-size: 20px; text-align: center; margin-top: 16px; font-weight: bold; }
            </style>
        </head>
        <body>
            <div class="container">
                <h3>图标验证</h3>
                <p>请选择所有包含「月亮」的图标</p>
                <div class="icon-grid" id="grid"></div>
                <div class="success" id="success">✓ 验证成功</div>
            </div>
            <script>
                const icons = ['☀️', '🌙', '⭐', '☁️', '🌧️', '❄️', '🌈', '⚡'];
                const grid = document.getElementById('grid');
                const success = document.getElementById('success');
                let selected = [];

                icons.forEach((icon, i) => {
                    const div = document.createElement('div');
                    div.className = 'icon-item';
                    div.textContent = icon;
                    div.onclick = () => {
                        div.classList.toggle('selected');
                        if (div.classList.contains('selected')) selected.push(i);
                        else selected = selected.filter(s => s !== i);

                        if (selected.length >= 2 && selected.includes(1) && selected.includes(5)) {
                            success.style.display = 'block';
                            setTimeout(() => { window.webkit.messageHandlers.captchaSuccess.postMessage({token: 'demo_token_\(UUID().uuidString)'}); }, 500);
                        }
                    };
                    grid.appendChild(div);
                });
            </script>
        </body>
        </html>
        """
    }

    private func preloadResources(for type: CaptchaType) {
        Logger.debug("Preloading resources for \(type.rawValue) captcha")
    }

    @objc private func closeTapped() {
        onClose?()
        destroy()
    }

    public func reset() {
        webView?.removeFromSuperview()
        webView = nil
        isLoading = true
        loadingView?.startAnimating()
        loadCaptchaContent()
    }

    public func destroy() {
        hideWithAnimation()

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.webView?.removeFromSuperview()
            self?.webView = nil
            self?.isLoading = false
            self?.loadingView?.stopAnimating()
        }

        NotificationCenter.default.removeObserver(self)
    }

    private func showWithAnimation() {
        UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.8, initialSpringVelocity: 0.5) {
            self.alpha = 1
            self.containerView?.transform = .identity
        }
    }

    private func hideWithAnimation() {
        UIView.animate(withDuration: 0.3) {
            self.alpha = 0
            self.containerView?.transform = CGAffineTransform(scaleX: 0.9, y: 0.9)
        }
    }
}

extension CaptchaView: WKNavigationDelegate {
    public func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        isLoading = false
        loadingView?.stopAnimating()
    }

    public func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        loadingView?.stopAnimating()
        onError?(CaptchaXError.networkError(underlying: error))
    }

    public func webView(_ webView: WKWebView, decidePolicyFor navigationResponse: WKNavigationResponse, decisionHandler: @escaping (WKNavigationResponsePolicy) -> Void) {
        decisionHandler(.allow)
    }
}

extension CaptchaView: WKScriptMessageHandler {
    public func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        switch message.name {
        case "captchaSuccess":
            if let body = message.body as? [String: Any],
               let token = body["token"] as? String {
                onSuccess?(token)
            }
        case "captchaError":
            if let body = message.body as? [String: Any],
               let errorMessage = body["error"] as? String {
                onError?(CaptchaXError.verificationFailed)
            }
        default:
            break
        }
    }
}
