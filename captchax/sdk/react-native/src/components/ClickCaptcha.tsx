import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  CaptchaComponentProps,
  CaptchaTrack,
  ClickResponse,
} from '../types';

interface ClickCaptchaComponentProps extends CaptchaComponentProps {
  targetPositions?: Array<{ x: number; y: number }>;
  maxClicks?: number;
  imageWidth?: number;
  imageHeight?: number;
}

const ClickCaptcha: React.FC<ClickCaptchaComponentProps> = ({
  captchaData,
  onSuccess,
  onFail,
  onClose,
  onRefresh,
  width = 300,
  height = 200,
  targetPositions = [],
  maxClicks = 4,
}) => {
  const [clicks, setClicks] = useState<Array<{ x: number; y: number }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [track, setTrack] = useState<CaptchaTrack[]>([]);
  const startTimeRef = useRef<number>(0);

  const handleImagePress = useCallback(
    (event: any) => {
      if (isVerified || isLoading) return;

      if (startTimeRef.current === 0) {
        startTimeRef.current = Date.now();
      }

      const { locationX, locationY } = event.nativeEvent;
      const newClick = { x: locationX, y: locationY };
      const newClicks = [...clicks, newClick];
      setClicks(newClicks);

      const timestamp = Date.now() - startTimeRef.current;
      setTrack(prev => [...prev, { x: locationX, y: locationY, timestamp }]);

      if (newClicks.length >= maxClicks) {
        verifyCaptcha(newClicks);
      }
    },
    [clicks, isVerified, isLoading, maxClicks]
  );

  const verifyCaptcha = async (positions: Array<{ x: number; y: number }>) => {
    setIsLoading(true);

    try {
      const userResponse: ClickResponse = {
        positions,
        track,
      };

      const response = await fetch(
        `${captchaData.captchaId ? '/api/v1/captcha/click/verify' : ''}`,
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
        setClicks([]);
        setTrack([]);
        onFail?.(result.message || 'Verification failed');
      }
    } catch (error) {
      setClicks([]);
      setTrack([]);
      onFail?.(error instanceof Error ? error.message : 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    setClicks([]);
    setIsVerified(false);
    setTrack([]);
    startTimeRef.current = 0;
    onRefresh?.();
  }, [onRefresh]);

  const removeLastClick = useCallback(() => {
    if (clicks.length > 0 && !isLoading) {
      setClicks(prev => prev.slice(0, -1));
      setTrack(prev => prev.slice(0, -1));
    }
  }, [clicks, isLoading]);

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
        <Text style={styles.title}>点选验证码</Text>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeButton}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.imageContainer, { width, height }]}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleImagePress}
          style={styles.touchableArea}
        >
          <Image
            source={{ uri: captchaData.imageUrl }}
            style={[styles.image, { width, height }]}
            resizeMode="cover"
          />

          {clicks.map((click, index) => (
            <View
              key={index}
              style={[
                styles.clickMarker,
                {
                  left: click.x - 15,
                  top: click.y - 15,
                },
              ]}
            >
              <Text style={styles.clickNumber}>{index + 1}</Text>
            </View>
          ))}

          {isVerified && (
            <View style={styles.successOverlay}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>验证成功</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.hint}>
          {isLoading
            ? '验证中...'
            : `请依次点击图中目标 (${clicks.length}/${maxClicks})`}
        </Text>
        {clicks.length > 0 && !isLoading && (
          <TouchableOpacity onPress={removeLastClick} style={styles.undoButton}>
            <Text style={styles.undoButtonText}>撤销</Text>
          </TouchableOpacity>
        )}
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
  touchableArea: {
    flex: 1,
  },
  image: {
    backgroundColor: '#F0F0F0',
  },
  clickMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0, 122, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  clickNumber: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
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
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  hint: {
    fontSize: 12,
    color: '#666666',
    flex: 1,
  },
  undoButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    marginLeft: 8,
  },
  undoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
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

export default ClickCaptcha;
