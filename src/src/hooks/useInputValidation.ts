import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

interface InputValidationResult {
  isValid: boolean;
  error?: string;
}

interface RateLimitConfig {
  maxMessagesPerMinute: number;
  maxMessagesPerHour: number;
  cooldownPeriod: number; // in milliseconds
}

const RATE_LIMIT_CONFIG: RateLimitConfig = {
  maxMessagesPerMinute: 20,
  maxMessagesPerHour: 200,
  cooldownPeriod: 5000, // 5 seconds
};

export const useInputValidation = () => {
  const { user } = useAuth();
  const [lastMessageTime, setLastMessageTime] = useState<number>(0);
  const [messageCount, setMessageCount] = useState<{ minute: number; hour: number }>({ minute: 0, hour: 0 });

  // Reset counters periodically
  useEffect(() => {
    const minuteInterval = setInterval(() => {
      setMessageCount(prev => ({ ...prev, minute: 0 }));
    }, 60000);

    const hourInterval = setInterval(() => {
      setMessageCount(prev => ({ ...prev, hour: 0 }));
    }, 3600000);

    return () => {
      clearInterval(minuteInterval);
      clearInterval(hourInterval);
    };
  }, []);

  const validateMessageContent = (content: string): InputValidationResult => {
    // Sanitize first
    const sanitized = sanitizeInput(content);
    const trimmed = sanitized.trim();
    
    // Check for empty content
    if (!trimmed) {
      return { isValid: false, error: 'Message cannot be empty' };
    }
    
    // Check for excessive length
    if (trimmed.length > 2000) {
      return { isValid: false, error: 'Message is too long (max 2000 characters)' };
    }
    
    // Enhanced SQL injection detection
    const sqlPatterns = [
      /(\bunion\b|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\bcreate\b|\balter\b|\bexec\b|\bexecute\b).*(\bfrom\b|\binto\b|\bset\b|\btable\b|\bdatabase\b)/gi,
      /(\-\-|\#|\/\*|\*\/|\;)/g,
      /(\bor\b|\band\b)\s*\d+\s*=\s*\d+/gi,
      /(\bxp_|\bsp_|\b@@)/gi,
      /(\bwaitfor\b|\bdelay\b)/gi
    ];
    
    for (const pattern of sqlPatterns) {
      if (pattern.test(trimmed)) {
        console.warn('Potential SQL injection attempt detected:', trimmed);
        return { isValid: false, error: 'Message contains suspicious content' };
      }
    }
    
    // Enhanced XSS detection
    const xssPatterns = [
      /<.*>/g,
      /javascript:/gi,
      /vbscript:/gi,
      /on\w+\s*=/gi,
      /data:text\/html/gi,
      /data:application\/javascript/gi,
      /expression\s*\(/gi,
      /url\s*\(/gi,
      /import\s*\(/gi,
      /eval\s*\(/gi,
      /document\./gi,
      /window\./gi,
      /alert\s*\(/gi,
      /confirm\s*\(/gi,
      /prompt\s*\(/gi,
      /<iframe/gi,
      /<script/gi,
      /<object/gi,
      /<embed/gi,
      /<link/gi,
      /<style/gi
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(trimmed)) {
        console.warn('Potential XSS attempt detected:', trimmed);
        return { isValid: false, error: 'Message contains invalid content' };
      }
    }
    
    // Enhanced profanity and spam detection
    const profanityPatterns = [
      /\b(spam|scam|phishing|malware|virus)\b/i,
      /\b(fuck|shit|damn|bitch|asshole|pussy|dick|cock)\b/i,
      /(buy\s+now|click\s+here|free\s+money|make\s+money\s+fast)/gi,
      /(http[s]?:\/\/[^\s]+){3,}/g, // Multiple URLs
      /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}){2,}/g, // Multiple emails
    ];
    
    for (const pattern of profanityPatterns) {
      if (pattern.test(trimmed)) {
        return { isValid: false, error: 'Message contains inappropriate content' };
      }
    }
    
    // Check for repetitive characters (spam detection)
    const repetitivePattern = /(.)\1{10,}/g;
    if (repetitivePattern.test(trimmed)) {
      return { isValid: false, error: 'Message contains too many repetitive characters' };
    }
    
    return { isValid: true };
  };

  const checkRateLimit = async (): Promise<boolean> => {
    if (!user) return false;
    
    const now = Date.now();
    
    // Check cooldown period
    if (now - lastMessageTime < RATE_LIMIT_CONFIG.cooldownPeriod) {
      toast({
        title: "Please wait",
        description: "You're sending messages too quickly. Please slow down.",
        variant: "destructive",
      });
      return false;
    }
    
    // Check local rate limits
    if (messageCount.minute >= RATE_LIMIT_CONFIG.maxMessagesPerMinute) {
      toast({
        title: "Rate Limit Exceeded",
        description: "You've sent too many messages this minute. Please wait.",
        variant: "destructive",
      });
      return false;
    }
    
    if (messageCount.hour >= RATE_LIMIT_CONFIG.maxMessagesPerHour) {
      toast({
        title: "Rate Limit Exceeded",
        description: "You've sent too many messages this hour. Please wait.",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      // Server-side rate limit check
      const { data, error } = await supabase
        .from('chat_messages')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 60000).toISOString())
        .limit(RATE_LIMIT_CONFIG.maxMessagesPerMinute);
      
      if (error) {
        console.error('Rate limit check failed:', error);
        return true; // Allow on error to not block users
      }
      
      if (data && data.length >= RATE_LIMIT_CONFIG.maxMessagesPerMinute) {
        toast({
          title: "Rate Limit Exceeded",
          description: "You're sending messages too quickly. Please slow down.",
          variant: "destructive",
        });
        return false;
      }
      
      // Update local counters
      setMessageCount(prev => ({
        minute: prev.minute + 1,
        hour: prev.hour + 1
      }));
      setLastMessageTime(now);
      
      return true;
    } catch (error) {
      console.error('Rate limit check error:', error);
      return true; // Allow on error
    }
  };

  const validateUrl = (url: string): InputValidationResult => {
    try {
      const urlObj = new URL(url);
      
      // Check for suspicious domains and protocols
      const suspiciousDomains = [
        'malware.com', 'phishing.net', 'scam.org', 'virus.com',
        'bit.ly', 'tinyurl.com', 'goo.gl', 't.co' // Shorteners can be suspicious
      ];
      
      const allowedProtocols = ['http:', 'https:'];
      const domain = urlObj.hostname.toLowerCase();
      
      if (!allowedProtocols.includes(urlObj.protocol)) {
        return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
      }
      
      if (suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
        return { isValid: false, error: 'URL is not allowed' };
      }
      
      // Check for IP addresses (often suspicious)
      const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      if (ipPattern.test(domain)) {
        return { isValid: false, error: 'IP addresses are not allowed' };
      }
      
      return { isValid: true };
    } catch {
      return { isValid: false, error: 'Invalid URL format' };
    }
  };

  const sanitizeInput = (input: string): string => {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Comprehensive XSS prevention
    return input
      // Remove script tags and content
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove iframe tags
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      // Remove object tags
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      // Remove embed tags
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
      // Remove link tags
      .replace(/<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi, '')
      // Remove style tags
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      // Remove all HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove dangerous protocols
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/data:application\/javascript/gi, '')
      // Remove event handlers
      .replace(/on\w+\s*=/gi, '')
      // Remove dangerous functions
      .replace(/expression\s*\(/gi, '')
      .replace(/url\s*\(/gi, '')
      .replace(/import\s*\(/gi, '')
      .replace(/eval\s*\(/gi, '')
      // Remove global objects
      .replace(/document\./gi, '')
      .replace(/window\./gi, '')
      .replace(/global\./gi, '')
      // Remove alert functions
      .replace(/alert\s*\(/gi, '')
      .replace(/confirm\s*\(/gi, '')
      .replace(/prompt\s*\(/gi, '')
      // Remove null bytes
      .replace(/\0/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  };

  return {
    validateMessageContent,
    checkRateLimit,
    validateUrl,
    sanitizeInput
  };
};