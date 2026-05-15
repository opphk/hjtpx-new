import { useCallback, useEffect, useRef } from 'react';

const useAnalytics = () => {
  const sessionIdRef = useRef(null);
  const deviceInfoRef = useRef(null);

  useEffect(() => {
    sessionIdRef.current = generateSessionId();
    deviceInfoRef.current = collectDeviceInfo();

    const handleBeforeUnload = () => {
      trackBehavior('session_end', {
        duration: Date.now() - sessionStartTime
      });
    };

    const sessionStartTime = Date.now();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const generateSessionId = () => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const collectDeviceInfo = () => {
    const ua = navigator.userAgent;
    let type = 'desktop';
    let browser = 'unknown';
    let os = 'unknown';

    if (/mobile/i.test(ua)) type = 'mobile';
    else if (/tablet/i.test(ua)) type = 'tablet';

    if (/chrome/i.test(ua)) browser = 'Chrome';
    else if (/firefox/i.test(ua)) browser = 'Firefox';
    else if (/safari/i.test(ua)) browser = 'Safari';
    else if (/edge/i.test(ua)) browser = 'Edge';

    if (/windows/i.test(ua)) os = 'Windows';
    else if (/mac/i.test(ua)) os = 'macOS';
    else if (/linux/i.test(ua)) os = 'Linux';
    else if (/android/i.test(ua)) os = 'Android';
    else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

    return { type, browser, os };
  };

  const track = useCallback(async (eventType, eventData = {}, metadata = {}) => {
    try {
      const response = await fetch('/api/v1/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventType,
          eventData,
          metadata: {
            ...metadata,
            sessionId: sessionIdRef.current,
            deviceInfo: deviceInfoRef.current,
            url: window.location.href,
            referrer: document.referrer
          }
        })
      });

      if (!response.ok) {
        console.error('Analytics tracking failed:', response.statusText);
      }
    } catch (error) {
      console.error('Analytics tracking error:', error);
    }
  }, []);

  const trackPageView = useCallback((pageData = {}) => {
    track('page_view', {
      page: pageData.page || window.location.pathname,
      title: pageData.title || document.title,
      url: window.location.href,
      referrer: document.referrer
    });
  }, [track]);

  const trackClick = useCallback((element, event) => {
    track('click', {
      element: element.tagName,
      elementId: element.id || null,
      elementClass: element.className || null,
      x: event.clientX,
      y: event.clientY,
      text: element.textContent?.substring(0, 50)
    });
  }, [track]);

  const trackFormSubmission = useCallback((form, success, duration) => {
    track('form_submission', {
      formId: form.id || null,
      formName: form.name || null,
      formAction: form.action || null,
      success,
      duration,
      fieldCount: form.elements?.length || 0
    });
  }, [track]);

  const trackSearch = useCallback((query, resultsCount, filters = {}) => {
    track('search', {
      query,
      resultsCount,
      filters: Object.keys(filters).length > 0 ? filters : null
    });
  }, [track]);

  const trackApiCall = useCallback((endpoint, method, statusCode, duration) => {
    track('api_call', {
      endpoint,
      method,
      statusCode,
      duration
    });
  }, [track]);

  const trackUserBehavior = useCallback((type, data) => {
    track('user_behavior', {
      type,
      ...data
    });
  }, [track]);

  const trackCustomEvent = useCallback((eventName, properties = {}) => {
    track(`custom:${eventName}`, properties);
  }, [track]);

  const trackError = useCallback((error, context = {}) => {
    track('error', {
      message: error.message || String(error),
      stack: error.stack || null,
      ...context
    });
  }, [track]);

  const trackPerformance = useCallback((metricName, value, unit = 'ms') => {
    track('performance', {
      metric: metricName,
      value,
      unit
    });
  }, [track]);

  const trackConversion = useCallback((goalId, value = null) => {
    track('conversion', {
      goalId,
      value,
      timestamp: Date.now()
    });
  }, [track]);

  useEffect(() => {
    trackPageView();

    let scrollDepth = 0;
    let maxScrollDepth = 0;
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      scrollDepth = Math.round((scrollTop / docHeight) * 100);

      if (scrollDepth > maxScrollDepth) {
        maxScrollDepth = scrollDepth;
      }
    };

    let clickCount = 0;
    const handleClick = (event) => {
      clickCount++;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('click', handleClick, true);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('click', handleClick, true);
      trackUserBehavior('page_session', {
        maxScrollDepth,
        clickCount
      });
    };
  }, [trackPageView, trackUserBehavior]);

  return {
    track,
    trackPageView,
    trackClick,
    trackFormSubmission,
    trackSearch,
    trackApiCall,
    trackUserBehavior,
    trackCustomEvent,
    trackError,
    trackPerformance,
    trackConversion,
    sessionId: sessionIdRef.current,
    deviceInfo: deviceInfoRef.current
  };
};

export default useAnalytics;
