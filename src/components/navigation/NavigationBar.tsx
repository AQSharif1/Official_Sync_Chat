import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Settings, Crown } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
interface NavigationBarProps {
  className?: string;
  isMobile?: boolean;
}
export const NavigationBar = ({
  className = "",
  isMobile = false
}: NavigationBarProps) => {
  const {
    user
  } = useAuth();
  const {
    achievements
  } = useEngagement();
  const {
    toast
  } = useToast();
  if (isMobile) {
    // Mobile - no navigation bar needed
    return null;
  }

  // Top navigation for laptop/desktop - similar to mobile but horizontal
  return (
    <nav className={`
      fixed top-0 left-0 right-0 z-50
      glass-card border-b border-border smooth-transition
      ${className}
    `}>
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Logo/Brand */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">SyncChat</span>
            </div>
          </div>


          {/* Right side - User info and actions */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {user.email?.split('@')[0]}
                </div>
                {achievements && achievements.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {achievements.length} achievements
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};