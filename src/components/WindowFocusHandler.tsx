import { useEffect, useRef } from 'react';

interface WindowFocusHandlerProps {
  onWindowFocus?: () => void;
  onWindowBlur?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export const WindowFocusHandler = ({ 
  onWindowFocus, 
  onWindowBlur, 
  onVisibilityChange 
}: WindowFocusHandlerProps) => {
  const isVisibleRef = useRef(true);
  const isFocusedRef = useRef(true);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      const wasVisible = isVisibleRef.current;
      
      isVisibleRef.current = isVisible;
      
      if (isVisible !== wasVisible) {
        console.log(`👁️ Window visibility changed: ${isVisible ? 'visible' : 'hidden'}`);
        onVisibilityChange?.(isVisible);
      }
    };

    const handleFocus = () => {
      const wasFocused = isFocusedRef.current;
      isFocusedRef.current = true;
      
      if (!wasFocused) {
        console.log('🎯 Window focused');
        onWindowFocus?.();
      }
    };

    const handleBlur = () => {
      const wasFocused = isFocusedRef.current;
      isFocusedRef.current = false;
      
      if (wasFocused) {
        console.log('😴 Window blurred');
        onWindowBlur?.();
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    // Initial state
    isVisibleRef.current = !document.hidden;
    isFocusedRef.current = document.hasFocus();

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [onWindowFocus, onWindowBlur, onVisibilityChange]);

  return null; // This component doesn't render anything
};
