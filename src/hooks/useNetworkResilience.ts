import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export const useNetworkResilience = (config: Partial<RetryConfig> = {}) => {
  const finalConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const { toast } = useToast();
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsReconnecting(false);
      retryCountRef.current = 0;
      
      toast({
        title: "Connection restored",
        description: "You're back online!",
        duration: 3000,
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsReconnecting(true);
      
      toast({
        title: "Connection lost",
        description: "You're offline. Some features may be limited.",
        variant: "destructive",
        duration: 5000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // Exponential backoff retry function
  const retryWithBackoff = useCallback(async <T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> => {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        retryCountRef.current = 0; // Reset on success
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === finalConfig.maxRetries) {
          console.error(`Failed after ${finalConfig.maxRetries + 1} attempts:`, error);
          throw lastError;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt),
          finalConfig.maxDelay
        );

        console.warn(`${context} failed (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}), retrying in ${delay}ms:`, error);

        // Wait before retry
        await new Promise(resolve => {
          retryTimeoutRef.current = setTimeout(resolve, delay);
        });
      }
    }

    throw lastError;
  }, [finalConfig]);

  // Queue operations when offline
  const queueOperation = useCallback(<T>(
    operation: () => Promise<T>,
    context: string = 'queued operation'
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      const executeWhenOnline = async () => {
        try {
          const result = await retryWithBackoff(operation, context);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };

      if (isOnline) {
        executeWhenOnline();
      } else {
        // Queue for when connection is restored
        const handleOnline = () => {
          executeWhenOnline();
          window.removeEventListener('online', handleOnline);
        };
        
        window.addEventListener('online', handleOnline);
        
        // Reject after timeout if still offline
        setTimeout(() => {
          window.removeEventListener('online', handleOnline);
          reject(new Error('Operation timed out while offline'));
        }, 30000); // 30 second timeout
      }
    });
  }, [isOnline, retryWithBackoff]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    isOnline,
    isReconnecting,
    retryWithBackoff,
    queueOperation,
    retryCount: retryCountRef.current,
  };
};

// Hook for specific operation retry
export const useRetryableOperation = <T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {}
) => {
  const { retryWithBackoff, isOnline } = useNetworkResilience(config);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (): Promise<T | null> => {
    if (!isOnline) {
      setError(new Error('No internet connection'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await retryWithBackoff(operation);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [operation, retryWithBackoff, isOnline]);

  return {
    execute,
    isLoading,
    error,
    isOnline,
  };
};

