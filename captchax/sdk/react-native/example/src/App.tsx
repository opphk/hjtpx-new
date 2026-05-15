import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { CaptchaX } from '../src/CaptchaX';
import SliderCaptcha from '../src/components/SliderCaptcha';
import ClickCaptcha from '../src/components/ClickCaptcha';
import PuzzleCaptcha from '../src/components/PuzzleCaptcha';
import RotateCaptcha from '../src/components/RotateCaptcha';
import TextCaptcha from '../src/components/TextCaptcha';
import IconCaptcha from '../src/components/IconCaptcha';
import { CaptchaType, CaptchaData, VerifyResponse } from '../src/types';

const captchaX = new CaptchaX({
  baseUrl: 'https://captchax.example.com',
  timeout: 30000,
});

interface CaptchaModalProps {
  visible: boolean;
  type: CaptchaType;
  onClose: () => void;
  onSuccess: (response: VerifyResponse) => void;
}

const CaptchaModal: React.FC<CaptchaModalProps> = ({
  visible,
  type,
  onClose,
  onSuccess,
}) => {
  const [captchaData, setCaptchaData] = useState<CaptchaData | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) {
      loadCaptcha();
    }
  }, [visible]);

  const loadCaptcha = async () => {
    setLoading(true);
    try {
      const response = await captchaX.getCaptcha(type);
      if (response.success && response.data) {
        setCaptchaData(response.data);
      } else {
        Alert.alert('错误', '加载验证码失败');
        onClose();
      }
    } catch (error) {
      console.error('Failed to load captcha:', error);
      Alert.alert('错误', '网络错误，请重试');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (result: VerifyResponse) => {
    onSuccess(result);
  };

  const handleFail = (error: string) => {
    Alert.alert('验证失败', error);
  };

  const handleRefresh = () => {
    loadCaptcha();
  };

  if (!captchaData) {
    return null;
  }

  const renderCaptcha = () => {
    const commonProps = {
      captchaData,
      onSuccess: handleSuccess,
      onFail: handleFail,
      onClose,
      onRefresh: handleRefresh,
    };

    switch (type) {
      case 'slider':
        return <SliderCaptcha {...commonProps} />;
      case 'click':
        return <ClickCaptcha {...commonProps} />;
      case 'puzzle':
        return <PuzzleCaptcha {...commonProps} />;
      case 'rotate':
        return <RotateCaptcha {...commonProps} />;
      case 'text':
        return <TextCaptcha {...commonProps} />;
      case 'icon':
        return <IconCaptcha {...commonProps} />;
      default:
        return <SliderCaptcha {...commonProps} />;
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>{renderCaptcha()}</View>
      </View>
    </Modal>
  );
};

const HomeScreen: React.FC = () => {
  const [selectedCaptcha, setSelectedCaptcha] = useState<CaptchaType | null>(null);
  const [verificationResult, setVerificationResult] = useState<string>('');

  const handleCaptchaSuccess = (result: VerifyResponse) => {
    setVerificationResult(
      `验证${result.success ? '成功' : '失败'}: ${result.message || ''}`
    );
    setSelectedCaptcha(null);
  };

  const captchaTypes: Array<{ type: CaptchaType; title: string; description: string }> = [
    {
      type: 'slider',
      title: '滑块验证码',
      description: '拖动滑块完成拼图验证',
    },
    {
      type: 'click',
      title: '点选验证码',
      description: '依次点击图中的目标',
    },
    {
      type: 'puzzle',
      title: '拼图验证码',
      description: '将拼图块拖动到正确位置',
    },
    {
      type: 'rotate',
      title: '旋转验证码',
      description: '将图片旋转到正确角度',
    },
    {
      type: 'text',
      title: '文字验证码',
      description: '输入图中显示的文字',
    },
    {
      type: 'icon',
      title: '图标验证码',
      description: '选择指定的图标',
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>CaptchaX 示例</Text>
        <Text style={styles.headerSubtitle}>多类型验证码组件演示</Text>
      </View>

      <View style={styles.content}>
        {captchaTypes.map((item) => (
          <TouchableOpacity
            key={item.type}
            style={styles.captchaCard}
            onPress={() => setSelectedCaptcha(item.type)}
            activeOpacity={0.7}
          >
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
            <Text style={styles.cardArrow}>→</Text>
          </TouchableOpacity>
        ))}
      </View>

      {verificationResult ? (
        <View style={styles.resultContainer}>
          <Text style={styles.resultText}>{verificationResult}</Text>
        </View>
      ) : null}

      <CaptchaModal
        visible={selectedCaptcha !== null}
        type={selectedCaptcha!}
        onClose={() => setSelectedCaptcha(null)}
        onSuccess={handleCaptchaSuccess}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  captchaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  cardDescription: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
  },
  cardArrow: {
    fontSize: 20,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  resultContainer: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
  },
  resultText: {
    fontSize: 14,
    color: '#2E7D32',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 350,
  },
});

export default HomeScreen;
