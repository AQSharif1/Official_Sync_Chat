/**
 * CSRF (Cross-Site Request Forgery) Protection Utilities
 * SECURITY ENHANCED VERSION
 */

import React from 'react';

/**
 * CSRF Token interface
 */
interface CSRFToken {
  token: string;
  expiresAt: number;
}

/**
 * CSRF Protection class
 */
class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly STORAGE_KEY = 'csrf_token';

  /**
   * Generate a cryptographically secure random token
   * @returns Random token string
   */
  private static generateToken(): string {
    const array = new Uint8Array(this.TOKEN_LENGTH);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(array);
    } else {
      // Fallback for older browsers (less secure)
      for (let i = 0; i < this.TOKEN_LENGTH; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }
    
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create a new CSRF token
   * @returns CSRF token object
   */
  static createToken(): CSRFToken {
    const token = this.generateToken();
    const expiresAt = Date.now() + this.TOKEN_EXPIRY;
    
    const tokenData: CSRFToken = { token, expiresAt };
    
    // Store token in localStorage (in production, use httpOnly cookies)
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tokenData));
    }
    
    return tokenData;
  }

  /**
   * Get current CSRF token
   * @returns Current token or null if expired/missing
   */
  static getToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;
      
      const tokenData: CSRFToken = JSON.parse(stored);
      
      // Check if token is expired
      if (Date.now() > tokenData.expiresAt) {
        this.removeToken();
        return null;
      }
      
      return tokenData.token;
    } catch (error) {
      console.error('Error reading CSRF token:', error);
      this.removeToken();
      return null;
    }
  }

  /**
   * Validate a CSRF token
   * @param token - Token to validate
   * @returns True if token is valid
   */
  static validateToken(token: string): boolean {
    const currentToken = this.getToken();
    return currentToken === token;
  }

  /**
   * Remove CSRF token
   */
  static removeToken(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Refresh CSRF token
   * @returns New token
   */
  static refreshToken(): CSRFToken {
    this.removeToken();
    return this.createToken();
  }

  /**
   * Get token for use in headers
   * @returns Token string for headers
   */
  static getTokenForHeaders(): string | null {
    return this.getToken();
  }

  /**
   * Check if CSRF protection is available
   * @returns True if CSRF protection can be used
   */
  static isAvailable(): boolean {
    return typeof localStorage !== 'undefined' && 
           (typeof crypto !== 'undefined' || typeof Math.random === 'function');
  }
}

/**
 * Hook for using CSRF tokens in React components
 */
export const useCSRF = () => {
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get or create token on mount
    let currentToken = CSRFProtection.getToken();
    if (!currentToken) {
      const newToken = CSRFProtection.createToken();
      currentToken = newToken.token;
    }
    setToken(currentToken);

    // Refresh token before expiry
    const refreshInterval = setInterval(() => {
      const tokenData = CSRFProtection.getToken();
      if (!tokenData) {
        const newToken = CSRFProtection.createToken();
        setToken(newToken.token);
      }
    }, CSRFProtection.TOKEN_EXPIRY / 2); // Refresh halfway through

    return () => clearInterval(refreshInterval);
  }, []);

  const refreshToken = React.useCallback(() => {
    const newToken = CSRFProtection.refreshToken();
    setToken(newToken.token);
    return newToken.token;
  }, []);

  const validateToken = React.useCallback((tokenToValidate: string) => {
    return CSRFProtection.validateToken(tokenToValidate);
  }, []);

  return {
    token,
    refreshToken,
    validateToken,
    isAvailable: CSRFProtection.isAvailable()
  };
};

/**
 * Higher-order component for adding CSRF protection to components
 */
export const withCSRF = <P extends object>(
  Component: React.ComponentType<P & { csrfToken: string | null }>
) => {
  return (props: P) => {
    const { token } = useCSRF();
    return <Component {...props} csrfToken={token} />;
  };
};

/**
 * Utility for adding CSRF token to fetch requests
 */
export const fetchWithCSRF = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = CSRFProtection.getToken();
  
  if (!token) {
    throw new Error('CSRF token not available');
  }

  const headers = new Headers(options.headers);
  headers.set('X-CSRF-Token', token);
  
  return fetch(url, {
    ...options,
    headers
  });
};

/**
 * Utility for adding CSRF token to Supabase requests
 */
export const supabaseWithCSRF = (supabase: any) => {
  const originalFrom = supabase.from;
  
  // Intercept insert, update, delete operations
  supabase.from = function(table: string) {
    const query = originalFrom.call(this, table);
    
    // Add CSRF token to state-changing operations
    const originalInsert = query.insert;
    const originalUpdate = query.update;
    const originalDelete = query.delete;
    
    query.insert = function(data: any) {
      const token = CSRFProtection.getToken();
      if (token) {
        // Add CSRF token to the data (will be validated server-side)
        const dataWithCSRF = { ...data, _csrf_token: token };
        return originalInsert.call(this, dataWithCSRF);
      }
      return originalInsert.call(this, data);
    };
    
    query.update = function(data: any) {
      const token = CSRFProtection.getToken();
      if (token) {
        const dataWithCSRF = { ...data, _csrf_token: token };
        return originalUpdate.call(this, dataWithCSRF);
      }
      return originalUpdate.call(this, data);
    };
    
    query.delete = function() {
      const token = CSRFProtection.getToken();
      if (token) {
        // For delete operations, we might need to handle CSRF differently
        // This is a simplified approach
        return originalDelete.call(this);
      }
      return originalDelete.call(this);
    };
    
    return query;
  };
  
  return supabase;
};

// Export the main CSRF protection class
export { CSRFProtection };

// Export default instance
export default CSRFProtection;
