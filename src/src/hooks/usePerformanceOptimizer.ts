import { useEffect, useCallback, useRef } from 'react';

interface PerformanceMetrics {
  renderCount: number;
  lastRenderTime: number;
  averageRenderTime: number;
  memoryUsage?: number;
  isSlowRender: boolean;
}

/**
 * Performance monitoring and optimization hook
 * Tracks render performance and provides optimization recommendations
 */
export const usePerformanceOptimizer = (componentName: string) => {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef<number[]>([]);
  const startTimeRef = useRef<number>(0);

  // Start tracking render time
  const startRenderTracking = useCallback(() => {
    startTimeRef.current = performance.now();
  }, []);

  // End tracking and record metrics
  const endRenderTracking = useCallback(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;
    
    renderCountRef.current += 1;
    renderTimesRef.current.push(renderTime);
    
    // Keep only last 10 render times for average calculation
    if (renderTimesRef.current.length > 10) {
      renderTimesRef.current = renderTimesRef.current.slice(-10);
    }

    // Log slow renders (>16ms for 60fps)
    if (renderTime > 16) {
      // Performance warning: Slow render
    }

    // Log component metrics every 50 renders
    if (renderCountRef.current % 50 === 0) {
      const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;
      console.log(`📊 ${componentName} performance:`, {
        renders: renderCountRef.current,
        avgRenderTime: `${avgRenderTime.toFixed(2)  }ms`,
        lastRender: `${renderTime.toFixed(2)  }ms`
      });
    }
  }, [componentName]);

  // Get current metrics
  const getMetrics = useCallback((): PerformanceMetrics => {
    const renderTimes = renderTimesRef.current;
    const lastRenderTime = renderTimes[renderTimes.length - 1] || 0;
    const averageRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0;

    return {
      renderCount: renderCountRef.current,
      lastRenderTime,
      averageRenderTime,
      memoryUsage: (performance as any).memory?.usedJSHeapSize,
      isSlowRender: lastRenderTime > 16
    };
  }, []);

  // Optimize heavy operations with debouncing
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  }, []);

  // Throttle high-frequency operations
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    let lastFunc: NodeJS.Timeout;
    let lastRan: number;
    
    return ((...args: Parameters<T>) => {
      if (!lastRan) {
        func(...args);
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    }) as T;
  }, []);

  // Memory usage monitoring
  const monitorMemory = useCallback(() => {
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1048576);
      const totalMB = Math.round(memory.totalJSHeapSize / 1048576);
      
      if (usedMB > 100) { // Warn if using more than 100MB
        // Memory warning: High usage
      }
      
      return { used: usedMB, total: totalMB };
    }
    return null;
  }, [componentName]);

  // Auto-track renders
  useEffect(() => {
    startRenderTracking();
    return () => {
      endRenderTracking();
    };
  });

  // Monitor memory every 30 seconds
  useEffect(() => {
    const interval = setInterval(monitorMemory, 30000);
    return () => clearInterval(interval);
  }, [monitorMemory]);

  return {
    getMetrics,
    debounce,
    throttle,
    monitorMemory,
    startRenderTracking,
    endRenderTracking
  };
};
