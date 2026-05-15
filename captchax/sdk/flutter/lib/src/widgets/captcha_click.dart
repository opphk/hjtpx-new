import 'package:flutter/material.dart';
import '../services/captcha_service.dart';
import '../models/captcha_models.dart';

class CaptchaClick extends StatefulWidget {
  final Function(CaptchaVerifyResult)? onVerified;
  final Function(String)? onError;
  final Function(CaptchaData)? onLoaded;
  final double width;
  final double height;
  final Color? backgroundColor;
  final Color? selectedColor;
  final Color? successColor;
  final Color? errorColor;
  final int targetCount;

  const CaptchaClick({
    Key? key,
    this.onVerified,
    this.onError,
    this.onLoaded,
    this.width = 320,
    this.height = 240,
    this.backgroundColor,
    this.selectedColor,
    this.successColor,
    this.errorColor,
    this.targetCount = 4,
  }) : super(key: key);

  @override
  State<CaptchaClick> createState() => _CaptchaClickState();
}

class _CaptchaClickState extends State<CaptchaClick> {
  CaptchaData? _captchaData;
  bool _isLoading = false;
  bool _isVerifying = false;
  bool _isSuccess = false;
  bool _isError = false;
  String? _errorMessage;
  final List<Offset> _selectedPoints = [];
  final List<Offset> _targetPoints = [];
  Size? _imageSize;

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
      _selectedPoints.clear();
    });

    try {
      final data = await CaptchaX.getCaptcha(CaptchaType.click);
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

    if (_selectedPoints.length < widget.targetCount) {
      setState(() {
        _isError = true;
        _errorMessage = '请选择 ${widget.targetCount} 个目标';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
    });

    try {
      final result = await CaptchaX.verify(
        CaptchaType.click,
        captchaId: _captchaData!.captchaId,
        userResponse: {
          'selectedPoints': _selectedPoints
              .map((p) => {'x': p.dx, 'y': p.dy})
              .toList(),
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

  void _onImageTap(TapDownDetails details, BoxConstraints constraints) {
    if (_isSuccess || _isVerifying) return;

    final RenderBox box = context.findRenderObject() as RenderBox;
    final localPosition = details.localPosition;

    setState(() {
      _selectedPoints.add(localPosition);
    });

    if (_selectedPoints.length >= widget.targetCount) {
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) {
          _verifyCaptcha();
        }
      });
    }
  }

  void _reset() {
    setState(() {
      _selectedPoints.clear();
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
          _buildInstructions(),
          const SizedBox(height: 8),
          _buildImageArea(),
          const SizedBox(height: 12),
          _buildProgress(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        const Text(
          '点选验证码',
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

  Widget _buildInstructions() {
    return Text(
      '请点击图中 ${widget.targetCount} 个目标',
      style: TextStyle(
        fontSize: 14,
        color: Colors.grey[600],
      ),
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

    if (_isError && !_isLoading && _errorMessage != null && !_isSuccess) {
      return GestureDetector(
        onTap: _reset,
        child: Container(
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
                const SizedBox(height: 4),
                Text(
                  '点击重新开始',
                  style: TextStyle(
                    color: Colors.red[500],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return LayoutBuilder(
      builder: (context, constraints) {
        return GestureDetector(
          onTapDown: (details) => _onImageTap(details, constraints),
          child: Container(
            width: widget.width - 32,
            height: widget.height,
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(4),
              image: _captchaData?.imageUrl != null
                  ? DecorationImage(
                      image: NetworkImage(_captchaData!.imageUrl!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: Stack(
              children: [
                for (int i = 0; i < _selectedPoints.length; i++)
                  Positioned(
                    left: _selectedPoints[i].dx - 20,
                    top: _selectedPoints[i].dy - 20,
                    child: Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: (widget.selectedColor ?? Colors.blue)
                            .withOpacity(0.6),
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white,
                          width: 2,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          '${i + 1}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                  ),
                if (_isSuccess)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Center(
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: widget.successColor ?? Colors.green,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.check,
                            color: Colors.white,
                            size: 40,
                          ),
                        ),
                      ),
                    ),
                  ),
                if (_isVerifying)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.3),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Center(
                        child: CircularProgressIndicator(
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProgress() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: List.generate(widget.targetCount, (index) {
        final isSelected = index < _selectedPoints.length;
        return Container(
          width: 12,
          height: 12,
          margin: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: isSelected
                ? (widget.selectedColor ?? Colors.blue)
                : Colors.grey[300],
            border: Border.all(
              color: isSelected
                  ? (widget.selectedColor ?? Colors.blue)
                  : Colors.grey[400]!,
              width: 2,
            ),
          ),
        );
      }),
    );
  }
}
