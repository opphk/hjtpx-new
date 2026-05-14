import { useState, useEffect, useRef, useCallback } from 'react';

const PerformanceMetrics = {
  LCP: 'largest-contentful-paint',
  FID: 'first-input',
  CLS: 'layout-shift',
  FCP: 'first-contentful-paint',
  TTFB: 'responseStart'
};

export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState({
    lcp: null,
    fid: null,
    cls: null,
    fcp: null,
    ttfb: null,
    inp: null
  });
  const [webVitalsSupported, setWebVitalsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const observers = [];
    let clsValue = 0;
    let clsEntries = [];

    const updateCLS = () => {
      clsEntries.forEach(entry => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      setMetrics(prev => ({ ...prev, cls: Math.round(clsValue * 1000) / 1000 }));
    };

    try {
      if ('PerformanceObserver' in window) {
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              setMetrics(prev => ({ ...prev, fcp: Math.round(entry.startTime) }));
            }
          });
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        observers.push(paintObserver);

        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          setMetrics(prev => ({ 
            ...prev, 
            lcp: Math.round(lastEntry.renderTime || lastEntry.loadTime) 
          }));
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        observers.push(lcpObserver);

        const clsObserver = new PerformanceObserver((list) => {
          clsEntries = list.getEntries();
          requestAnimationFrame(updateCLS);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        observers.push(clsObserver);

        if ('PerformanceEventObserver' in window) {
          const fidObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach(entry => {
              setMetrics(prev => ({ 
                ...prev, 
                fid: Math.round(entry.processingStart - entry.startTime),
                inp: Math.round(entry.processingStart - entry.startTime)
              }));
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          observers.push(fidObserver);
        }

        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const navEntry = entries[0];
            const ttfb = navEntry.responseStart - navEntry.requestStart;
            setMetrics(prev => ({ 
              ...prev, 
              ttfb: Math.round(ttfb),
              navigationTime: navEntry.loadEventEnd - navEntry.requestStart
            }));
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        observers.push(navObserver);

        setWebVitalsSupported(true);
        setIsLoading(false);
      }

      const navEntry = performance.getEntriesByType('navigation')[0];
      if (navEntry) {
        setMetrics(prev => ({
          ...prev,
          ttfb: Math.round(navEntry.responseStart - navEntry.requestStart)
        }));
      }
    } catch (e) {
      console.warn('Performance metrics not fully supported:', e);
      setIsLoading(false);
    }

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

  return { metrics, webVitalsSupported, isLoading };
}

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [effectiveType, setEffectiveType] = useState(
    typeof navigator !== 'undefined' && navigator.connection
      ? navigator.connection.effectiveType
      : '4g'
  );
  const [downlink, setDownlink] = useState(
    typeof navigator !== 'undefined' && navigator.connection
      ? navigator.connection.downlink
      : null
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    const connection = navigator.connection;
    const handleConnectionChange = () => {
      if (connection) {
        setEffectiveType(connection.effectiveType);
        setDownlink(connection.downlink);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (connection) {
      connection.addEventListener('change', handleConnectionChange);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { isOnline, effectiveType, downlink };
}

export function useLazyLoad(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!elementRef.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);

          if (triggerOnce) {
            observerRef.current?.disconnect();
          }
        }
      },
      { threshold, rootMargin }
    );

    observerRef.current.observe(elementRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [threshold, rootMargin, triggerOnce]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return {
    ref: elementRef,
    isVisible,
    isLoaded,
    handleLoad
  };
}

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useThrottle(value, limit = 300) {
  const [throttledValue, setThrottledValue] = useState(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, limit]);

  return throttledValue;
}

export function useRAF(callback) {
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const animate = useCallback((time) => {
    if (previousTimeRef.current !== undefined) {
      const deltaTime = time - previousTimeRef.current;
      callback(deltaTime);
    }
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);
}

export function generatePerformanceReport(metrics, options = {}) {
  const {
    includeRecommendations = true,
    includeBenchmarks = true
  } = options;

  const report = {
    timestamp: new Date().toISOString(),
    metrics: {},
    scores: {},
    recommendations: [],
    benchmarks: {}
  };

  report.metrics = {
    LCP: {
      value: metrics.lcp,
      unit: 'ms',
      description: 'Largest Contentful Paint - 页面主要内容加载时间'
    },
    FID: {
      value: metrics.fid,
      unit: 'ms',
      description: 'First Input Delay - 首次输入延迟'
    },
    CLS: {
      value: metrics.cls,
      unit: 'score',
      description: 'Cumulative Layout Shift - 累计布局偏移'
    },
    FCP: {
      value: metrics.fcp,
      unit: 'ms',
      description: 'First Contentful Paint - 首次内容绘制'
    },
    TTFB: {
      value: metrics.ttfb,
      unit: 'ms',
      description: 'Time to First Byte - 首字节时间'
    }
  };

  report.scores = {
    LCP: calculateLCPScore(metrics.lcp),
    FID: calculateFIDScore(metrics.fid),
    CLS: calculateCLSScore(metrics.cls),
    FCP: calculateFCPScore(metrics.fcp),
    TTFB: calculateTTFBScore(metrics.ttfb)
  };

  if (includeRecommendations) {
    report.recommendations = generateRecommendations(metrics);
  }

  if (includeBenchmarks) {
    report.benchmarks = {
      LCP: { good: '< 2500ms', needsImprovement: '< 4000ms', poor: '>= 4000ms' },
      FID: { good: '< 100ms', needsImprovement: '< 300ms', poor: '>= 300ms' },
      CLS: { good: '< 0.1', needsImprovement: '< 0.25', poor: '>= 0.25' },
      FCP: { good: '< 1800ms', needsImprovement: '< 3000ms', poor: '>= 3000ms' },
      TTFB: { good: '< 800ms', needsImprovement: '< 1800ms', poor: '>= 1800ms' }
    };
  }

  return report;
}

function calculateLCPScore(lcp) {
  if (lcp === null) return 'unknown';
  if (lcp <= 2500) return 'good';
  if (lcp <= 4000) return 'needs-improvement';
  return 'poor';
}

function calculateFIDScore(fid) {
  if (fid === null) return 'unknown';
  if (fid <= 100) return 'good';
  if (fid <= 300) return 'needs-improvement';
  return 'poor';
}

function calculateCLSScore(cls) {
  if (cls === null) return 'unknown';
  if (cls <= 0.1) return 'good';
  if (cls <= 0.25) return 'needs-improvement';
  return 'poor';
}

function calculateFCPScore(fcp) {
  if (fcp === null) return 'unknown';
  if (fcp <= 1800) return 'good';
  if (fcp <= 3000) return 'needs-improvement';
  return 'poor';
}

function calculateTTFBScore(ttfb) {
  if (ttfb === null) return 'unknown';
  if (ttfb <= 800) return 'good';
  if (ttfb <= 1800) return 'needs-improvement';
  return 'poor';
}

function generateRecommendations(metrics) {
  const recommendations = [];

  if (metrics.lcp && metrics.lcp > 2500) {
    recommendations.push({
      metric: 'LCP',
      priority: 'high',
      suggestion: '优化 Largest Contentful Paint: 1) 使用 CDN 2) 压缩图片 3) 使用预加载 4) 移除阻塞渲染的资源'
    });
  }

  if (metrics.fid && metrics.fid > 100) {
    recommendations.push({
      metric: 'FID',
      priority: 'high',
      suggestion: '优化 First Input Delay: 1) 减少 JavaScript 执行时间 2) 使用代码分割 3) 优化事件处理'
    });
  }

  if (metrics.cls && metrics.cls > 0.1) {
    recommendations.push({
      metric: 'CLS',
      priority: 'high',
      suggestion: '优化 Cumulative Layout Shift: 1) 为图片和视频设置尺寸 2) 避免动态插入内容 3) 使用 transform 而非动画'
    });
  }

  if (metrics.ttfb && metrics.ttfb > 800) {
    recommendations.push({
      metric: 'TTFB',
      priority: 'medium',
      suggestion: '优化 Time to First Byte: 1) 使用服务器端缓存 2) 优化数据库查询 3) 使用 CDN'
    });
  }

  return recommendations;
}

export default {
  usePerformanceMetrics,
  useNetworkStatus,
  useLazyLoad,
  useDebounce,
  useThrottle,
  useRAF,
  generatePerformanceReport
};
