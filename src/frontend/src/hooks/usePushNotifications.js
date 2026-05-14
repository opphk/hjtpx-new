import { useState, useEffect } from 'react';

const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('default');
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      console.log('通知功能不被支持');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('请求通知权限失败:', error);
      return false;
    }
  };

  const subscribeToPush = async (publicKey) => {
    if (!isSupported || permission !== 'granted') {
      console.log('通知功能未启用');
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription = await registration.pushManager.getSubscription();
      
      if (existingSubscription) {
        setSubscription(existingSubscription);
        return existingSubscription;
      }

      const options = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      };

      const newSubscription = await registration.pushManager.subscribe(options);
      setSubscription(newSubscription);
      return newSubscription;
    } catch (error) {
      console.error('订阅推送通知失败:', error);
      return null;
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) {
      return true;
    }

    try {
      await subscription.unsubscribe();
      setSubscription(null);
      return true;
    } catch (error) {
      console.error('取消订阅推送通知失败:', error);
      return false;
    }
  };

  const sendLocalNotification = (title, options = {}) => {
    if (permission !== 'granted') {
      console.log('通知权限未授予');
      return;
    }

    if ('Notification' in window) {
      new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        vibrate: [100, 50, 100],
        ...options
      });
    }
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  };

  return {
    isSupported,
    permission,
    subscription,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    sendLocalNotification
  };
};

export default usePushNotifications;
