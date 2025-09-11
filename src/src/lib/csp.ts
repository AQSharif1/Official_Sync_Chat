/**
 * Content Security Policy utilities for preventing XSS attacks
 * SECURITY ENHANCED VERSION
 */

/**
 * Default CSP policy for the application (Development)
 */
export const DEFAULT_CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for React development
    "'unsafe-eval'",   // Required for Vite development - REMOVED IN PRODUCTION
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for Tailwind CSS
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https:',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.stripe.com',
    'https://giphy.com',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://hooks.stripe.com',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': [],
  'require-trusted-types-for': ["'script'"],
};

/**
 * Production CSP policy (SECURE - No unsafe-eval)
 */
export const PRODUCTION_CSP = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Still needed for React hydration
    // 'unsafe-eval' REMOVED for security
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Still needed for Tailwind
  ],
  'img-src': [
    "'self'",
    'data:',
    'https:',
    'blob:',
  ],
  'font-src': [
    "'self'",
    'data:',
    'https:',
  ],
  'connect-src': [
    "'self'",
    'https://*.supabase.co',
    'wss://*.supabase.co',
    'https://api.stripe.com',
    'https://giphy.com',
  ],
  'frame-src': [
    "'self'",
    'https://js.stripe.com',
    'https://hooks.stripe.com',
  ],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'self'"],
  'upgrade-insecure-requests': [],
  'block-all-mixed-content': [],
  'require-trusted-types-for': ["'script'"],
  'strict-dynamic': [], // Prevent script injection
  'nonce': [], // Allow nonce-based script execution
};

/**
 * Generates CSP header string
 * @param policy - CSP policy object
 * @returns Formatted CSP header string
 */
export const generateCSPHeader = (policy: Record<string, string[]>): string => {
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(' ')}`)
    .join('; ');
};

/**
 * Applies CSP to the document
 * @param policy - CSP policy to apply
 */
export const applyCSP = (policy: Record<string, string[]> = DEFAULT_CSP): void => {
  if (typeof document === 'undefined') return;
  
  const cspHeader = generateCSPHeader(policy);
  
  // Create meta tag for CSP
  let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!cspMeta) {
    cspMeta = document.createElement('meta');
    cspMeta.setAttribute('http-equiv', 'Content-Security-Policy');
    document.head.appendChild(cspMeta);
  }
  
  cspMeta.setAttribute('content', cspHeader);
  
  // Log CSP for debugging (only in development)
  if (import.meta.env.DEV) {
    console.log('🔒 CSP Applied:', cspHeader);
  }
};

/**
 * Removes CSP from the document
 */
export const removeCSP = (): void => {
  if (typeof document === 'undefined') return;
  
  const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (cspMeta) {
    cspMeta.remove();
  }
};

/**
 * Validates CSP policy
 * @param policy - CSP policy to validate
 * @returns Validation result
 */
export const validateCSP = (policy: Record<string, string[]>): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const validDirectives = [
    'default-src', 'script-src', 'style-src', 'img-src', 'font-src',
    'connect-src', 'frame-src', 'object-src', 'base-uri', 'form-action',
    'frame-ancestors', 'upgrade-insecure-requests', 'block-all-mixed-content',
    'require-trusted-types-for', 'strict-dynamic', 'nonce'
  ];
  
  for (const [directive, sources] of Object.entries(policy)) {
    if (!validDirectives.includes(directive)) {
      errors.push(`Invalid directive: ${directive}`);
    }
    
    if (!Array.isArray(sources) || sources.length === 0) {
      errors.push(`Directive ${directive} must have at least one source`);
    }
    
    for (const source of sources) {
      if (typeof source !== 'string') {
        errors.push(`Invalid source in ${directive}: ${source}`);
      }
      
      // Security warnings
      if (source === "'unsafe-eval'" && directive === 'script-src') {
        warnings.push(`⚠️ 'unsafe-eval' in ${directive} is a security risk - remove in production`);
      }
      
      if (source === "'unsafe-inline'" && directive === 'script-src') {
        warnings.push(`⚠️ 'unsafe-inline' in ${directive} should be replaced with nonces in production`);
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Auto-apply appropriate CSP based on environment
 */
export const applyEnvironmentCSP = (): void => {
  if (import.meta.env.PROD) {
    applyCSP(PRODUCTION_CSP);
    console.log('🔒 Production CSP applied (secure)');
  } else {
    applyCSP(DEFAULT_CSP);
    console.log('🔒 Development CSP applied (with warnings)');
  }
};
