import { useState, useEffect } from 'react';

const useServiceWorker = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStatus, setCacheStatus] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      setIsSupported(true);
      registerServiceWorker();
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          });
      setRegistration(reg);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setUpdateAvailable(true);
            }
          });
        }
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service Worker 更新完成');
        setUpdateAvailable(false);
      });

      console.log('Service Worker 注册成功:', reg.scope);
    } catch (error) {
      console.error('Service Worker 注册失败:', error);
    }
  };

  const updateServiceWorker = () => {
    if (registration) {
      registration.update();
    }
  };

  const skipWaiting = () => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ action: 'skipWaiting' });
    }
  };

  const clearCache = async () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'clearCache' });
    }
  };

  const getCacheStatus = async () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'getCacheStatus' });
      
      const handleMessage = (event) => {
        if (event.data.action === 'cacheStatus') {
          setCacheStatus(event.data.stats);
          navigator.serviceWorker.removeEventListener('message', handleMessage);
        }
      };
      
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }
  };

  const registerSync = async (tag = 'sync-data') => {
    if (registration && 'SyncManager' in window) {
      try {
        await registration.sync.register(tag);
        console.log('后台同步注册成功');
        return true;
      } catch (error) {
        console.error('后台同步注册失败:', error);
        return false;
      }
    }
    return false;
  };

  return {
    isSupported,
    registration,
    updateAvailable,
    isOnline,
    cacheStatus,
    updateServiceWorker,
    skipWaiting,
    clearCache,
    getCacheStatus,
    registerSync
  };
};

export default useServiceWorker;
