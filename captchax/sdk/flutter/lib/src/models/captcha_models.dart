enum CaptchaType {
  slider,
  click,
  puzzle,
  rotate,
  text,
  icon;

  String get value {
    switch (this) {
      case CaptchaType.slider:
        return 'slider';
      case CaptchaType.click:
        return 'click';
      case CaptchaType.puzzle:
        return 'puzzle';
      case CaptchaType.rotate:
        return 'rotate';
      case CaptchaType.text:
        return 'text';
      case CaptchaType.icon:
        return 'icon';
    }
  }

  static CaptchaType fromString(String value) {
    return CaptchaType.values.firstWhere(
      (type) => type.value == value,
      orElse: () => CaptchaType.slider,
    );
  }
}

class CaptchaData {
  final String captchaId;
  final String? imageUrl;
  final String? backgroundImage;
  final String? thumbnailUrl;
  final List<dynamic>? track;
  final DateTime? expiresAt;
  final Map<String, dynamic>? extraData;

  CaptchaData({
    required this.captchaId,
    this.imageUrl,
    this.backgroundImage,
    this.thumbnailUrl,
    this.track,
    this.expiresAt,
    this.extraData,
  });

  factory CaptchaData.fromJson(Map<String, dynamic> json) {
    return CaptchaData(
      captchaId: json['captchaId'] ?? '',
      imageUrl: json['imageUrl'],
      backgroundImage: json['backgroundImage'],
      thumbnailUrl: json['thumbnailUrl'],
      track: json['track'] as List<dynamic>?,
      expiresAt: json['expiresAt'] != null
          ? DateTime.tryParse(json['expiresAt'])
          : null,
      extraData: json['extraData'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'captchaId': captchaId,
      'imageUrl': imageUrl,
      'backgroundImage': backgroundImage,
      'thumbnailUrl': thumbnailUrl,
      'track': track,
      'expiresAt': expiresAt?.toIso8601String(),
      'extraData': extraData,
    };
  }

  bool get isExpired {
    if (expiresAt == null) return false;
    return DateTime.now().isAfter(expiresAt!);
  }
}

class CaptchaVerifyRequest {
  final String captchaId;
  final List<dynamic>? track;
  final Map<String, dynamic>? userResponse;

  CaptchaVerifyRequest({
    required this.captchaId,
    this.track,
    this.userResponse,
  });

  Map<String, dynamic> toJson() {
    return {
      'captchaId': captchaId,
      'track': track ?? [],
      'userResponse': userResponse ?? {},
    };
  }
}

class CaptchaVerifyResult {
  final bool success;
  final String? message;
  final String? captchaId;
  final Map<String, dynamic>? extraData;

  CaptchaVerifyResult({
    required this.success,
    this.message,
    this.captchaId,
    this.extraData,
  });

  factory CaptchaVerifyResult.fromJson(Map<String, dynamic> json) {
    return CaptchaVerifyResult(
      success: json['success'] ?? false,
      message: json['message'],
      captchaId: json['captchaId'],
      extraData: json['extraData'] as Map<String, dynamic>?,
    );
  }
}

class CaptchaException implements Exception {
  final String code;
  final String message;
  final dynamic details;

  CaptchaException({
    required this.code,
    required this.message,
    this.details,
  });

  @override
  String toString() => 'CaptchaException($code): $message';
}

class CaptchaConfig {
  final String baseUrl;
  final Duration timeout;
  final String? apiKey;
  final bool enableDebug;

  CaptchaConfig({
    required this.baseUrl,
    this.timeout = const Duration(seconds: 30),
    this.apiKey,
    this.enableDebug = false,
  });

  CaptchaConfig copyWith({
    String? baseUrl,
    Duration? timeout,
    String? apiKey,
    bool? enableDebug,
  }) {
    return CaptchaConfig(
      baseUrl: baseUrl ?? this.baseUrl,
      timeout: timeout ?? this.timeout,
      apiKey: apiKey ?? this.apiKey,
      enableDebug: enableDebug ?? this.enableDebug,
    );
  }
}
