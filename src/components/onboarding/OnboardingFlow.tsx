import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Moon, Sun, ChevronRight, ChevronLeft, Sparkles, LogOut } from 'lucide-react';
import { PreferencesStep } from './PreferencesStep';
import { UsernameStep } from './UsernameStep';
import { LegalConsentStep } from './LegalConsentStep';
import { GroupMatchingFlow } from '@/components/group/GroupMatchingFlow';
import { AuthPage } from '@/components/auth/AuthPage';
import { useAuth } from '@/hooks/useAuth';

import { useOnboardingCompletion } from '@/hooks/useOnboardingCompletion';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  genres: string[];
  personality: string[];
  habits: string[];
  username: string;
}

interface OnboardingFlowProps {
  onComplete?: (profile: UserProfile) => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { user, loading, signOut } = useAuth();
  const { completeOnboarding, isProcessing } = useOnboardingCompletion();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [showGroupMatching, setShowGroupMatching] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [userProfile, setUserProfile] = useState<UserProfile>({
    genres: [],
    personality: [],
    habits: [],
    username: ''
  });
  const [legalConsentGiven, setLegalConsentGiven] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary animate-pulse" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Show auth page if user is not authenticated
  if (!user) {
    return <AuthPage />;
  }

  const handleNext = async () => {
    // Extra validation for legal consent step
    if (currentStep === 0 && !legalConsentGiven) {
      toast({
        title: "Legal Consent Required",
        description: "Please confirm your age and accept our terms to continue.",
        variant: "destructive",
      });
      return;
    }
    
    if (currentStep < 2) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding - save profile and find/create group
      try {
        const result = await completeOnboarding(userProfile);
        
        if (result.success) {
          
          if (result.groupId) {
            // User was assigned to a group
            onComplete();
          } else {
            // User completed onboarding but no group assigned
            onComplete();
          }
        } else {
          // Show detailed error to user
          console.error('❌ Onboarding failed:', result.error || 'Unknown error');
          
          toast({
            title: "Onboarding Failed",
            description: result.error || "Failed to complete onboarding. Please try again.",
            variant: "destructive"
          });
        }
      } catch (error: any) {
        console.error('❌ Critical error in onboarding completion:', error);
        
        toast({
          title: "Onboarding Failed",
          description: "Failed to complete onboarding. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleGroupMatched = (groupId: string) => {
    setGroupId(groupId);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setUserProfile(prev => ({ ...prev, ...updates }));
  };

  const steps = [
    {
      title: "Legal Requirements",
      subtitle: "Please confirm your age and review our policies",
      component: <LegalConsentStep 
        onConsentChange={setLegalConsentGiven} 
        isConsentGiven={legalConsentGiven} 
      />
    },
    {
      title: "Tell us about yourself",
      subtitle: "Help us find your perfect group match",
      component: <PreferencesStep profile={userProfile} updateProfile={updateProfile} />
    },
    {
      title: "Your identity",
      subtitle: "We'll assign you a fun username",
      component: <UsernameStep profile={userProfile} updateProfile={updateProfile} />
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  
  // Strict validation for each step
  const canProceed = currentStep === 0 ? 
    legalConsentGiven : // Legal consent step - must have consent
    currentStep === 1 ? 
      (userProfile.genres.length > 0 || userProfile.personality.length > 0 || userProfile.habits.length > 0) : // Preferences step
      userProfile.username.length > 0; // Username step

  // Show group matching if onboarding is complete
  if (showGroupMatching) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                               SyncChat
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={signOut}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        <GroupMatchingFlow 
          userProfile={userProfile} 
          onGroupMatched={handleGroupMatched} 
        />
      </div>
    );
  }

  // Show onboarding flow
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                              SyncChat
            </h1>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Progress */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="flex items-center gap-4 mb-8">
          {steps.map((_, index) => (
            <React.Fragment key={index}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                index <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <Separator className={`flex-1 ${index < currentStep ? 'bg-primary' : 'bg-border'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Content */}
        <Card className="p-8 border-border/50 shadow-xl backdrop-blur-sm">
          {/* Exit Account Creation */}
          <div className="flex justify-end mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  // Sign out the user and redirect to auth page
                  await signOut();
                  toast({
                    title: "Account creation cancelled",
                    description: "You've been signed out. You can create an account again anytime.",
                    variant: "default",
                  });
                  // Redirect to login/signup page
                  window.location.href = '/';
                } catch (error) {
                  console.error('Error signing out:', error);
                  // Force redirect to login/signup page even if signout fails
                  window.location.href = '/';
                }
              }}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
              Exit Account Creation
            </Button>
          </div>
          
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{currentStepData.title}</h2>
            <p className="text-muted-foreground text-lg">{currentStepData.subtitle}</p>
          </div>

          <div className="min-h-[400px]">
            {currentStepData.component}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>

            <Button
              onClick={handleNext}
              disabled={!canProceed || isProcessing}
              className="gap-2"
            >
              {isProcessing ? 'Processing...' : (isLastStep ? 'Complete' : 'Continue')}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};