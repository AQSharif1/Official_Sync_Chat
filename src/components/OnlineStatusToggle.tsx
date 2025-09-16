import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Wifi, WifiOff, Circle } from 'lucide-react';
import { useOptimizedOnlineStatus } from '@/hooks/useOptimizedOnlineStatus';
import { useAuth } from '@/hooks/useAuth';

interface OnlineStatusToggleProps {
  groupId: string;
  className?: string;
}

export const OnlineStatusToggle = ({ groupId, className = '' }: OnlineStatusToggleProps) => {
  const { user } = useAuth();
  const { isOnline, setOnline, setOffline } = useOptimizedOnlineStatus(groupId);
  const [isChanging, setIsChanging] = useState(false);

  // Don't render if user is not logged in
  if (!user?.id) {
    return null;
  }

  const handleToggleStatus = async () => {
    setIsChanging(true);
    try {
      if (isOnline) {
        await setOffline();
      } else {
        await setOnline();
      }
    } catch (error) {
      console.error('Error changing online status:', error);
    } finally {
      setIsChanging(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={`flex items-center gap-2 ${className}`}
          disabled={isChanging}
        >
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-500" />
          ) : (
            <WifiOff className="h-4 w-4 text-gray-500" />
          )}
          <Badge 
            variant={isOnline ? "default" : "secondary"}
            className="text-xs"
          >
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem 
          onClick={handleToggleStatus}
          disabled={isChanging}
          className="flex items-center gap-2"
        >
          {isOnline ? (
            <>
              <WifiOff className="h-4 w-4" />
              Go Offline
            </>
          ) : (
            <>
              <Wifi className="h-4 w-4" />
              Go Online
            </>
          )}
        </DropdownMenuItem>
        <div className="px-2 py-1 text-xs text-muted-foreground">
          {isOnline 
            ? 'You appear online to other users' 
            : 'You appear offline to other users'
          }
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
