import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface BrowserBackButtonOptions {
  onBack?: () => void;
  preventDefault?: boolean;
  fallbackRoute?: string;
}

export const useBrowserBackButton = (options: BrowserBackButtonOptions = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { onBack, preventDefault = true, fallbackRoute = '/home' } = options;

  const handleBrowserBack = useCallback((event: PopStateEvent) => {
    const currentPath = location.pathname;
    const appRoutes = ['/', '/home', '/chat', '/profile', '/settings', '/success', '/auth/callback', '/email-verification'];
    
    // Check if we're at the root of the app
    const isAtAppRoot = currentPath === '/' || currentPath === '/home';
    
    // Always prevent leaving the app if we're at the root
    if (isAtAppRoot) {
      event.preventDefault();
      
      if (onBack) {
        onBack();
      } else {
        // Default behavior: stay on current page
        navigate(fallbackRoute, { replace: true });
      }
      return;
    }

    // For other routes, check if we have valid app history
    const historyLength = window.history.length;
    
    // If we have very little history (likely came from external site), prevent leaving
    if (historyLength <= 2) {
      event.preventDefault();
      navigate(fallbackRoute, { replace: true });
      return;
    }

    // Allow normal back navigation within the app
    // The browser will handle the actual navigation
  }, [location.pathname, navigate, onBack, fallbackRoute]);

  useEffect(() => {
    // Add the popstate event listener
    window.addEventListener('popstate', handleBrowserBack);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleBrowserBack);
    };
  }, [handleBrowserBack]);

  // Return a function to programmatically handle back navigation
  const handleBack = useCallback(() => {
    const currentPath = location.pathname;
    
    // Define navigation hierarchy
    const navigationMap: Record<string, string> = {
      '/chat': '/home',
      '/profile': '/home',
      '/settings': '/home',
      '/home': '/home', // Stay on home
      '/': '/home'
    };

    const targetRoute = navigationMap[currentPath] || fallbackRoute;
    navigate(targetRoute);
  }, [location.pathname, navigate, fallbackRoute]);

  return { handleBack };
};
