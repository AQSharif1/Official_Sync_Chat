import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, User, Settings, Crown, Home } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useEngagement } from '@/hooks/useEngagement';
import { useToast } from '@/hooks/use-toast';
interface NavigationBarProps {
  activeTab: 'home' | 'chat';
  onTabChange: (tab: 'home' | 'chat') => void;
  className?: string;
  isMobile?: boolean;
}
export const NavigationBar = ({
  activeTab,
  onTabChange,
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
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange(tab);
  };
  const navItems = [{
    id: 'home' as const,
    label: 'Home',
    icon: Home,
    description: 'Home dashboard'
  }, {
    id: 'chat' as const,
    label: 'Chat',
    icon: MessageCircle,
    description: 'Active group chat'
  }];
  const NavButton = ({
    item
  }: {
    item: typeof navItems[0];
  }) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;
    return <Button variant={isActive ? "default" : "ghost"} size={isMobile ? "lg" : "sm"} onClick={() => handleTabChange(item.id)} className={`
          nav-item interactive-scale
          ${isMobile ? 'flex-col h-auto py-3 px-4' : 'flex-row h-10'}
          ${isActive ? 'bg-primary text-primary-foreground shadow-elegant' : 'hover:bg-muted/50'}
        `}>
        <div className="relative">
          <Icon className={`h-5 w-5 ${isMobile && isActive ? 'animate-scale-in' : ''}`} />
        </div>
        
        {isMobile ? <span className={`text-xs font-medium ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            {item.label}
          </span> : <span className="hidden md:inline text-sm font-medium">
            {item.label}
          </span>}
      </Button>;
  };
  if (isMobile) {
    // Mobile bottom navigation with Home/Exit buttons
    return (
      <nav className={`
        fixed bottom-0 left-0 right-0 z-50
        glass-card border-t border-border smooth-transition
        ${className}
      `}>
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex justify-around items-center">
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
          </div>
        </div>
      </nav>
    );
  }

  // Top navigation for tablet/desktop
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

          {/* Center - Navigation Items */}
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavButton key={item.id} item={item} />
            ))}
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