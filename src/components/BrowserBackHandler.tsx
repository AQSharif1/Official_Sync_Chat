import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const BrowserBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleBrowserBack = (event: PopStateEvent) => {
      const currentPath = location.pathname;
      const appRoutes = ['/', '/home', '/chat', '/profile', '/settings', '/success', '/auth/callback', '/email-verification'];
      
      // Check if we're at the root of the app
      const isAtAppRoot = currentPath === '/' || currentPath === '/home';
      
      // Always prevent leaving the app if we're at the root
      if (isAtAppRoot) {
        event.preventDefault();
        // Stay on current page
        navigate(currentPath, { replace: true });
        return;
      }

      // For other routes, check if we have valid app history
      const historyLength = window.history.length;
      
      // If we have very little history (likely came from external site), prevent leaving
      if (historyLength <= 2) {
        event.preventDefault();
        navigate('/home', { replace: true });
        return;
      }

      // Allow normal back navigation within the app
      // The browser will handle the actual navigation
    };

    // Add the popstate event listener
    window.addEventListener('popstate', handleBrowserBack);

    // Cleanup
    return () => {
      window.removeEventListener('popstate', handleBrowserBack);
    };
  }, [location.pathname, navigate]);

  return null; // This component doesn't render anything
};
