import React, { useState, useEffect } from 'react';

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallPrompt(true);
    };

    const handleAppInstalled = () => {
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      setShowInstallPrompt(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setShowInstallPrompt(false);
        setDeferredPrompt(null);
        setIsInstalled(true);
      } else {
        setShowInstallPrompt(false);
      }
    } catch (error) {
      console.error('PWA 安装失败:', error);
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  if (!showInstallPrompt || isInstalled) {
    return null;
  }

  return (
    <div style={styles.container}>
      <div style={styles.banner}>
        <div style={styles.icon}>📱</div>
        <div style={styles.content}>
          <h3 style={styles.title}>安装 HJTPX 应用</h3>
          <p style={styles.description}>安装到主屏幕，享受更好的体验</p>
        </div>
        <button style={styles.dismissBtn} onClick={handleDismiss}>✕</button>
      </div>
      <div style={styles.buttons}>
        <button style={styles.cancelBtn} onClick={handleDismiss}>
          稍后再说
        </button>
        <button style={styles.installBtn} onClick={handleInstallClick}>
          立即安装
        </button>
      </div>
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    bottom: 20,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '90%',
    maxWidth: 400,
    background: 'white',
    borderRadius: 16,
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
    padding: 16,
    zIndex: 10000,
    animation: 'slideUp 0.3s ease-out'
  },
  banner: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative'
  },
  icon: {
    fontSize: 36,
    marginRight: 12
  },
  content: {
    flex: 1
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: '#333'
  },
  description: {
    margin: 0,
    fontSize: 12,
    color: '#666',
    marginTop: 2
  },
  dismissBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    background: '#f0f0f0',
    border: 'none',
    width: 24,
    height: 24,
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 12,
    color: '#666'
  },
  buttons: {
    display: 'flex',
    gap: 10
  },
  cancelBtn: {
    flex: 1,
    padding: '10px 20px',
    border: '1px solid #ddd',
    background: 'white',
    color: '#333',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500
  },
  installBtn: {
    flex: 1,
    padding: '10px 20px',
    border: 'none',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600
  }
};

export default PWAInstallPrompt;
