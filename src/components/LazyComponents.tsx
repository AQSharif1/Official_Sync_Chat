import React, { Suspense, lazy } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load heavy components
const GroupChat = lazy(() => import('./chat/GroupChat').then(module => ({ default: module.GroupChat })));
const GroupMatchingFlow = lazy(() => import('./group/GroupMatchingFlow').then(module => ({ default: module.GroupMatchingFlow })));
const ProfilePage = lazy(() => import('./profile/ProfilePage').then(module => ({ default: module.ProfilePage })));
const SettingsView = lazy(() => import('./navigation/SettingsView').then(module => ({ default: module.SettingsView })));
const OnboardingFlow = lazy(() => import('./onboarding/OnboardingFlow').then(module => ({ default: module.OnboardingFlow })));
const EngagementDashboard = lazy(() => import('./engagement/EngagementDashboard').then(module => ({ default: module.EngagementDashboard })));
// VoiceRoom component removed - using CollapsibleVoiceRoom instead


// Loading components with skeleton states
const ChatLoadingSkeleton = () => (
  <div className="space-y-4 p-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-[200px]" />
        <Skeleton className="h-4 w-[150px]" />
      </div>
    </div>
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="space-y-1 flex-1">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="h-16 w-[80%] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ProfileLoadingSkeleton = () => (
  <div className="space-y-6 p-4">
    <div className="flex items-center space-x-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-6 w-[150px]" />
        <Skeleton className="h-4 w-[100px]" />
      </div>
    </div>
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-[80%]" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const SettingsLoadingSkeleton = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-8 w-[200px] mb-6" />
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-3 w-[80px]" />
        </div>
        <Skeleton className="h-6 w-12" />
      </div>
    ))}
  </div>
);

const MatchingLoadingSkeleton = () => (
  <div className="space-y-6 p-4">
    <div className="text-center space-y-4">
      <Skeleton className="h-8 w-[300px] mx-auto" />
      <Skeleton className="h-4 w-[200px] mx-auto" />
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <Skeleton className="h-32 w-full rounded-lg mb-3" />
            <Skeleton className="h-4 w-[80%] mb-2" />
            <Skeleton className="h-3 w-[60%]" />
          </CardContent>
        </Card>
      ))}
    </div>
  </div>
);

const OnboardingLoadingSkeleton = () => (
  <div className="space-y-6 p-4">
    <div className="text-center space-y-4">
      <Skeleton className="h-12 w-[250px] mx-auto" />
      <Skeleton className="h-4 w-[180px] mx-auto" />
    </div>
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
    <div className="flex space-x-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-24" />
    </div>
  </div>
);

// Enhanced error fallback with retry functionality
const EnhancedErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <div className="min-h-[400px] flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardContent className="p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <svg className="w-6 h-6 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold">Something went wrong</h3>
          <p className="text-sm text-muted-foreground mt-1">
            We encountered an unexpected error. You can try to continue or reload the page.
          </p>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-destructive/10 rounded-md text-left">
            <p className="text-xs text-destructive font-mono">
              {error.message}
            </p>
          </div>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Reload Page
          </button>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Wrapper component for lazy loading with proper error handling
interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  fallback = <LoadingSpinner size="lg" text="Loading..." />,
  errorFallback = EnhancedErrorFallback
}) => (
  <ErrorBoundary fallback={<errorFallback error={new Error('Component failed to load')} resetErrorBoundary={() => {}} />}>
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// Preload components for better performance
export const preloadComponent = (componentName: string) => {
  switch (componentName) {
    case 'GroupChat':
      return import('./chat/GroupChat');
    case 'GroupMatchingFlow':
      return import('./group/GroupMatchingFlow');
    case 'ProfilePage':
      return import('./profile/ProfilePage');
    case 'SettingsView':
      return import('./navigation/SettingsView');
    case 'OnboardingFlow':
      return import('./onboarding/OnboardingFlow');
    case 'EngagementDashboard':
      return import('./engagement/EngagementDashboard');
    case 'VoiceRoom':
      // VoiceRoom component removed - using CollapsibleVoiceRoom instead
      return Promise.resolve({ default: () => null });

    default:
      return Promise.resolve();
  }
};

// Export lazy components with proper loading states
export const LazyGroupChat = (props: any) => (
  <LazyComponentWrapper fallback={<ChatLoadingSkeleton />}>
    <GroupChat {...props} />
  </LazyComponentWrapper>
);

export const LazyGroupMatchingFlow = (props: any) => (
  <LazyComponentWrapper fallback={<MatchingLoadingSkeleton />}>
    <GroupMatchingFlow {...props} />
  </LazyComponentWrapper>
);

export const LazyProfilePage = (props: any) => (
  <LazyComponentWrapper fallback={<ProfileLoadingSkeleton />}>
    <ProfilePage {...props} />
  </LazyComponentWrapper>
);

export const LazySettingsView = (props: any) => (
  <LazyComponentWrapper fallback={<SettingsLoadingSkeleton />}>
    <SettingsView {...props} />
  </LazyComponentWrapper>
);

export const LazyOnboardingFlow = (props: any) => (
  <LazyComponentWrapper fallback={<OnboardingLoadingSkeleton />}>
    <OnboardingFlow {...props} />
  </LazyComponentWrapper>
);

export const LazyEngagementDashboard = (props: any) => (
  <LazyComponentWrapper>
    <EngagementDashboard {...props} />
  </LazyComponentWrapper>
);

// VoiceRoom component removed - using CollapsibleVoiceRoom instead
export const LazyVoiceRoom = (props: any) => null;

