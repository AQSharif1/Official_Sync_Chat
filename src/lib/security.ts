/**
 * Security utilities for preventing XSS and other security vulnerabilities
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - The HTML string to sanitize
 * @returns Sanitized HTML string
 */
export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous HTML tags and attributes
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '')
    .replace(/<input\b[^<]*>/gi, '')
    .replace(/<textarea\b[^<]*(?:(?!<\/textarea>)<[^<]*)*<\/textarea>/gi, '')
    .replace(/<select\b[^<]*(?:(?!<\/select>)<[^<]*)*<\/select>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/vbscript:/gi, '');
};

/**
 * Sanitizes CSS content to prevent CSS injection attacks
 * @param css - The CSS string to sanitize
 * @returns Sanitized CSS string
 */
export const sanitizeCss = (css: string): string => {
  if (typeof css !== 'string') {
    return '';
  }
  
  // Remove potentially dangerous CSS expressions and imports
  return css
    .replace(/expression\s*\(/gi, '')
    .replace(/url\s*\(\s*['"]?\s*javascript:/gi, '')
    .replace(/@import\s+url\s*\(\s*['"]?\s*javascript:/gi, '')
    .replace(/behavior\s*:/gi, '')
    .replace(/binding\s*:/gi, '');
};

/**
 * Sanitizes user input for safe display
 * @param input - The user input to sanitize
 * @returns Sanitized string safe for display
 */
export const sanitizeUserInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Convert to string and escape HTML entities
  return input
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validates and sanitizes chat messages
 * @param message - The message to validate
 * @returns Object with validation result and sanitized message
 */
export const validateChatMessage = (message: string): {
  isValid: boolean;
  sanitizedMessage: string;
  error?: string;
} => {
  if (typeof message !== 'string') {
    return {
      isValid: false,
      sanitizedMessage: '',
      error: 'Message must be a string'
    };
  }
  
  const trimmedMessage = message.trim();
  
  if (trimmedMessage.length === 0) {
    return {
      isValid: false,
      sanitizedMessage: '',
      error: 'Message cannot be empty'
    };
  }
  
  if (trimmedMessage.length > 1000) {
    return {
      isValid: false,
      sanitizedMessage: '',
      error: 'Message too long (max 1000 characters)'
    };
  }
  
  // Check for potentially dangerous content
  const dangerousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /data:text\/html/i,
    /vbscript:/i,
    /on\w+\s*=/i,
    /expression\s*\(/i
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(trimmedMessage)) {
      return {
        isValid: false,
        sanitizedMessage: '',
        error: 'Message contains potentially dangerous content'
      };
    }
  }
  
  // Sanitize the message
  const sanitizedMessage = sanitizeUserInput(trimmedMessage);
  
  return {
    isValid: true,
    sanitizedMessage
  };
};

/**
 * Creates safe CSS variables for chart themes
 * @param id - Chart identifier
 * @param colorConfig - Color configuration object
 * @returns Safe CSS string
 */
export const createSafeChartStyles = (
  id: string,
  colorConfig: Array<[string, any]>
): string => {
  // Ensure id is safe (alphanumeric and hyphens only)
  const safeId = id.replace(/[^a-zA-Z0-9-]/g, '');
  
  // Filter out null/undefined color configs
  const validColorConfig = colorConfig.filter(([_, config]) => 
    config && (config.theme || config.color)
  );
  
  if (validColorConfig.length === 0) {
    return '';
  }
  
  // Create safe CSS with only allowed properties
  const cssLines = validColorConfig
    .map(([key, itemConfig]) => {
      const color = itemConfig.theme || itemConfig.color;
      if (color && typeof color === 'string') {
        // Validate color format (hex, rgb, rgba, named colors)
        const isValidColor = /^(#[0-9A-F]{3,6}|rgb\(|rgba\(|transparent|inherit|initial|unset|[a-z]+)$/i.test(color);
        if (isValidColor) {
          return `  --color-${key}: ${color};`;
        }
      }
      return null;
    })
    .filter(Boolean);
  
  if (cssLines.length === 0) {
    return '';
  }
  
  return `[data-chart="${safeId}"] {\n${cssLines.join('\n')}\n}`;
};
