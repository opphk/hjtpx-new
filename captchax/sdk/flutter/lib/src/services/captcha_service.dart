import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/captcha_models.dart';

class CaptchaX {
  static CaptchaConfig? _config;
  static final CaptchaX _instance = CaptchaX._internal();

  factory CaptchaX() => _instance;

  CaptchaX._internal();

  static void initialize({
    required String baseUrl,
    Duration timeout = const Duration(seconds: 30),
    String? apiKey,
    bool enableDebug = false,
  }) {
    _config = CaptchaConfig(
      baseUrl: baseUrl,
      timeout: timeout,
      apiKey: apiKey,
      enableDebug: enableDebug,
    );
    _log('CaptchaX initialized with baseUrl: $baseUrl');
  }

  static CaptchaConfig get config {
    if (_config == null) {
      throw CaptchaException(
        code: 'NOT_INITIALIZED',
        message: 'CaptchaX 未初始化，请先调用 CaptchaX.initialize()',
      );
    }
    return _config!;
  }

  static Future<CaptchaData> getCaptcha(CaptchaType type) async {
    _ensureInitialized();

    final url = '${config.baseUrl}/api/v1/captcha/${type.value}';
    _log('Fetching captcha from: $url');

    try {
      final response = await http.post(
        Uri.parse(url),
        headers: _buildHeaders(),
      ).timeout(config.timeout);

      return _handleResponse(response);
    } catch (e) {
      throw CaptchaException(
        code: 'NETWORK_ERROR',
        message: '网络请求失败: ${e.toString()}',
        details: e,
      );
    }
  }

  static Future<CaptchaVerifyResult> verify(
    CaptchaType type, {
    required String captchaId,
    List<dynamic>? track,
    Map<String, dynamic>? userResponse,
  }) async {
    _ensureInitialized();

    final url = '${config.baseUrl}/api/v1/captcha/${type.value}/verify';
    _log('Verifying captcha at: $url');

    try {
      final request = CaptchaVerifyRequest(
        captchaId: captchaId,
        track: track,
        userResponse: userResponse,
      );

      final response = await http.post(
        Uri.parse(url),
        headers: _buildHeaders(),
        body: jsonEncode(request.toJson()),
      ).timeout(config.timeout);

      final result = _handleVerifyResponse(response);
      _log('Verification result: ${result.success}');
      return result;
    } catch (e) {
      if (e is CaptchaException) rethrow;
      throw CaptchaException(
        code: 'VERIFY_ERROR',
        message: '验证失败: ${e.toString()}',
        details: e,
      );
    }
  }

  static void _ensureInitialized() {
    if (_config == null) {
      throw CaptchaException(
        code: 'NOT_INITIALIZED',
        message: 'CaptchaX 未初始化，请先调用 CaptchaX.initialize()',
      );
    }
  }

  static Map<String, String> _buildHeaders() {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (config.apiKey != null) {
      headers['Authorization'] = 'Bearer ${config.apiKey}';
    }

    return headers;
  }

  static CaptchaData _handleResponse(http.Response response) {
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      if (json['success'] == true && json['data'] != null) {
        return CaptchaData.fromJson(json['data']);
      } else {
        throw CaptchaException(
          code: 'INVALID_RESPONSE',
          message: json['message'] ?? '获取验证码失败',
        );
      }
    } else {
      throw CaptchaException(
        code: 'HTTP_ERROR',
        message: 'HTTP ${response.statusCode}: ${response.reasonPhrase}',
        details: response.body,
      );
    }
  }

  static CaptchaVerifyResult _handleVerifyResponse(http.Response response) {
    if (response.statusCode == 200) {
      final json = jsonDecode(response.body);
      return CaptchaVerifyResult(
        success: json['success'] ?? false,
        message: json['message'],
        captchaId: json['captchaId'],
        extraData: json['extraData'] as Map<String, dynamic>?,
      );
    } else {
      throw CaptchaException(
        code: 'VERIFY_HTTP_ERROR',
        message: 'HTTP ${response.statusCode}: ${response.reasonPhrase}',
        details: response.body,
      );
    }
  }

  static void _log(String message) {
    if (config.enableDebug) {
      print('[CaptchaX] $message');
    }
  }
}
