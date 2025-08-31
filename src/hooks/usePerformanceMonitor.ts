import { useState, useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage?: number;
  networkLatency?: number;
  bundleSize?: number;
  timeToInteractive?: number;
}

interface ErrorData {
  message: string;
  stack?: string;
  context?: string;
  timestamp: string;
  userAgent: string;
  url: string;
  metrics?: PerformanceMetrics;
  userId?: string;
  sessionId?: string;
}

interface UserAction {
  action: string;
  duration?: number;
  timestamp: string;
  metrics?: PerformanceMetrics;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface PerformanceConfig {
  enableRealUserMonitoring: boolean;
  enableErrorTracking: boolean;
  enableActionTracking: boolean;
  sampleRate: number; // 0-1, percentage of sessions to monitor
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableRealUserMonitoring: true,
  enableErrorTracking: true,
  enableActionTracking: true,
  sampleRate: 0.1, // Monitor 10% of sessions
};

export const usePerformanceMonitor = (config: Partial<PerformanceConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const sessionId = useRef<string>(`session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const startTime = useRef<number>(performance.now());
  const navigationStart = useRef<number>(performance.timing?.navigationStart || Date.now());

  // Initialize monitoring
  useEffect(() => {
    // Check if we should monitor this session
    if (Math.random() > finalConfig.sampleRate) {
      return;
    }

    setIsMonitoring(true);
    
    // Measure initial load time
    const measureLoadTime = () => {
      const loadEventEnd = performance.timing?.loadEventEnd || Date.now();
      const loadTime = loadEventEnd - navigationStart.current;
      
      return loadTime;
    };

    // Measure time to interactive
    const measureTimeToInteractive = () => {
      const domContentLoaded = performance.timing?.domContentLoadedEventEnd || Date.now();
      const tti = domContentLoaded - navigationStart.current;
      
      return tti;
    };

    // Measure render time
    const measureRenderTime = () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime.current;
      
      return renderTime;
    };

    // Get memory usage if available
    const getMemoryUsage = (): number | undefined => {
      if ('memory' in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return undefined;
    };

    // Measure network latency
    const measureNetworkLatency = async (): Promise<number | undefined> => {
      try {
        const start = performance.now();
        await fetch('/api/health', { method: 'HEAD' });
        const end = performance.now();
        return end - start;
      } catch {
        return undefined;
      }
    };

    // Collect all metrics
    const collectMetrics = async () => {
      const loadTime = measureLoadTime();
      const renderTime = measureRenderTime();
      const timeToInteractive = measureTimeToInteractive();
      const memoryUsage = getMemoryUsage();
      const networkLatency = await measureNetworkLatency();

      const newMetrics: PerformanceMetrics = {
        loadTime,
        renderTime,
        timeToInteractive,
        memoryUsage,
        networkLatency,
      };

      setMetrics(newMetrics);
      
      // Log performance issues
      if (newMetrics.renderTime > 1000) {
        // Slow render detected
      }
      
      if (newMetrics.loadTime > 3000) {
        // Slow load detected
      }

      // Send metrics to analytics (in production)
      if (process.env.NODE_ENV === 'production') {
        sendMetricsToAnalytics(newMetrics);
      }
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      requestIdleCallback(collectMetrics);
    } else {
      setTimeout(collectMetrics, 0);
    }
  }, [finalConfig.sampleRate]);

  // Send metrics to analytics service
  const sendMetricsToAnalytics = useCallback((metrics: PerformanceMetrics) => {
    // In production, send to your analytics service
    // Example: Google Analytics, Mixpanel, etc.
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metrics', {
        load_time: metrics.loadTime,
        render_time: metrics.renderTime,
        memory_usage: metrics.memoryUsage,
        network_latency: metrics.networkLatency,
        time_to_interactive: metrics.timeToInteractive,
      });
    }
  }, []);

  // Enhanced error tracking
  const trackError = useCallback((error: Error, context?: string, userId?: string) => {
    if (!finalConfig.enableErrorTracking) return;

    const errorData: ErrorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      metrics: metrics ?? undefined,
      userId,
      sessionId: sessionId.current,
    };

    // Log error for monitoring
          // Error tracked in performance monitor

    // Send to error monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      sendErrorToMonitoring(errorData);
    }
  }, [finalConfig.enableErrorTracking, metrics]);

  // Send error to monitoring service
  const sendErrorToMonitoring = useCallback((errorData: ErrorData) => {
    // In production, send to your error monitoring service
    // Example: Sentry, LogRocket, etc.
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(new Error(errorData.message), {
        extra: errorData,
      });
    }
  }, []);

  // Enhanced user action tracking
  const trackUserAction = useCallback((
    action: string, 
    duration?: number, 
    metadata?: Record<string, any>,
    userId?: string
  ) => {
    if (!finalConfig.enableActionTracking) return;

    const actionData: UserAction = {
      action,
      duration,
      timestamp: new Date().toISOString(),
      metrics: metrics ?? undefined,
      userId,
      sessionId: sessionId.current,
      metadata,
    };

    // Log action for analytics
          // Action tracked in performance monitor

    // Send to analytics service in production
    if (process.env.NODE_ENV === 'production') {
      sendActionToAnalytics(actionData);
    }
  }, [finalConfig.enableActionTracking, metrics]);

  // Send action to analytics service
  const sendActionToAnalytics = useCallback((actionData: UserAction) => {
    // In production, send to your analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'user_action', {
        action: actionData.action,
        duration: actionData.duration,
        ...actionData.metadata,
      });
    }
  }, []);

  // Track page performance
  const trackPagePerformance = useCallback((pageName: string) => {
    if (!finalConfig.enableRealUserMonitoring) return;

    const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (navigationTiming) {
      const pageMetrics = {
        page: pageName,
        loadTime: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
        domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime,
        timestamp: new Date().toISOString(),
        sessionId: sessionId.current,
      };

      // Page performance metrics collected

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        sendPageMetricsToAnalytics(pageMetrics);
      }
    }
  }, [finalConfig.enableRealUserMonitoring]);

  // Send page metrics to analytics
  const sendPageMetricsToAnalytics = useCallback((pageMetrics: any) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_performance', pageMetrics);
    }
  }, []);

  // Get performance insights
  const getPerformanceInsights = useCallback(() => {
    if (!metrics) return null;

    const insights = {
      isSlow: metrics.renderTime > 1000 || metrics.loadTime > 3000,
      recommendations: [] as string[],
    };

    if (metrics.renderTime > 1000) {
      insights.recommendations.push('Consider code splitting to reduce render time');
    }

    if (metrics.loadTime > 3000) {
      insights.recommendations.push('Optimize bundle size and enable compression');
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 50 * 1024 * 1024) { // 50MB
      insights.recommendations.push('Memory usage is high, check for memory leaks');
    }

    return insights;
  }, [metrics]);

  return {
    metrics,
    isMonitoring,
    trackError,
    trackUserAction,
    trackPagePerformance,
    getPerformanceInsights,
    sessionId: sessionId.current,
  };
};