import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  CaptchaComponentProps,
  CaptchaTrack,
  TextResponse,
} from '../types';

interface TextCaptchaComponentProps extends CaptchaComponentProps {
  expectedText?: string;
  placeholder?: string;
  inputWidth?: number;
}

const TextCaptcha: React.FC<TextCaptchaComponentProps> = ({
  captchaData,
  onSuccess,
  onFail,
  onClose,
  onRefresh,
  width = 300,
  height = 200,
  placeholder = '请输入上方文字',
  inputWidth = 250,
}) => {
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [track, setTrack] = useState<CaptchaTrack[]>([]);
  const inputRef = useRef<TextInput>(null);
  const startTimeRef = useRef<number>(0);

  const handleInputChange = useCallback((text: string) => {
    setInputText(text);
    setErrorMessage('');
    
    if (startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }

    const timestamp = Date.now() - startTimeRef.current;
    setTrack((prev) => [...prev, { x: 0, y: 0, timestamp }]);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim()) {
      setErrorMessage('请输入验证码文字');
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);
    setErrorMessage('');

    try {
      const userResponse: TextResponse = {
        text: inputText.trim(),
        track,
      };

      const response = await fetch(
        `${captchaData.captchaId ? '/api/v1/captcha/text/verify' : ''}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            captchaId: captchaData.captchaId,
            userResponse,
            track,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setIsVerified(true);
        onSuccess(result);
      } else {
        setErrorMessage(result.message || '验证码错误');
        setInputText('');
        onFail?.(result.message || 'Verification failed');
      }
    } catch (error) {
      setErrorMessage('网络错误，请重试');
      onFail?.(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [inputText, track, captchaData.captchaId, onSuccess, onFail]);

  const handleRefresh = useCallback(() => {
    setInputText('');
    setIsVerified(false);
    setErrorMessage('');
    setTrack([]);
    startTimeRef.current = 0;
    inputRef.current?.clear();
    onRefresh?.();
  }, [onRefresh]);

  const expectedText = captchaData.text || '示例文字';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { width, height: height + 120 }]}
    >
      <View style={styles.header}>
        <Text style={styles.title}>文字验证码</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.content, { width, height }]}>
        {captchaData.imageUrl ? (
          <Image
            source={{ uri: captchaData.imageUrl }}
            style={[styles.captchaImage, { width: width - 32, height: height - 20 }]}
            resizeMode="contain"
          />
        ) : (
          <View style={[styles.textDisplay, { width: width - 32, height: height - 20 }]}>
            <Text style={styles.displayText}>{expectedText}</Text>
            <Text style={styles.displayHint}>请在下方输入相同文字</Text>
          </View>
        )}

        {isVerified && (
          <View style={styles.successOverlay}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>验证成功</Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, { width: inputWidth }]}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          editable={!isLoading && !isVerified}
        />

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        <TouchableOpacity
          style={[
            styles.submitButton,
            (!inputText.trim() || isLoading) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!inputText.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>验证</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>看不清？点击刷新</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8F8F8',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  closeButton: {
    fontSize: 20,
    color: '#999999',
    paddingHorizontal: 8,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  captchaImage: {
    backgroundColor: '#F8F8F8',
    borderRadius: 8,
  },
  textDisplay: {
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  displayText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    letterSpacing: 4,
  },
  displayHint: {
    marginTop: 12,
    fontSize: 12,
    color: '#999999',
  },
  successOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    fontSize: 48,
    color: '#FFFFFF',
  },
  successText: {
    fontSize: 16,
    color: '#FFFFFF',
    marginTop: 8,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    alignItems: 'center',
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    color: '#FF3B30',
  },
  submitButton: {
    marginTop: 12,
    width: inputWidth,
    height: 44,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 12,
  },
});

export default TextCaptcha;
