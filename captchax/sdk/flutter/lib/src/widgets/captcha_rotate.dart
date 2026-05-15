import 'dart:math';
import 'package:flutter/material.dart';
import '../services/captcha_service.dart';
import '../models/captcha_models.dart';

class CaptchaRotate extends StatefulWidget {
  final Function(CaptchaVerifyResult)? onVerified;
  final Function(String)? onError;
  final Function(CaptchaData)? onLoaded;
  final double width;
  final double height;
  final Color? backgroundColor;
  final Color? sliderColor;
  final Color? successColor;
  final Color? errorColor;

  const CaptchaRotate({
    Key? key,
    this.onVerified,
    this.onError,
    this.onLoaded,
    this.width = 320,
    this.height = 320,
    this.backgroundColor,
    this.sliderColor,
    this.successColor,
    this.errorColor,
  }) : super(key: key);

  @override
  State<CaptchaRotate> createState() => _CaptchaRotateState();
}

class _CaptchaRotateState extends State<CaptchaRotate> {
  CaptchaData? _captchaData;
  bool _isLoading = false;
  bool _isVerifying = false;
  bool _isSuccess = false;
  bool _isError = false;
  String? _errorMessage;
  double _rotationAngle = 0;
  double _targetAngle = 0;
  Offset? _startPosition;
  double _startAngle = 0;

  @override
  void initState() {
    super.initState();
    _loadCaptcha();
  }

  Future<void> _loadCaptcha() async {
    setState(() {
      _isLoading = true;
      _isError = false;
      _errorMessage = null;
      _rotationAngle = 0;
    });

    try {
      final data = await CaptchaX.getCaptcha(CaptchaType.rotate);
      setState(() {
        _captchaData = data;
        _targetAngle = 120;
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

    setState(() {
      _isVerifying = true;
    });

    try {
      final result = await CaptchaX.verify(
        CaptchaType.rotate,
        captchaId: _captchaData!.captchaId,
        userResponse: {
          'angle': _rotationAngle,
          'targetAngle': _targetAngle,
        },
      );

      setState(() {
        _isVerifying = false;
        _isSuccess = result.success;
        if (!result.success) {
          _isError = true;
          _errorMessage = result.message;
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

  void _onRotateStart(DragStartDetails details) {
    if (_isSuccess || _isVerifying) return;

    final center = Offset(widget.width / 2, widget.height / 2);
    _startPosition = details.localPosition;
    _startAngle = _calculateAngle(center, details.localPosition);
  }

  void _onRotateUpdate(DragUpdateDetails details) {
    if (_isSuccess || _isVerifying || _startPosition == null) return;

    final center = Offset(widget.width / 2, widget.height / 2);
    final currentAngle = _calculateAngle(center, details.localPosition);
    final delta = currentAngle - _startAngle;

    setState(() {
      _rotationAngle += delta;
      _startPosition = details.localPosition;
    });
  }

  double _calculateAngle(Offset center, Offset position) {
    final dx = position.dx - center.dx;
    final dy = position.dy - center.dy;
    return atan2(dy, dx) * 180 / pi;
  }

  void _onRotateEnd(DragEndDetails details) {
    if (_isSuccess || _isVerifying) return;

    final normalizedRotation = _rotationAngle % 360;
    final normalizedTarget = _targetAngle % 360;
    final diff = (normalizedRotation - normalizedTarget).abs();
    final diffFrom360 = 360 - diff;

    if (diff < 15 || diffFrom360 < 15) {
      _verifyCaptcha();
    } else {
      setState(() {
        _isError = true;
        _errorMessage = '旋转角度不正确，请重试';
      });
      Future.delayed(const Duration(seconds: 1), () {
        if (mounted) {
          _resetRotation();
        }
      });
    }
  }

  void _resetRotation() {
    setState(() {
      _rotationAngle = 0;
      _isError = false;
      _isSuccess = false;
      _errorMessage = null;
    });
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
          _buildAngleIndicator(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          '旋转验证码',
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
        width: widget.height - 32,
        height: widget.height - 32,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(widget.height / 2),
        ),
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_isError && _errorMessage != null) {
      return GestureDetector(
        onTap: _resetRotation,
        child: Container(
          width: widget.height - 32,
          height: widget.height - 32,
          decoration: BoxDecoration(
            color: widget.errorColor?.withOpacity(0.1) ?? Colors.red[50],
            shape: BoxShape.circle,
            border: Border.all(color: Colors.red[200]!),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, color: Colors.red[400], size: 40),
                const SizedBox(height: 8),
                Text(
                  _errorMessage!,
                  style: TextStyle(color: Colors.red[700]),
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      );
    }

    return GestureDetector(
      onPanStart: _onRotateStart,
      onPanUpdate: _onRotateUpdate,
      onPanEnd: _onRotateEnd,
      child: Container(
        width: widget.height - 32,
        height: widget.height - 32,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(
            color: Colors.grey[300]!,
            width: 2,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: ClipOval(
          child: Transform.rotate(
            angle: _rotationAngle * pi / 180,
            child: _captchaData?.imageUrl != null
                ? Image.network(
                    _captchaData!.imageUrl!,
                    fit: BoxFit.cover,
                    width: widget.height - 32,
                    height: widget.height - 32,
                  )
                : Container(
                    color: Colors.grey[300],
                    child: const Center(
                      child: Icon(Icons.image, size: 50, color: Colors.grey),
                    ),
                  ),
          ),
        ),
      ),
    );
  }

  Widget _buildAngleIndicator() {
    return Column(
      children: [
        Text(
          _isSuccess
              ? '验证成功'
              : _isVerifying
                  ? '验证中...'
                  : '旋转图片对齐缺口',
          style: TextStyle(
            fontSize: 14,
            color: _isSuccess ? Colors.green[700] : Colors.grey[600],
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.rotate_left,
              color: _isSuccess ? Colors.green : Colors.grey,
            ),
            const SizedBox(width: 8),
            Text(
              '${_rotationAngle.toStringAsFixed(0)}°',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: _isSuccess
                    ? (widget.successColor ?? Colors.green)
                    : (widget.sliderColor ?? Colors.blue),
              ),
            ),
            const SizedBox(width: 8),
            Icon(
              Icons.rotate_right,
              color: _isSuccess ? Colors.green : Colors.grey,
            ),
          ],
        ),
      ],
    );
  }
}
