import 'package:flutter/material.dart';
import '../services/captcha_service.dart';
import '../models/captcha_models.dart';

class CaptchaPuzzle extends StatefulWidget {
  final Function(CaptchaVerifyResult)? onVerified;
  final Function(String)? onError;
  final Function(CaptchaData)? onLoaded;
  final double width;
  final double height;
  final Color? backgroundColor;
  final Color? sliderColor;
  final Color? successColor;
  final Color? errorColor;

  const CaptchaPuzzle({
    Key? key,
    this.onVerified,
    this.onError,
    this.onLoaded,
    this.width = 320,
    this.height = 160,
    this.backgroundColor,
    this.sliderColor,
    this.successColor,
    this.errorColor,
  }) : super(key: key);

  @override
  State<CaptchaPuzzle> createState() => _CaptchaPuzzleState();
}

class _CaptchaPuzzleState extends State<CaptchaPuzzle> {
  CaptchaData? _captchaData;
  bool _isLoading = false;
  bool _isVerifying = false;
  bool _isSuccess = false;
  bool _isError = false;
  String? _errorMessage;
  double _sliderPosition = 0;
  double _targetPosition = 0;
  bool _isDragging = false;
  final List<double> _track = [];

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
    });

    try {
      final data = await CaptchaX.getCaptcha(CaptchaType.puzzle);
      setState(() {
        _captchaData = data;
        _targetPosition = 220;
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
        CaptchaType.puzzle,
        captchaId: _captchaData!.captchaId,
        track: _track,
        userResponse: {
          'position': _sliderPosition,
          'targetPosition': _targetPosition,
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

  void _onSliderDragUpdate(double delta) {
    if (_isSuccess) return;

    setState(() {
      _sliderPosition = (_sliderPosition + delta).clamp(0, widget.width - 50);
      _track.add(_sliderPosition);
    });
  }

  void _onSliderDragEnd() {
    if (_isSuccess) return;

    final diff = (_sliderPosition - _targetPosition).abs();
    if (diff < 10) {
      _verifyCaptcha();
    } else {
      setState(() {
        _isError = true;
        _errorMessage = '验证失败，请重试';
      });
      Future.delayed(const Duration(seconds: 1), () {
        if (mounted) {
          _resetSlider();
        }
      });
    }
  }

  void _resetSlider() {
    setState(() {
      _sliderPosition = 0;
      _isError = false;
      _isSuccess = false;
      _errorMessage = null;
      _track.clear();
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
          _buildSlider(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          '拼图验证码',
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
        height: widget.height,
        decoration: BoxDecoration(
          color: Colors.grey[200],
          borderRadius: BorderRadius.circular(4),
        ),
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (_isError && _errorMessage != null) {
      return Container(
        width: widget.width - 32,
        height: widget.height,
        decoration: BoxDecoration(
          color: widget.errorColor?.withOpacity(0.1) ?? Colors.red[50],
          borderRadius: BorderRadius.circular(4),
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
      );
    }

    return Container(
      width: widget.width - 32,
      height: widget.height,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(4),
        image: _captchaData?.backgroundImage != null
            ? DecorationImage(
                image: NetworkImage(_captchaData!.backgroundImage!),
                fit: BoxFit.cover,
              )
            : null,
      ),
      child: Stack(
        children: [
          if (_captchaData?.thumbnailUrl != null && !_isSuccess)
            Positioned(
              left: _sliderPosition,
              top: 0,
              bottom: 0,
              child: Container(
                width: 50,
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(4),
                  image: DecorationImage(
                    image: NetworkImage(_captchaData!.thumbnailUrl!),
                    fit: BoxFit.cover,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 4,
                    ),
                  ],
                ),
                child: CustomPaint(
                  painter: PuzzlePiecePainter(),
                ),
              ),
            ),
          if (_isSuccess)
            Center(
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: widget.successColor?.withOpacity(0.9) ??
                      Colors.green.withOpacity(0.9),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check,
                  color: Colors.white,
                  size: 40,
                ),
              ),
            ),
          Positioned(
            left: _targetPosition,
            top: 0,
            bottom: 0,
            child: Container(
              width: 50,
              decoration: BoxDecoration(
                border: Border.all(
                  color: Colors.grey[400]!,
                  width: 2,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
              child: CustomPaint(
                painter: PuzzleSlotPainter(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSlider() {
    return Container(
      width: widget.width - 32,
      height: 50,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(25),
        border: Border.all(color: Colors.grey[300]!),
      ),
      child: Stack(
        children: [
          Positioned.fill(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 25),
              child: Center(
                child: Text(
                  _isSuccess
                      ? '验证成功'
                      : _isVerifying
                          ? '验证中...'
                          : '拖动拼图到正确位置',
                  style: TextStyle(
                    color: _isSuccess
                        ? Colors.green[700]
                        : Colors.grey[600],
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ),
          ),
          Positioned(
            left: _sliderPosition,
            top: 0,
            bottom: 0,
            child: GestureDetector(
              onHorizontalDragStart: (_) {
                if (!_isSuccess && !_isVerifying) {
                  setState(() => _isDragging = true);
                }
              },
              onHorizontalDragUpdate: (details) {
                if (_isDragging && !_isSuccess) {
                  _onSliderDragUpdate(details.delta.dx);
                }
              },
              onHorizontalDragEnd: (_) {
                if (_isDragging) {
                  setState(() => _isDragging = false);
                  _onSliderDragEnd();
                }
              },
              child: Container(
                width: 50,
                decoration: BoxDecoration(
                  color: _isSuccess
                      ? (widget.successColor ?? Colors.green)
                      : (widget.sliderColor ?? Colors.blue),
                  borderRadius: BorderRadius.circular(25),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.2),
                      blurRadius: 4,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Icon(
                  _isSuccess ? Icons.check : Icons.extension,
                  color: Colors.white,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class PuzzlePiecePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.black.withOpacity(0.1)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2;

    final path = Path();
    path.moveTo(size.width * 0.2, 0);
    path.quadraticBezierTo(
      size.width * 0.3,
      size.height * 0.3,
      size.width * 0.2,
      size.height * 0.5,
    );
    path.quadraticBezierTo(
      size.width * 0.1,
      size.height * 0.7,
      size.width * 0.2,
      size.height,
    );

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class PuzzleSlotPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.grey.withOpacity(0.3)
      ..style = PaintingStyle.fill;

    final path = Path();
    path.moveTo(size.width * 0.2, 0);
    path.quadraticBezierTo(
      size.width * 0.3,
      size.height * 0.3,
      size.width * 0.2,
      size.height * 0.5,
    );
    path.quadraticBezierTo(
      size.width * 0.1,
      size.height * 0.7,
      size.width * 0.2,
      size.height,
    );
    path.lineTo(0, size.height);
    path.lineTo(0, 0);
    path.close();

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
