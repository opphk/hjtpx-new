import React, { useState, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  CaptchaComponentProps,
  CaptchaTrack,
  IconResponse,
} from '../types';

interface IconCaptchaComponentProps extends CaptchaComponentProps {
  iconCount?: number;
  targetIcons?: number[];
  iconsPerRow?: number;
}

const IconCaptcha: React.FC<IconCaptchaComponentProps> = ({
  captchaData,
  onSuccess,
  onFail,
  onClose,
  onRefresh,
  width = 300,
  height = 400,
  iconCount = 9,
  targetIcons = [],
  iconsPerRow = 3,
}) => {
  const [selectedIcons, setSelectedIcons] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [track, setTrack] = useState<CaptchaTrack[]>([]);
  const startTimeRef = React.useRef<number>(0);

  const handleIconPress = useCallback(
    (index: number) => {
      if (isVerified || isLoading) return;

      if (startTimeRef.current === 0) {
        startTimeRef.current = Date.now();
      }

      const timestamp = Date.now() - startTimeRef.current;
      setTrack((prev) => [...prev, { x: index, y: 0, timestamp }]);

      if (selectedIcons.includes(index)) {
        setSelectedIcons(selectedIcons.filter((i) => i !== index));
      } else {
        if (selectedIcons.length < targetIcons.length || targetIcons.length === 0) {
          setSelectedIcons([...selectedIcons, index]);
        }
      }
    },
    [selectedIcons, isVerified, isLoading, targetIcons]
  );

  const verifyCaptcha = useCallback(async () => {
    setIsLoading(true);

    try {
      const userResponse: IconResponse = {
        selectedIcons,
        track,
      };

      const response = await fetch(
        `${captchaData.captchaId ? '/api/v1/captcha/icon/verify' : ''}`,
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
        setSelectedIcons([]);
        setTrack([]);
        onFail?.(result.message || 'Verification failed');
      }
    } catch (error) {
      setSelectedIcons([]);
      setTrack([]);
      onFail?.(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedIcons, track, captchaData.captchaId, onSuccess, onFail]);

  const handleRefresh = useCallback(() => {
    setSelectedIcons([]);
    setIsVerified(false);
    setTrack([]);
    startTimeRef.current = 0;
    onRefresh?.();
  }, [onRefresh]);

  const getDefaultIcons = () => {
    return Array.from({ length: iconCount }, (_, i) => ({
      id: i,
      url: `https://via.placeholder.com/80x80?text=Icon+${i + 1}`,
    }));
  };

  const icons = captchaData.icons?.map((url, index) => ({
    id: index,
    url,
  })) || getDefaultIcons();

  const requiredCount = targetIcons.length || 3;

  return (
    <View style={[styles.container, { width, height }]}>
      <View style={styles.header}>
        <Text style={styles.title}>图标验证码</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.instructionContainer}>
        <Text style={styles.instruction}>
          {isVerified
            ? '✓ 验证成功'
            : `请选择 ${requiredCount} 个指定的图标`}
        </Text>
        <Text style={styles.progress}>
          {selectedIcons.length} / {requiredCount}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.iconsContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconsGrid}>
          {icons.map((icon) => (
            <TouchableOpacity
              key={icon.id}
              style={[
                styles.iconItem,
                selectedIcons.includes(icon.id) && styles.iconItemSelected,
              ]}
              onPress={() => handleIconPress(icon.id)}
              activeOpacity={0.7}
            >
              {icon.url.startsWith('http') ? (
                <Image
                  source={{ uri: icon.url }}
                  style={styles.iconImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.iconPlaceholder}>
                  <Text style={styles.iconEmoji}>🔲</Text>
                </View>
              )}

              {selectedIcons.includes(icon.id) && (
                <View style={styles.checkOverlay}>
                  <Text style={styles.checkIcon}>✓</Text>
                </View>
              )}

              <Text style={styles.iconLabel}>{icon.id + 1}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (selectedIcons.length < requiredCount || isLoading) &&
              styles.submitButtonDisabled,
          ]}
          onPress={verifyCaptcha}
          disabled={selectedIcons.length < requiredCount || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>确认</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={isLoading}
        >
          <Text style={styles.refreshButtonText}>刷新</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  instructionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
  },
  instruction: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
  },
  progress: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  iconsContainer: {
    padding: 16,
    flexGrow: 1,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  iconItem: {
    width: 80,
    height: 100,
    margin: 8,
    borderRadius: 8,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    position: 'relative',
  },
  iconItemSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E6F2FF',
  },
  iconImage: {
    width: 60,
    height: 60,
    borderRadius: 4,
  },
  iconPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEmoji: {
    fontSize: 32,
  },
  checkOverlay: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  iconLabel: {
    marginTop: 4,
    fontSize: 10,
    color: '#666666',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  submitButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  refreshButton: {
    width: 80,
    height: 40,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default IconCaptcha;
