import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { useHealthMonitor } from '@/hooks/useHealthMonitor';
import { usePerformanceMonitor } from '@/hooks/usePerformanceMonitor';

export const SystemStatusIndicator = () => {
  const { health, isOnline } = useHealthMonitor();
  const { metrics } = usePerformanceMonitor();

  const getStatusColor = (isHealthy: boolean) => {
    return isHealthy ? 'text-green-500' : 'text-red-500';
  };

  const getStatusIcon = (isHealthy: boolean) => {
    return isHealthy ? CheckCircle : XCircle;
  };

  if (!isOnline) {
    return (
      <Alert className="mb-4 border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          You're currently offline. Some features may not work properly.
        </AlertDescription>
      </Alert>
    );
  }

  const criticalIssues = [
    !health.database && 'Database',
    !health.auth && 'Authentication',
  ].filter(Boolean);

  if (criticalIssues.length > 0) {
    return (
      <Alert className="mb-4 border-destructive/50 bg-destructive/10">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Service issues detected: {criticalIssues.join(', ')}. Please refresh the page.
        </AlertDescription>
      </Alert>
    );
  }

  return null;
};

export const PerformanceIndicator = () => {
  const { metrics } = usePerformanceMonitor();

  if (!metrics || metrics.renderTime < 1000) return null;

  return (
    <Card className="mb-4 border-warning/50 bg-warning/10">
      <CardContent className="flex items-center gap-2 pt-6">
        <Activity className="h-4 w-4 text-warning" />
        <p className="text-sm">
          Performance may be impacted. Render time: {Math.round(metrics.renderTime)}ms
        </p>
      </CardContent>
    </Card>
  );
};