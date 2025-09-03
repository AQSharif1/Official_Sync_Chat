import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle } from 'lucide-react';

export const AuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isVerifying, setIsVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<'success' | 'error' | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Get the access_token and refresh_token from URL params
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        if (error) {
          setVerificationStatus('error');
          setMessage(errorDescription || 'Authentication failed');
          setIsVerifying(false);
          return;
        }

        if (!accessToken) {
          setVerificationStatus('error');
          setMessage('No access token received');
          setIsVerifying(false);
          return;
        }

        // Set the session manually
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          setVerificationStatus('error');
          setMessage(sessionError.message);
          setIsVerifying(false);
          return;
        }

        // Get the session properly
        const { data, error: sessionDataError } = await supabase.auth.getSession();
        if (sessionDataError) {
          console.error('AuthCallback failed:', sessionDataError);
          setVerificationStatus('error');
          setMessage('Failed to get session data');
          setIsVerifying(false);
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
          return;
        }

        const session = data.session;
        if (session && session.user.email_confirmed_at) {
          // Email verified successfully - check profile status
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

          setVerificationStatus('success');
          
          if (profile) {
            setMessage('Email verified successfully! Redirecting to app...');
            // User has profile - go to main app
            setTimeout(() => {
              navigate('/app', { replace: true });
            }, 2000);
          } else {
            setMessage('Email verified! Redirecting to onboarding...');
            // User needs to complete profile - go to onboarding
            setTimeout(() => {
              navigate('/onboarding', { replace: true });
            }, 2000);
          }
          
          setIsVerifying(false);
        } else {
          setVerificationStatus('error');
          setMessage('Email verification failed. Please try again.');
          setIsVerifying(false);
        }
      } catch (error: any) {
        console.error('AuthCallback error:', error);
        setVerificationStatus('error');
        setMessage(error.message || 'An unexpected error occurred');
        setIsVerifying(false);
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
      }
    };

    handleRedirect();
  }, [searchParams, navigate]);

  if (isVerifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" text="Verifying your email..." />
          <p className="text-muted-foreground">Please wait while we complete the verification process.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          {verificationStatus === 'success' ? (
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          ) : (
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          )}
          
          <CardTitle className="text-2xl font-bold">
            {verificationStatus === 'success' ? 'Email Verified!' : 'Verification Failed'}
          </CardTitle>
          
          <p className="text-muted-foreground">{message}</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {verificationStatus === 'success' ? (
            <div className="text-center space-y-2">
              <p className="text-sm text-green-600">
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Your account is now active
              </p>
              <p className="text-xs text-muted-foreground">
                You'll be redirected to the app shortly...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Go to Sign In
              </Button>
              
              <Button
                onClick={() => navigate('/')}
                variant="outline"
                className="w-full"
              >
                Go to Home
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};



