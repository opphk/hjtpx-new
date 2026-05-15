import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  PanResponder,
  Animated,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import {
  CaptchaComponentProps,
  CaptchaTrack,
  RotateResponse,
} from '../types';

interface RotateCaptchaComponentProps extends CaptchaComponentProps {
  targetAngle?: number;
  imageSize?: number;
}

const RotateCaptcha: React.FC<RotateCaptchaComponentProps> = ({
  captchaData,
  onSuccess,
  onFail,
  onClose,
  onRefresh,
  width = 300,
  height = 300,
  targetAngle = 0,
  imageSize = 200,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [track, setTrack] = useState<CaptchaTrack[]>([]);
  const animatedRotation = useRef(new Animated.Value(0)).current;
  const lastAngleRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const centerRef = useRef({ x: imageSize / 2, y: imageSize / 2 });

  const calculateAngle = (x: number, y: number) => {
    const dx = x - centerRef.current.x;
    const dy = y - centerRef.current.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        startTimeRef.current = Date.now();
        lastAngleRef.current = calculateAngle(
          evt.nativeEvent.locationX,
          evt.nativeEvent.locationY
        );
        setTrack([]);
      },
      onPanResponderMove: (evt, gestureState) => {
        const currentTouchAngle = calculateAngle(
          evt.nativeEvent.locationX,
          evt.nativeEvent.locationY
        );
        const deltaAngle = currentTouchAngle - lastAngleRef.current;
        lastAngleRef.current = currentTouchAngle;

        const newAngle = currentAngle + deltaAngle;
        setCurrentAngle(newAngle);
        animatedRotation.setValue(newAngle);

        const timestamp = Date.now() - startTimeRef.current;
        setTrack((prev) => [
          ...prev,
          {
            x: evt.nativeEvent.locationX,
            y: evt.nativeEvent.locationY,
            timestamp,
          },
        ]);
      },
      onPanResponderRelease: async () => {
        setIsLoading(true);

        try {
          const userResponse: RotateResponse = {
            angle: currentAngle,
            track,
          };

          const response = await fetch(
            `${captchaData.captchaId ? '/api/v1/captcha/rotate/verify' : ''}`,
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
            Animated.spring(animatedRotation, {
              toValue: 0,
              useNativeDriver: true,
              friction: 3,
            }).start();
            setCurrentAngle(0);
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
    setCurrentAngle(0);
    setIsVerified(false);
    setTrack([]);
    animatedRotation.setValue(0);
    startTimeRef.current = 0;
    onRefresh?.();
  }, [onRefresh, animatedRotation]);

  const rotateImage = useCallback(
    (angle: number) => {
      const newAngle = currentAngle + angle;
      setCurrentAngle(newAngle);
      Animated.spring(animatedRotation, {
        toValue: newAngle,
        useNativeDriver: true,
        friction: 3,
      }).start();
    },
    [currentAngle, animatedRotation]
  );

  return (
    <View style={[styles.container, { width, height: height + 60 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>旋转验证码</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.imageContainer, { width, height }]}>
        <View style={styles.rotateArea}>
          <Animated.View
            style={[
              styles.imageWrapper,
              {
                width: imageSize,
                height: imageSize,
                transform: [{ rotate: animatedRotation }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Image
              source={{ uri: captchaData.imageUrl || captchaData.thumbnailUrl || '' }}
              style={styles.image}
              resizeMode="contain"
            />
          </Animated.View>

          <View style={styles.targetIndicator}>
            <View style={styles.arrowUp} />
            <Text style={styles.targetText}>目标位置</Text>
          </View>
        </View>

        {isVerified && (
          <View style={styles.successOverlay}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>验证成功</Text>
          </View>
        )}
      </View>

      <View style={styles.controlContainer}>
        <TouchableOpacity
          style={styles.rotateButton}
          onPress={() => rotateImage(-15)}
        >
          <Text style={styles.rotateButtonText}>↺ -15°</Text>
        </TouchableOpacity>

        <View style={styles.angleDisplay}>
          <Text style={styles.angleText}>{currentAngle.toFixed(1)}°</Text>
        </View>

        <TouchableOpacity
          style={styles.rotateButton}
          onPress={() => rotateImage(15)}
        >
          <Text style={styles.rotateButtonText}>↻ +15°</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleRefresh}
          style={styles.refreshButton}
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
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  rotateArea: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  targetIndicator: {
    position: 'absolute',
    top: -40,
    alignItems: 'center',
  },
  arrowUp: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 16,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#007AFF',
  },
  targetText: {
    marginTop: 4,
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
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
  controlContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
  },
  rotateButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 20,
    elevation: 2,
  },
  rotateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  angleDisplay: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
  },
  angleText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
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
});

export default RotateCaptcha;
