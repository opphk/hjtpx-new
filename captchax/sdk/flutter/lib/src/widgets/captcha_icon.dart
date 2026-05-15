import 'package:flutter/material.dart';
import '../services/captcha_service.dart';
import '../models/captcha_models.dart';

class CaptchaIcon extends StatefulWidget {
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

  const CaptchaIcon({
    Key? key,
    this.onVerified,
    this.onError,
    this.onLoaded,
    this.width = 320,
    this.height = 400,
    this.backgroundColor,
    this.selectedColor,
    this.successColor,
    this.errorColor,
    this.targetCount = 3,
  }) : super(key: key);

  @override
  State<CaptchaIcon> createState() => _CaptchaIconState();
}

class _CaptchaIconState extends State<CaptchaIcon> {
  CaptchaData? _captchaData;
  bool _isLoading = false;
  bool _isVerifying = false;
  bool _isSuccess = false;
  bool _isError = false;
  String? _errorMessage;
  final List<int> _selectedIndices = [];
  List<String> _iconUrls = [];
  String? _instruction;

  final List<IconData> _defaultIcons = [
    Icons.star,
    Icons.favorite,
    Icons.home,
    Icons.settings,
    Icons.person,
    Icons.shopping_cart,
    Icons.camera,
    Icons.music_note,
    Icons.sports_soccer,
    Icons.pets,
    Icons.restaurant,
    Icons.flight,
    Icons.local_hospital,
    Icons.school,
    Icons.movie,
    Icons.book,
  ];

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
      _selectedIndices.clear();
    });

    try {
      final data = await CaptchaX.getCaptcha(CaptchaType.icon);
      setState(() {
        _captchaData = data;
        _instruction = '请选择 ${widget.targetCount} 个正确的图标';
        _iconUrls = List.generate(16, (index) {
          if (data.extraData != null && data.extraData!['iconUrls'] != null) {
            final urls = data.extraData!['iconUrls'] as List;
            return index < urls.length ? urls[index] : '';
          }
          return '';
        });
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

    if (_selectedIndices.length < widget.targetCount) {
      setState(() {
        _isError = true;
        _errorMessage = '请选择 ${widget.targetCount} 个图标';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
    });

    try {
      final result = await CaptchaX.verify(
        CaptchaType.icon,
        captchaId: _captchaData!.captchaId,
        userResponse: {
          'selectedIndices': _selectedIndices,
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

  void _toggleSelection(int index) {
    if (_isSuccess || _isVerifying) return;

    setState(() {
      if (_selectedIndices.contains(index)) {
        _selectedIndices.remove(index);
      } else if (_selectedIndices.length < widget.targetCount) {
        _selectedIndices.add(index);
      } else {
        _isError = true;
        _errorMessage = '最多只能选择 ${widget.targetCount} 个图标';
      }
    });

    if (_selectedIndices.length == widget.targetCount) {
      Future.delayed(const Duration(milliseconds: 300), () {
        if (mounted) {
          _verifyCaptcha();
        }
      });
    }
  }

  void _reset() {
    setState(() {
      _selectedIndices.clear();
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
          _buildIconGrid(),
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
          '图标验证码',
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.blue[50],
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.blue[200]!),
      ),
      child: Row(
        children: [
          Icon(Icons.help_outline, color: Colors.blue[700], size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              _instruction ?? '请选择 ${widget.targetCount} 个正确的图标',
              style: TextStyle(
                fontSize: 14,
                color: Colors.blue[700],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildIconGrid() {
    if (_isLoading) {
      return Container(
        width: widget.width - 32,
        height: widget.height - 100,
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
          height: widget.height - 100,
          decoration: BoxDecoration(
            color: widget.errorColor?.withOpacity(0.1) ?? Colors.red[50],
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: Colors.red[200]!),
          ),
          child: Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.error_outline, color: Colors.red[400], size: 50),
                const SizedBox(height: 12),
                Text(
                  _errorMessage!,
                  style: TextStyle(color: Colors.red[700], fontSize: 14),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
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

    return Container(
      width: widget.width - 32,
      height: widget.height - 100,
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Stack(
        children: [
          GridView.builder(
            padding: const EdgeInsets.all(8),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 4,
              crossAxisSpacing: 8,
              mainAxisSpacing: 8,
            ),
            itemCount: 16,
            itemBuilder: (context, index) {
              return _buildIconItem(index);
            },
          ),
          if (_isSuccess || _isVerifying)
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Center(
                  child: _isVerifying
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Container(
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
        ],
      ),
    );
  }

  Widget _buildIconItem(int index) {
    final isSelected = _selectedIndices.contains(index);
    final iconUrl = index < _iconUrls.length ? _iconUrls[index] : '';

    return GestureDetector(
      onTap: () => _toggleSelection(index),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        decoration: BoxDecoration(
          color: isSelected
              ? (widget.selectedColor ?? Colors.blue).withOpacity(0.2)
              : Colors.white,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: isSelected
                ? (widget.selectedColor ?? Colors.blue)
                : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [
                  BoxShadow(
                    color: (widget.selectedColor ?? Colors.blue)
                        .withOpacity(0.3),
                    blurRadius: 4,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: Stack(
          children: [
            Center(
              child: iconUrl.isNotEmpty
                  ? Image.network(
                      iconUrl,
                      fit: BoxFit.contain,
                      width: 40,
                      height: 40,
                      errorBuilder: (context, error, stackTrace) {
                        return Icon(
                          _defaultIcons[index % _defaultIcons.length],
                          size: 36,
                          color: Colors.grey[600],
                        );
                      },
                    )
                  : Icon(
                      _defaultIcons[index % _defaultIcons.length],
                      size: 36,
                      color: Colors.grey[600],
                    ),
            ),
            if (isSelected)
              Positioned(
                top: 4,
                right: 4,
                child: Container(
                  width: 18,
                  height: 18,
                  decoration: BoxDecoration(
                    color: widget.selectedColor ?? Colors.blue,
                    shape: BoxShape.circle,
                  ),
                  child: const Center(
                    child: Icon(
                      Icons.check,
                      size: 12,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgress() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(
          '已选择: ${_selectedIndices.length} / ${widget.targetCount}',
          style: TextStyle(
            fontSize: 14,
            color: Colors.grey[700],
            fontWeight: FontWeight.w500,
          ),
        ),
        const SizedBox(width: 16),
        if (!_isSuccess && !_isVerifying && !_isError)
          TextButton.icon(
            onPressed: _reset,
            icon: const Icon(Icons.refresh, size: 16),
            label: const Text('重置'),
            style: TextButton.styleFrom(
              foregroundColor: Colors.grey[600],
            ),
          ),
      ],
    );
  }
}
