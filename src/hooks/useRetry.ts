import { useState, useCallback } from 'react';

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryCondition?: (error: any) => boolean;
}

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  lastError: any;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

export const useRetry = (config: Partial<RetryConfig> = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    lastError: null,
  });

  const calculateDelay = useCallback((attempt: number): number => {
    const delay = finalConfig.baseDelay * Math.pow(finalConfig.backoffMultiplier, attempt);
    return Math.min(delay, finalConfig.maxDelay);
  }, [finalConfig]);

  const shouldRetry = useCallback((error: any): boolean => {
    if (finalConfig.retryCondition) {
      return finalConfig.retryCondition(error);
    }

    // Default retry conditions
    const retryableErrors = [
      'Network Error',
      'Failed to fetch',
      'Connection timeout',
      'ECONNRESET',
      'ENOTFOUND',
      'ETIMEDOUT',
    ];

    const errorMessage = error?.message || error?.toString() || '';
    return retryableErrors.some(retryableError => 
      errorMessage.includes(retryableError)
    );
  }, [finalConfig]);

  const executeWithRetry = useCallback(async <T>(
    operation: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: any) => void
  ): Promise<T | null> => {
    let lastError: any;

    for (let attempt = 0; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        setState(prev => ({ ...prev, isRetrying: false, attempt }));
        
        const result = await operation();
        
        // Success - reset state
        setState(prev => ({ 
          ...prev, 
          isRetrying: false, 
          attempt: 0, 
          lastError: null 
        }));
        
        onSuccess?.(result);
        return result;
      } catch (error) {
        lastError = error;
        setState(prev => ({ 
          ...prev, 
          lastError: error,
          attempt: attempt + 1 
        }));

        // Don't retry on last attempt
        if (attempt === finalConfig.maxAttempts) {
          break;
        }

        // Check if we should retry this error
        if (!shouldRetry(error)) {
          break;
        }

        // Wait before retrying
        setState(prev => ({ ...prev, isRetrying: true }));
        await new Promise(resolve => setTimeout(resolve, calculateDelay(attempt)));
      }
    }

    // All attempts failed
    setState(prev => ({ ...prev, isRetrying: false }));
    onError?.(lastError);
    return null;
  }, [finalConfig, shouldRetry, calculateDelay]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      attempt: 0,
      lastError: null,
    });
  }, []);

  return {
    executeWithRetry,
    reset,
    isRetrying: state.isRetrying,
    attempt: state.attempt,
    lastError: state.lastError,
    hasError: state.lastError !== null,
  };
}; 