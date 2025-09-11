import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Bell, 
  Crown, 
  LogOut, 
  Moon, 
  Sun, 
  Volume2, 
  VolumeX,
  Shield,
  HelpCircle,
  ExternalLink,
  Home,
  FileText,
  AlertTriangle,
  Users2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useAccountCleanup } from '@/hooks/useAccountCleanup';

import { LegalPolicyModal } from '@/components/legal/LegalPolicyModal';

interface SettingsViewProps {
  className?: string;
  onGoHome?: () => void;
}

export const SettingsView = ({ className = "", onGoHome }: SettingsViewProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { cleanupWarning, checkAccountStatus } = useAccountCleanup();
  const [settings, setSettings] = useState({
    notifications: true,
    soundEnabled: true,
    emailDigest: false
  });

  useEffect(() => {
    // Load settings from localStorage (excluding darkMode as it's handled by next-themes)
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      // Remove darkMode from saved settings if it exists
      const { darkMode, ...otherSettings } = parsed;
      setSettings({ notifications: true, soundEnabled: true, emailDigest: false, ...otherSettings });
    }
  }, []);

  const updateSetting = (key: keyof typeof settings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('app-settings', JSON.stringify(newSettings));
    
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved.",
    });
  };

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
    toast({
      title: "Theme Updated",
      description: `Switched to ${checked ? 'dark' : 'light'} mode.`,
    });
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
    } catch (error) {
      toast({
        title: "Sign Out Failed",
        description: "There was an error signing out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevokeConsent = () => {
    // Note: Legal consent functionality removed - would need to be reimplemented
    toast({
      title: "Feature Unavailable",
      description: "Legal consent management is being updated.",
      variant: "destructive",
    });
  };

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    description, 
    action, 
    badge 
  }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description: string;
    action: React.ReactNode;
    badge?: string;
  }) => (
    <div className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm">{title}</h3>
            {badge && (
              <Badge variant="secondary" className="text-xs">{badge}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <div className={`max-w-2xl mx-auto p-4 space-y-6 ${className}`}>
      {/* Home Navigation Button */}
      <div className="flex justify-start">
        <Button 
          variant="outline" 
          onClick={onGoHome || (() => {})}
          className="flex items-center gap-2 hover-scale"
        >
          <Home className="w-4 h-4" />
          Home
        </Button>
      </div>

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your app preferences and account</p>
      </div>

      {/* Account Cleanup Warning */}
      {cleanupWarning?.isAtRisk && (
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-lg text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Account Deletion Warning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-sm">
                {cleanupWarning.willBeDeleted 
                  ? "Your account is scheduled for deletion due to incomplete setup!"
                  : `Your account will be automatically deleted in ${cleanupWarning.daysLeft} day${cleanupWarning.daysLeft !== 1 ? 's' : ''} if you don't complete your profile.`
                }
              </p>
              <Button 
                onClick={() => window.location.href = '/'} 
                className="w-full"
                variant={cleanupWarning.willBeDeleted ? "destructive" : "default"}
              >
                Complete Profile Setup Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Account Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <SettingItem
            icon={Crown}
            title="Upgrade to Premium"
            description="Unlock exclusive features and 2x karma points"
            badge="Popular"
            action={
              <Button size="sm" className="hover-scale">
                <Crown className="h-4 w-4 mr-2" />
                Upgrade
              </Button>
            }
          />
          
          <Separator />
          
          <SettingItem
            icon={LogOut}
            title="Sign Out"
            description="Sign out of your account"
            action={
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSignOut}
                className="hover-scale"
              >
                Sign Out
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <SettingItem
            icon={theme === 'dark' ? Moon : Sun}
            title="Dark Mode"
            description="Switch between light and dark theme"
            action={
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={handleThemeToggle}
              />
            }
          />
          
          <Separator />
          
          <SettingItem
            icon={Bell}
            title="Push Notifications"
            description="Receive notifications for new messages"
            action={
              <Switch
                checked={settings.notifications}
                onCheckedChange={(checked) => updateSetting('notifications', checked)}
              />
            }
          />
          
          <Separator />
          
          <SettingItem
            icon={settings.soundEnabled ? Volume2 : VolumeX}
            title="Sound Effects"
            description="Play sounds for messages and notifications"
            action={
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            }
          />
          
          <Separator />
          
          <SettingItem
            icon={Bell}
            title="Email Digest"
            description="Receive daily email summary of activity"
            action={
              <Switch
                checked={settings.emailDigest}
                onCheckedChange={(checked) => updateSetting('emailDigest', checked)}
              />
            }
          />
        </CardContent>
      </Card>

      {/* Legal & Policies Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Legal & Policies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <SettingItem
            icon={FileText}
            title="Terms of Service"
            description="Review our Terms of Service"
            action={
              <LegalPolicyModal
                policyType="terms"
                trigger={
                  <Button variant="ghost" size="sm" className="hover-scale">
                    <FileText className="w-4 h-4" />
                  </Button>
                }
              />
            }
          />
          
          <Separator />
          
          <SettingItem
            icon={Shield}
            title="Privacy Policy"
            description="Learn how we protect your data"
            action={
              <LegalPolicyModal
                policyType="privacy"
                trigger={
                  <Button variant="ghost" size="sm" className="hover-scale">
                    <Shield className="w-4 h-4" />
                  </Button>
                }
              />
            }
          />
          
          <Separator />
          
          <SettingItem
            icon={Shield}
            title="Community Guidelines"
            description="Read our community standards"
            action={
              <LegalPolicyModal
                policyType="community"
                trigger={
                  <Button variant="ghost" size="sm" className="hover-scale">
                    <Users2 className="w-4 h-4" />
                  </Button>
                }
              />
            }
          />
          
          <Separator />
          
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Legal Consent Status</h3>
                  <p className="text-xs text-muted-foreground">
                    Legal consent system is being updated
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRevokeConsent}
                className="text-xs"
                disabled
              >
                Update Legal Settings
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Support Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Support & Info</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <SettingItem
            icon={HelpCircle}
            title="Help & Support"
            description="Get help with using the app"
            action={
              <Button variant="ghost" size="sm" className="hover-scale">
                <ExternalLink className="h-4 w-4" />
              </Button>
            }
          />
        </CardContent>
      </Card>

      {/* Version Info */}
      <div className="text-center text-xs text-muted-foreground">
        SyncChat v1.0.0 • Connect • Chat • Discover
      </div>
    </div>
  );
};