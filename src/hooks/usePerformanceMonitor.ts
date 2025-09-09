import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkLatency: number;
  errorCount: number;
}

interface PerformanceConfig {
  enableMemoryMonitoring: boolean;
  enableNetworkMonitoring: boolean;
  enableRenderMonitoring: boolean;
  sampleRate: number; // 0-1, percentage of operations to monitor
}

const DEFAULT_CONFIG: PerformanceConfig = {
  enableMemoryMonitoring: true,
  enableNetworkMonitoring: true,
  enableRenderMonitoring: true,
  sampleRate: 0.1, // Monitor 10% of operations
};

export const usePerformanceMonitor = (config: Partial<PerformanceConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const metricsRef = useRef<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    networkLatency: 0,
    errorCount: 0,
  });
  const renderStartRef = useRef<number>(0);
  const networkStartRef = useRef<number>(0);

  // Track render performance
  const startRenderTimer = useCallback(() => {
    if (finalConfig.enableRenderMonitoring && Math.random() < finalConfig.sampleRate) {
      renderStartRef.current = performance.now();
    }
  }, [finalConfig]);

  const endRenderTimer = useCallback(() => {
    if (renderStartRef.current > 0) {
      const renderTime = performance.now() - renderStartRef.current;
      metricsRef.current.renderTime = renderTime;
      renderStartRef.current = 0;

      // Log slow renders
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
    }
  }, []);

  // Track memory usage
  const updateMemoryUsage = useCallback(() => {
    if (finalConfig.enableMemoryMonitoring && 'memory' in performance) {
      const memory = (performance as any).memory;
      if (memory) {
        metricsRef.current.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB

        // Log high memory usage
        if (metricsRef.current.memoryUsage > 100) { // 100MB threshold
          console.warn(`High memory usage: ${metricsRef.current.memoryUsage.toFixed(2)}MB`);
        }
      }
    }
  }, [finalConfig]);

  // Track network performance
  const startNetworkTimer = useCallback(() => {
    if (finalConfig.enableNetworkMonitoring && Math.random() < finalConfig.sampleRate) {
      networkStartRef.current = performance.now();
    }
  }, [finalConfig]);

  const endNetworkTimer = useCallback(() => {
    if (networkStartRef.current > 0) {
      const networkTime = performance.now() - networkStartRef.current;
      metricsRef.current.networkLatency = networkTime;
      networkStartRef.current = 0;

      // Log slow network requests
      if (networkTime > 2000) { // 2 second threshold
        console.warn(`Slow network request: ${networkTime.toFixed(2)}ms`);
      }
    }
  }, []);

  // Track errors
  const trackError = useCallback((error: Error, context: string) => {
    metricsRef.current.errorCount++;
    console.error(`Error in ${context}:`, error);

    // Send to monitoring service if available
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'exception', {
        description: error.message,
        fatal: false,
        custom_map: {
          context: context,
        },
      });
    }
  }, []);

  // Track user actions
  const trackUserAction = useCallback((action: string, metadata?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'user_action', {
        action: action,
        ...metadata,
      });
    }
  }, []);

  // Track performance metrics
  const trackPerformance = useCallback((metric: string, value: number, metadata?: Record<string, any>) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metric', {
        metric: metric,
        value: value,
        ...metadata,
      });
    }
  }, []);

  // Monitor memory usage periodically
  useEffect(() => {
    if (!finalConfig.enableMemoryMonitoring) return;

    const interval = setInterval(updateMemoryUsage, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [finalConfig.enableMemoryMonitoring, updateMemoryUsage]);

  // Monitor overall performance
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          trackPerformance(entry.name, entry.duration);
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });

    return () => observer.disconnect();
  }, [trackPerformance]);

  return {
    metrics: metricsRef.current,
    startRenderTimer,
    endRenderTimer,
    startNetworkTimer,
    endNetworkTimer,
    trackError,
    trackUserAction,
    trackPerformance,
    updateMemoryUsage,
  };
};

// Hook for measuring component render performance
export const useRenderPerformance = (componentName: string) => {
  const { startRenderTimer, endRenderTimer, trackPerformance } = usePerformanceMonitor();

  useEffect(() => {
    startRenderTimer();
    
    return () => {
      endRenderTimer();
      trackPerformance(`${componentName}_render`, performance.now());
    };
  }, [componentName, startRenderTimer, endRenderTimer, trackPerformance]);
};

// Hook for measuring async operation performance
export const useAsyncPerformance = () => {
  const { startNetworkTimer, endNetworkTimer, trackPerformance } = usePerformanceMonitor();

  const measureAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> => {
    startNetworkTimer();
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      trackPerformance(operationName, duration);
      return result;
    } finally {
      endNetworkTimer();
    }
  }, [startNetworkTimer, endNetworkTimer, trackPerformance]);

  return { measureAsync };
};