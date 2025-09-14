import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthFlow } from '@/hooks/useAuthFlow';
import { useIsMobile, useDeviceType } from '@/hooks/use-mobile';
import { useAppData } from '@/hooks/useAppData';

import { supabase } from '@/integrations/supabase/client';
import { NavigationBar } from '@/components/navigation/NavigationBar';
import { ProfilePage } from '@/components/profile/ProfilePage';
import { SettingsView } from '@/components/navigation/SettingsView';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { HomePage } from '@/components/home/HomePage';
import { WelcomingLanding } from '@/components/landing/WelcomingLanding';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { GroupChat } from '@/components/chat/GroupChat';

const Index = () => {
  const { user } = useAuth();
  const { authState } = useAuthFlow();
  const { userProfile, currentGroup, isLoading: dataLoading, setCurrentGroup } = useAppData();
  const location = useLocation();
  const navigate = useNavigate();

  const isMobile = useIsMobile();
  const deviceType = useDeviceType();
  
  // Simple back button handler with error handling
  const handleBack = () => {
    try {
      // Always go to home from any page
      navigate('/home');
    } catch (error) {
      console.error('Error in back navigation:', error);
      // Fallback to home
      navigate('/home');
    }
  };
  
  // Get current tab from URL path
  const getCurrentTab = (): 'home' | 'profile' | 'settings' | 'chat' => {
    const path = location.pathname;
    if (path === '/profile') return 'profile';
    if (path === '/settings') return 'settings';
    if (path === '/chat') return 'chat';
    return 'home'; // Default to home for '/' and '/home'
  };
  
  const [activeTab, setActiveTab] = useState<'home' | 'profile' | 'settings' | 'chat'>(getCurrentTab());

  // Sync activeTab with URL changes (for browser back/forward)
  useEffect(() => {
    const newTab = getCurrentTab();
    setActiveTab(newTab);
  }, [location.pathname]);

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
    navigate('/chat');
  };

  const handleBackToMatching = () => {
    // Don't clear currentGroup - keep it for easy return to chat
    navigate('/home');
  };


  const handleProfileNavigation = () => {
    navigate('/profile');
  };

  const handleSettingsNavigation = () => {
    navigate('/settings');
  };

  // Ensure group data is loaded when navigating to chat
  const handleChatNavigation = async () => {
    if (!currentGroup && user) {
      // Try to load the user's current group
      try {
        const { data: groupMembership } = await supabase
          .from('group_members')
          .select(`
            group_id,
            groups!inner(
              id,
              name,
              vibe_label,
              current_members,
              max_members,
              lifecycle_stage,
              created_at
            )
          `)
          .eq('user_id', user.id)
          .eq('groups.lifecycle_stage', 'active')
          .order('joined_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (groupMembership) {
          const groupData = groupMembership.groups as any;
          setCurrentGroup({
            id: groupData.id,
            name: groupData.name,
            vibe_label: groupData.vibe_label,
            current_members: groupData.current_members,
            max_members: groupData.max_members,
            lifecycle_stage: groupData.lifecycle_stage,
            created_at: groupData.created_at
          });
        }
      } catch (error) {
        console.error('Error loading group data:', error);
      }
    }
    navigate('/chat');
  };

  // Authentication check
  if (!user) {
    return <WelcomingLanding />;
  }

  // Show email verification prompt (non-blocking)
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
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              I've Verified My Email
            </button>
            <button 
              onClick={() => {
                // Allow user to continue with limited access
                window.location.href = '/';
              }}
              className="w-full px-4 py-2 border border-input bg-background rounded-md hover:bg-accent"
            >
              Continue Anyway
            </button>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-full px-4 py-2 text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show spinner if we're still checking auth status
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <LoadingSpinner size="lg" text="Checking your account..." />
        </div>
      </div>
    );
  }

  // Show spinner if we're still trying to get the profile
  if (user && !userProfile && dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-6 max-w-md mx-auto">
          <LoadingSpinner size="lg" text="Loading your profile..." />
        </div>
      </div>
    );
  }

  // New users or users without profiles need onboarding
  if (authState.shouldShowOnboarding) {
    return <OnboardingFlow onComplete={handleCompleteOnboarding} />;
  }

  const renderMainContent = () => {

    // Profile view
    if (activeTab === 'profile') {
      return (
        <div className="animate-fade-in">
          <ProfilePage onGoHome={() => navigate('/home')} />
        </div>
      );
    }

    // Settings view
    if (activeTab === 'settings') {
      return (
        <div className="animate-fade-in">
          <SettingsView onGoHome={() => navigate('/home')} />
        </div>
      );
    }

    // Chat view
    if (activeTab === 'chat') {
      if (!currentGroup) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center space-y-6 max-w-md mx-auto">
              <div className="text-6xl mb-4">💬</div>
              <h1 className="text-2xl font-bold text-foreground">No Active Group</h1>
              <p className="text-muted-foreground">
                You need to join a group before accessing the chat.
              </p>
              <button 
                onClick={() => navigate('/home')}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
              >
                Go to Home
              </button>
            </div>
          </div>
        );
      }

      return (
        <div className="animate-fade-in">
          <GroupChat 
            groupId={currentGroup.id}
            groupName={currentGroup.name}
            groupVibe={currentGroup.vibe || 'Friendly'}
            memberCount={currentGroup.member_count || 0}
            onBack={handleBack}
            onGoHome={() => navigate('/home')}
          />
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
              // No existing group, try to load current group and go to chat
              handleChatNavigation();
            }
          }}
          onViewProfile={handleProfileNavigation}
          onViewSettings={handleSettingsNavigation}
        />
      </div>
    );
  };

  return (
    <div className={`min-h-screen bg-background ${deviceType === 'mobile' ? 'mobile-optimized' : deviceType === 'desktop' ? 'laptop-optimized' : ''}`}>
      {/* Navigation */}
      <NavigationBar 
        isMobile={isMobile}
      />
      
                     {/* Main Content */}
               <div className="pt-14">
        {renderMainContent()}
      </div>
    </div>
  );
};

export default Index;