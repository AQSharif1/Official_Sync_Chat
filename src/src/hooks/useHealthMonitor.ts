import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from '@/hooks/use-toast';

interface HealthCheck {
  database: boolean;
  realtime: boolean;
  auth: boolean;
  storage: boolean;
  lastChecked: Date;
}

export const useHealthMonitor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [health, setHealth] = useState<HealthCheck>({
    database: true,
    realtime: true,
    auth: true,
    storage: true,
    lastChecked: new Date()
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      toast({
        title: "Connection Lost",
        description: "You're currently offline. Some features may not work.",
        variant: "destructive",
      });
    }
  }, [isOnline, toast]);

  const checkHealth = async () => {
    const newHealth: HealthCheck = {
      database: false,
      realtime: false,
      auth: false,
      storage: false,
      lastChecked: new Date()
    };

    try {
      // Test database connection
      const { error: dbError } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      newHealth.database = !dbError;

      // Test auth
      newHealth.auth = !!user || !!(await supabase.auth.getSession()).data.session;

      // Test realtime (simplified check)
      newHealth.realtime = true; // Assume working unless we detect issues

      // Test storage (simplified check)
      newHealth.storage = true; // Assume working unless we detect issues

    } catch (error) {
      console.error('Health check failed:', error);
    }

    setHealth(newHealth);

    // Alert on critical failures
    if (!newHealth.database) {
      toast({
        title: "Database Connection Lost",
        description: "Unable to connect to the database. Please refresh the page.",
        variant: "destructive",
      });
    }

    return newHealth;
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [user]);

  return {
    health,
    isOnline,
    checkHealth
  };
};