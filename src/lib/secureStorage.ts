/**
 * Secure Storage Utilities
 * Provides encrypted localStorage with additional security measures
 */

/**
 * Encryption key management
 */
class EncryptionKeyManager {
  private static readonly KEY_PREFIX = 'secure_storage_key_';
  private static readonly MASTER_KEY = 'master_encryption_key';

  /**
   * Generate a new encryption key
   */
  static generateKey(): string {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const array = new Uint8Array(32);
      crypto.getRandomValues(array);
      return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
    
    // Fallback for older browsers
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Get or create encryption key for a namespace
   */
  static getKey(namespace: string): string {
    const keyName = this.KEY_PREFIX + namespace;
    let key = localStorage.getItem(keyName);
    
    if (!key) {
      key = this.generateKey();
      localStorage.setItem(keyName, key);
    }
    
    return key;
  }

  /**
   * Rotate encryption key for a namespace
   */
  static rotateKey(namespace: string): string {
    const newKey = this.generateKey();
    const keyName = this.KEY_PREFIX + namespace;
    localStorage.setItem(keyName, newKey);
    return newKey;
  }
}

/**
 * Simple encryption/decryption utilities
 * Note: This is client-side encryption for basic protection
 * For high-security applications, use server-side encryption
 */
class SimpleCrypto {
  /**
   * Simple XOR encryption (basic protection)
   * @param text - Text to encrypt
   * @param key - Encryption key
   * @returns Encrypted text
   */
  static encrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result); // Base64 encode
  }

  /**
   * Simple XOR decryption
   * @param encryptedText - Encrypted text
   * @param key - Decryption key
   * @returns Decrypted text
   */
  static decrypt(encryptedText: string, key: string): string {
    try {
      const decoded = atob(encryptedText); // Base64 decode
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (error) {
      console.error('Decryption failed:', error);
      return '';
    }
  }
}

/**
 * Secure storage interface
 */
interface SecureStorageOptions {
  namespace?: string;
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  compress?: boolean;
}

/**
 * Secure storage class
 */
export class SecureStorage {
  private namespace: string;
  private encrypt: boolean;
  private ttl: number;
  private compress: boolean;

  constructor(options: SecureStorageOptions = {}) {
    this.namespace = options.namespace || 'default';
    this.encrypt = options.encrypt ?? true;
    this.ttl = options.ttl || 0; // 0 = no expiry
    this.compress = options.compress ?? false;
  }

  /**
   * Set a value securely
   */
  set(key: string, value: any): void {
    try {
      const fullKey = `${this.namespace}:${key}`;
      let dataToStore = value;

      // Add metadata
      const metadata = {
        value: dataToStore,
        timestamp: Date.now(),
        ttl: this.ttl,
        version: '1.0'
      };

      // Convert to string
      let stringData = JSON.stringify(metadata);

      // Encrypt if enabled
      if (this.encrypt) {
        const encryptionKey = EncryptionKeyManager.getKey(this.namespace);
        stringData = SimpleCrypto.encrypt(stringData, encryptionKey);
      }

      // Store in localStorage
      localStorage.setItem(fullKey, stringData);
    } catch (error) {
      console.error('Failed to store data securely:', error);
      // Fallback to regular localStorage
      localStorage.setItem(`${this.namespace}:${key}`, JSON.stringify(value));
    }
  }

  /**
   * Get a value securely
   */
  get(key: string): any {
    try {
      const fullKey = `${this.namespace}:${key}`;
      const stored = localStorage.getItem(fullKey);

      if (!stored) return null;

      let data: any;

      // Try to decrypt if encryption was used
      if (this.encrypt) {
        try {
          const encryptionKey = EncryptionKeyManager.getKey(this.namespace);
          const decrypted = SimpleCrypto.decrypt(stored, encryptionKey);
          data = JSON.parse(decrypted);
        } catch (error) {
          // If decryption fails, try parsing as regular JSON
          data = JSON.parse(stored);
        }
      } else {
        data = JSON.parse(stored);
      }

      // Check TTL
      if (this.ttl > 0 && data.timestamp) {
        const age = Date.now() - data.timestamp;
        if (age > this.ttl) {
          this.remove(key);
          return null;
        }
      }

      return data.value !== undefined ? data.value : data;
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  }

  /**
   * Remove a value
   */
  remove(key: string): void {
    const fullKey = `${this.namespace}:${key}`;
    localStorage.removeItem(fullKey);
  }

  /**
   * Clear all data for this namespace
   */
  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`${this.namespace}:`)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Check if a key exists
   */
  has(key: string): boolean {
    const fullKey = `${this.namespace}:${key}`;
    return localStorage.getItem(fullKey) !== null;
  }

  /**
   * Get all keys for this namespace
   */
  keys(): string[] {
    const keys = Object.keys(localStorage);
    return keys
      .filter(key => key.startsWith(`${this.namespace}:`))
      .map(key => key.replace(`${this.namespace}:`, ''));
  }

  /**
   * Get storage size for this namespace
   */
  size(): number {
    return this.keys().length;
  }

  /**
   * Rotate encryption keys
   */
  rotateKeys(): void {
    EncryptionKeyManager.rotateKey(this.namespace);
  }
}

/**
 * Pre-configured secure storage instances
 */
export const secureAuthStorage = new SecureStorage({
  namespace: 'auth',
  encrypt: true,
  ttl: 24 * 60 * 60 * 1000 // 24 hours
});

export const secureUserStorage = new SecureStorage({
  namespace: 'user',
  encrypt: true,
  ttl: 7 * 24 * 60 * 60 * 1000 // 7 days
});

export const secureAppStorage = new SecureStorage({
  namespace: 'app',
  encrypt: false, // App settings don't need encryption
  ttl: 0 // No expiry
});

export const secureChatStorage = new SecureStorage({
  namespace: 'chat',
  encrypt: true,
  ttl: 60 * 60 * 1000 // 1 hour
});

/**
 * Migration utility to move existing localStorage data to secure storage
 */
export const migrateToSecureStorage = (
  oldNamespace: string,
  newSecureStorage: SecureStorage
): void => {
  const keys = Object.keys(localStorage);
  
  keys.forEach(key => {
    if (key.startsWith(oldNamespace)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsedValue = JSON.parse(value);
          const newKey = key.replace(`${oldNamespace}:`, '');
          newSecureStorage.set(newKey, parsedValue);
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.warn(`Failed to migrate key: ${key}`, error);
      }
    }
  });
};

/**
 * Clean up expired data across all secure storage instances
 */
export const cleanupExpiredData = (): void => {
  const instances = [secureAuthStorage, secureUserStorage, secureAppStorage, secureChatStorage];
  
  instances.forEach(instance => {
    const keys = instance.keys();
    keys.forEach(key => {
      // This will automatically check TTL and remove expired data
      instance.get(key);
    });
  });
};

// Export default instance
export default SecureStorage;

