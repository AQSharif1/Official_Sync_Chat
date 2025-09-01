import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAppData } from '@/hooks/useAppData';

import { supabase } from '@/integrations/supabase/client';
import { NavigationBar } from '@/components/navigation/NavigationBar';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { SettingsView } from '@/components/navigation/SettingsView';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { GroupMatchingFlow } from '@/components/group/GroupMatchingFlow';
import { HomePage } from '@/components/home/HomePage';
import { GroupChat } from '@/components/chat/GroupChat';
import { AuthPage } from '@/components/auth/AuthPage';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Button } from '@/components/ui/button';

const Index = () => {
  const { user } = useAuth();
  const { authState } = useAuthFlow();
  const { userProfile, currentGroup, isLoading: dataLoading, setCurrentGroup, error: dataError, hasTimedOut } = useAppData();

  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<'home' | 'chat' | 'profile' | 'settings'>('home');

  const handleCompleteOnboarding = async () => {
    try {
      // Force refresh app data to load the new profile and group
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try to reload the page to get fresh state
      window.location.reload();
    } catch (error) {
      // Silent error handling for production
    }
  };

  const handleGroupMatched = async (groupId: string, groupData?: any) => {
    if (groupData) {
      setCurrentGroup(groupData);
    } else {
      // Fetch and set group data
      try {
        const { data } = await supabase
          .from('groups')
          .select('*')
          .eq('id', groupId)
          .maybeSingle();
        
        if (data) {
          setCurrentGroup(data);
        }
      } catch (error) {
        // Silent error handling for production
      }
    }
    setActiveTab('chat');
  };

  const handleBackToMatching = () => {
    setCurrentGroup(null);
    setActiveTab('home');
  };

  const handleTabChange = (tab: 'home' | 'chat') => {
    // Tab switched
    setActiveTab(tab);
  };

  const handleProfileNavigation = () => {
    setActiveTab('profile');
  };

  const handleSettingsNavigation = () => {
    setActiveTab('settings');
  };

  // Authentication check
  if (!user) {
    return <AuthPage />;
  }

  // ✅ Show email verification prompt (non-blocking)
  if (!user.email_confirmed_at) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-2xl font-bold text-foreground">Verify Your Email</h1>
          <p className="text-muted-foreground">
            Please check your email and click the verification link to access all features. 
            You can still use the app, but some features may be limited.
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              I've Verified My Email
            </Button>
            <Button 
              variant="outline"
              onClick={() => {
                // Allow user to continue with limited access
                window.location.href = '/';
              }}
              className="w-full"
            >
              Continue Anyway
            </Button>
            <Button 
              variant="ghost"
              onClick={() => supabase.auth.signOut()}
              className="w-full text-muted-foreground"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Show spinner if we're still checking auth status with escape route
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <LoadingSpinner size="lg" text="Checking your account..." />
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Refresh Page
            </Button>
            <Button 
              variant="outline"
              onClick={() => supabase.auth.signOut()}
              className="w-full"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Show spinner if we're still trying to get the profile
  if (user && !userProfile && dataLoading) {
    return <LoadingSpinner size="lg" text="Loading your profile..." />
  }

  // ✅ Show error UI if profile fetch failed or took too long
  if ((user && !userProfile) && (hasTimedOut || dataError)) {
    try {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <div className="text-center space-y-6 max-w-md mx-auto">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-foreground">Something went wrong</h1>
            <p className="text-muted-foreground">
              We couldn't load your profile. Please check your connection or try again.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    } catch (renderError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen px-4 text-center text-sm text-gray-600">
          <p>⚠️ Unexpected error occurred while rendering the error screen.</p>
          <p className="mt-2">Please reload the page or try again later.</p>
          <button
            className="mt-4 px-4 py-2 bg-black text-white rounded"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
  }

  // New users or users without profiles need onboarding
  if (authState.shouldShowOnboarding) {
    return <OnboardingFlow onComplete={handleCompleteOnboarding} />;
  }

  const renderMainContent = () => {
    // Chat view - either matching or active chat
    if (activeTab === 'chat') {
      if (currentGroup) {
        return (
          <div className="animate-fade-in">
            <GroupChat
              groupId={currentGroup.id}
              groupName={currentGroup.name}
              groupVibe={currentGroup.vibe_label}
              memberCount={currentGroup.current_members}
              onBack={handleBackToMatching}
              onGoHome={() => setActiveTab('home')}
            />
          </div>
        );
      } else {
        // Only render GroupMatchingFlow if userProfile is loaded
        if (!userProfile) {
          return (
            <div className="min-h-screen flex items-center justify-center">
              <LoadingSpinner size="md" text="Loading your profile..." />
            </div>
          );
        }

        return (
          <div className="animate-fade-in">
            <GroupMatchingFlow onGroupMatched={handleGroupMatched} userProfile={userProfile} />
          </div>
        );
      }
    }

    // Profile view
    if (activeTab === 'profile') {
      return (
        <div className="animate-fade-in">
          <ProfilePage onGoHome={() => setActiveTab('home')} />
        </div>
      );
    }

    // Settings view
    if (activeTab === 'settings') {
      return (
        <div className="animate-fade-in">
          <SettingsView onGoHome={() => setActiveTab('home')} />
        </div>
      );
    }
    
    // Default to home content
    return (
      <div className="animate-fade-in">
        <HomePage 
          onStartMatching={(groupId, groupData) => {
            if (groupId && groupData) {
              // User has existing group, go directly to chat
              handleGroupMatched(groupId, groupData);
            } else {
              // No existing group, start matching
              setActiveTab('chat');
            }
          }}
          onViewProfile={handleProfileNavigation}
          onViewSettings={handleSettingsNavigation}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <NavigationBar 
        activeTab={activeTab === 'profile' || activeTab === 'settings' ? 'home' : activeTab}
        onTabChange={handleTabChange}
        isMobile={isMobile}
      />
      
      {/* Main Content */}
      <div className={isMobile ? "pb-20" : "pt-14"}>
        {renderMainContent()}
      </div>
    </div>
  );
};

export default Index;