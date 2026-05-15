import 'package:flutter/material.dart';
import '../services/captcha_service.dart';
import '../models/captcha_models.dart';

class CaptchaText extends StatefulWidget {
  final Function(CaptchaVerifyResult)? onVerified;
  final Function(String)? onError;
  final Function(CaptchaData)? onLoaded;
  final double width;
  final Color? backgroundColor;
  final Color? inputColor;
  final Color? successColor;
  final Color? errorColor;

  const CaptchaText({
    Key? key,
    this.onVerified,
    this.onError,
    this.onLoaded,
    this.width = 320,
    this.backgroundColor,
    this.inputColor,
    this.successColor,
    this.errorColor,
  }) : super(key: key);

  @override
  State<CaptchaText> createState() => _CaptchaTextState();
}

class _CaptchaTextState extends State<CaptchaText> {
  CaptchaData? _captchaData;
  bool _isLoading = false;
  bool _isVerifying = false;
  bool _isSuccess = false;
  bool _isError = false;
  String? _errorMessage;
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  @override
  void initState() {
    super.initState();
    _loadCaptcha();
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _loadCaptcha() async {
    setState(() {
      _isLoading = true;
      _isError = false;
      _errorMessage = null;
    });

    try {
      final data = await CaptchaX.getCaptcha(CaptchaType.text);
      setState(() {
        _captchaData = data;
        _isLoading = false;
      });
      widget.onLoaded?.call(data);
    } catch (e) {
      setState(() {
        _isLoading = false;
        _isError = true;
        _errorMessage = e.toString();
      });
      widget.onError?.call(e.toString());
    }
  }

  Future<void> _verifyCaptcha() async {
    if (_captchaData == null || _isVerifying) return;

    final userInput = _textController.text.trim();
    if (userInput.isEmpty) {
      setState(() {
        _isError = true;
        _errorMessage = '请输入验证码';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
      _isError = false;
    });

    try {
      final result = await CaptchaX.verify(
        CaptchaType.text,
        captchaId: _captchaData!.captchaId,
        userResponse: {
          'text': userInput,
        },
      );

      setState(() {
        _isVerifying = false;
        _isSuccess = result.success;
        if (!result.success) {
          _isError = true;
          _errorMessage = result.message ?? '验证码错误';
          _textController.clear();
        }
      });

      widget.onVerified?.call(result);
    } catch (e) {
      setState(() {
        _isVerifying = false;
        _isError = true;
        _errorMessage = e.toString();
      });
      widget.onError?.call(e.toString());
    }
  }

  void _onSubmit() {
    _focusNode.unfocus();
    _verifyCaptcha();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: widget.width,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: widget.backgroundColor ?? Colors.white,
        borderRadius: BorderRadius.circular(8),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildHeader(),
          const SizedBox(height: 12),
          _buildImageArea(),
          const SizedBox(height: 12),
          _buildInputArea(),
          const SizedBox(height: 12),
          _buildSubmitButton(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          '文字验证码',
          style: TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
        if (_captchaData != null && !_isLoading)
          IconButton(
            icon: const Icon(Icons.refresh, size: 20),
            onPressed: _loadCaptcha,
            tooltip: '刷新',
          ),
      ],
    );
  }

  Widget _buildImageArea() {
    if (_isLoading) {
      return Container(
        width: widget.width - 32,
        height: 80,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(4),
        ),
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_isError && _errorMessage != null && !_isSuccess) {
      return Container(
        width: widget.width - 32,
        height: 80,
        decoration: BoxDecoration(
          color: widget.errorColor?.withOpacity(0.1) ?? Colors.red[50],
          borderRadius: BorderRadius.circular(4),
          border: Border.all(color: Colors.red[200]!),
        ),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, color: Colors.red[400], size: 30),
              const SizedBox(height: 4),
              Text(
                _errorMessage!,
                style: TextStyle(color: Colors.red[700], fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      width: widget.width - 32,
      height: 80,
      decoration: BoxDecoration(
        color: Colors.grey[100],
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: _isSuccess
          ? Center(
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: widget.successColor ?? Colors.green,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  color: Colors.white,
                  size: 30,
                ),
              ),
            )
          : _captchaData?.imageUrl != null
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: Image.network(
                    _captchaData!.imageUrl!,
                    fit: BoxFit.contain,
                    width: widget.width - 32,
                    height: 80,
                    errorBuilder: (context, error, stackTrace) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.broken_image, color: Colors.grey[400]),
                            const SizedBox(height: 4),
                            Text(
                              '图片加载失败',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                )
              : Center(
                  child: Text(
                    '输入下方文字',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 14,
                    ),
                  ),
                ),
    );
  }

  Widget _buildInputArea() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '请输入上图中的文字:',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[700],
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _textController,
          focusNode: _focusNode,
          enabled: !_isSuccess && !_isVerifying,
          decoration: InputDecoration(
            hintText: '输入验证码',
            hintStyle: TextStyle(color: Colors.grey[400]),
            filled: true,
            fillColor: Colors.grey[100],
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: BorderSide(color: Colors.grey[300]!),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: BorderSide(
                color: widget.inputColor ?? Colors.blue,
                width: 2,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(4),
              borderSide: BorderSide(
                color: widget.errorColor ?? Colors.red,
                width: 2,
              ),
            ),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 12,
            ),
            prefixIcon: Icon(
              Icons.text_fields,
              color: Colors.grey[600],
            ),
          ),
          style: const TextStyle(
            fontSize: 16,
            letterSpacing: 2,
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _onSubmit(),
        ),
      ],
    );
  }

  Widget _buildSubmitButton() {
    return SizedBox(
      width: widget.width - 32,
      height: 48,
      child: ElevatedButton(
        onPressed: _isSuccess || _isVerifying ? null : _onSubmit,
        style: ElevatedButton.styleFrom(
          backgroundColor: _isSuccess
              ? (widget.successColor ?? Colors.green)
              : (widget.inputColor ?? Colors.blue),
          disabledBackgroundColor: Colors.grey[300],
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(4),
          ),
        ),
        child: _isVerifying
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(
                  color: Colors.white,
                  strokeWidth: 2,
                ),
              )
            : Text(
                _isSuccess ? '验证成功' : '提交验证',
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
      ),
    );
  }
}
