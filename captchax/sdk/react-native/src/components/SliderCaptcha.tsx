import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import { CaptchaComponentProps, CaptchaTrack } from '../types';

interface SliderCaptchaComponentProps extends CaptchaComponentProps {
  targetPosition?: { x: number; y: number };
  imageWidth?: number;
  imageHeight?: number;
}

const SliderCaptcha: React.FC<SliderCaptchaComponentProps> = ({
  captchaData,
  onSuccess,
  onFail,
  onClose,
  onRefresh,
  width = 300,
  height = 200,
  imageWidth = 300,
  imageHeight = 200,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [track, setTrack] = useState<CaptchaTrack[]>([]);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const sliderWidth = 50;
  const maxPosition = width - sliderWidth - 10;

  const startTimeRef = useRef<number>(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startTimeRef.current = Date.now();
        setTrack([]);
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = Math.max(0, Math.min(gestureState.dx, maxPosition));
        setSliderPosition(newPosition);
        animatedValue.setValue(newPosition);
        
        const timestamp = Date.now() - startTimeRef.current;
        setTrack(prev => [
          ...prev,
          { x: newPosition, y: gestureState.dy, timestamp }
        ]);
      },
      onPanResponderRelease: async (_, gestureState) => {
        setIsLoading(true);
        
        const timestamp = Date.now() - startTimeRef.current;
        const finalTrack = [
          ...track,
          { x: sliderPosition, y: gestureState.dy, timestamp }
        ];

        try {
          const response = await fetch(
            `${captchaData.captchaId ? '/api/v1/captcha/slider/verify' : ''}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                captchaId: captchaData.captchaId,
                userResponse: {
                  offsetX: sliderPosition,
                  track: finalTrack,
                },
                track: finalTrack,
              }),
            }
          );

          const result = await response.json();

          if (result.success) {
            setIsVerified(true);
            onSuccess(result);
          } else {
            Animated.spring(animatedValue, {
              toValue: 0,
              useNativeDriver: true,
              friction: 3,
            }).start();
            setSliderPosition(0);
            onFail?.(result.message || 'Verification failed');
          }
        } catch (error) {
          onFail?.(error instanceof Error ? error.message : 'Network error');
        } finally {
          setIsLoading(false);
        }
      },
    })
  ).current;

  const handleRefresh = useCallback(() => {
    setSliderPosition(0);
    setIsVerified(false);
    setTrack([]);
    animatedValue.setValue(0);
    onRefresh?.();
  }, [onRefresh, animatedValue]);

  if (!captchaData.imageUrl) {
    return (
      <View style={[styles.container, { width, height: height + 60 }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading captcha...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { width, height: height + 60 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>滑块验证码</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.imageContainer, { width, height }]}>
        <Image
          source={{ uri: captchaData.backgroundImage || captchaData.imageUrl }}
          style={[styles.backgroundImage, { width, height }]}
          resizeMode="cover"
        />
        
        {isVerified && (
          <View style={styles.successOverlay}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>验证成功</Text>
          </View>
        )}
      </View>

      <View style={styles.sliderContainer}>
        <View style={styles.sliderTrack}>
          <Animated.View
            style={[
              styles.sliderThumb,
              {
                transform: [{ translateX: animatedValue }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.sliderArrow}>→</Text>
            )}
          </Animated.View>
        </View>
        <Text style={styles.hint}>拖动滑块完成拼图</Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshButton}>
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
  imageContainer: {
    position: 'relative',
  },
  backgroundImage: {
    backgroundColor: '#F0F0F0',
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
  sliderContainer: {
    padding: 16,
    alignItems: 'center',
  },
  sliderTrack: {
    width: '100%',
    height: 40,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderThumb: {
    width: 50,
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    left: -5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  sliderArrow: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  hint: {
    marginTop: 12,
    fontSize: 12,
    color: '#999999',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingBottom: 12,
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 16,
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#999999',
  },
});

export default SliderCaptcha;
