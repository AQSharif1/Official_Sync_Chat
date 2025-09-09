import { useCallback, useEffect, useRef, useMemo } from 'react';
import { usePerformanceMonitor } from './usePerformanceMonitor';

interface PerformanceOptimizations {
  debounce: <T extends (...args: any[]) => any>(func: T, delay: number) => T;
  throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => T;
  memoize: <T extends (...args: any[]) => any>(func: T) => T;
  cleanup: () => void;
}

export const usePerformanceOptimizations = (): PerformanceOptimizations => {
  const { trackPerformance, trackError } = usePerformanceMonitor();
  const cleanupFunctions = useRef<(() => void)[]>([]);

  // Debounce function to limit rapid calls
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): T => {
    let timeoutId: NodeJS.Timeout;
    
    return ((...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const start = performance.now();
        try {
          func(...args);
          trackPerformance('debounced_function', performance.now() - start);
        } catch (error) {
          trackError(error as Error, 'debounced_function');
        }
      }, delay);
    }) as T;
  }, [trackPerformance, trackError]);

  // Throttle function to limit execution frequency
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): T => {
    let lastFunc: NodeJS.Timeout;
    let lastRan: number;
    
    return ((...args: Parameters<T>) => {
      if (!lastRan) {
        const start = performance.now();
        try {
          func(...args);
          trackPerformance('throttled_function', performance.now() - start);
        } catch (error) {
          trackError(error as Error, 'throttled_function');
        }
        lastRan = Date.now();
      } else {
        clearTimeout(lastFunc);
        lastFunc = setTimeout(() => {
          if ((Date.now() - lastRan) >= limit) {
            const start = performance.now();
            try {
              func(...args);
              trackPerformance('throttled_function', performance.now() - start);
            } catch (error) {
              trackError(error as Error, 'throttled_function');
            }
            lastRan = Date.now();
          }
        }, limit - (Date.now() - lastRan));
      }
    }) as T;
  }, [trackPerformance, trackError]);

  // Memoization with cache size limit
  const memoize = useCallback(<T extends (...args: any[]) => any>(func: T): T => {
    const cache = new Map<string, any>();
    const MAX_CACHE_SIZE = 100;
    
    return ((...args: Parameters<T>) => {
      const key = JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const start = performance.now();
      try {
        const result = func(...args);
        trackPerformance('memoized_function', performance.now() - start);
        
        // Limit cache size
        if (cache.size >= MAX_CACHE_SIZE) {
          const firstKey = cache.keys().next().value;
          cache.delete(firstKey);
        }
        
        cache.set(key, result);
        return result;
      } catch (error) {
        trackError(error as Error, 'memoized_function');
        throw error;
      }
    }) as T;
  }, [trackPerformance, trackError]);

  // Cleanup function
  const cleanup = useCallback(() => {
    cleanupFunctions.current.forEach(cleanupFn => {
      try {
        cleanupFn();
      } catch (error) {
        trackError(error as Error, 'cleanup');
      }
    });
    cleanupFunctions.current = [];
  }, [trackError]);

  // Register cleanup function
  const registerCleanup = useCallback((cleanupFn: () => void) => {
    cleanupFunctions.current.push(cleanupFn);
  }, []);

  // Auto-cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    debounce,
    throttle,
    memoize,
    cleanup
  };
};

// Hook for optimizing expensive calculations
export const useExpensiveCalculation = <T>(
  calculation: () => T,
  deps: React.DependencyList
): T => {
  const { memoize } = usePerformanceOptimizations();
  
  return useMemo(() => {
    return memoize(calculation)();
  }, deps);
};

// Hook for optimizing event handlers
export const useOptimizedEventHandler = <T extends (...args: any[]) => any>(
  handler: T,
  options: {
    debounceMs?: number;
    throttleMs?: number;
    memoize?: boolean;
  } = {}
): T => {
  const { debounce, throttle, memoize } = usePerformanceOptimizations();
  
  return useMemo(() => {
    let optimizedHandler = handler;
    
    if (options.memoize) {
      optimizedHandler = memoize(optimizedHandler);
    }
    
    if (options.throttleMs) {
      optimizedHandler = throttle(optimizedHandler, options.throttleMs);
    }
    
    if (options.debounceMs) {
      optimizedHandler = debounce(optimizedHandler, options.debounceMs);
    }
    
    return optimizedHandler;
  }, [handler, options.debounceMs, options.throttleMs, options.memoize, debounce, throttle, memoize]);
};
