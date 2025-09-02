import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const EmailVerification = () => {
  const [email, setEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resendVerification } = useAuth();

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await resendVerification(email);
      
      if (error) {
        // Check if this is the "already verified" message
        if (error.message?.includes('already verified') || 
            error.message?.includes('already confirmed') ||
            error.message?.includes('email_confirmed_at')) {
          toast({
            title: "Email Already Verified",
            description: "Your email is already verified. You can sign in normally.",
            variant: "default",
          });
          // Redirect to sign in after a short delay
          setTimeout(() => navigate('/'), 2000);
        } else {
          toast({
            title: "Failed to resend",
            description: error.message || "Please try again later.",
            variant: "destructive",
          });
        }
      } else {
        setResendSuccess(true);
        toast({
          title: "Verification email sent!",
          description: "Check your inbox for the confirmation link.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email.",
        variant: "destructive",
      });
    } finally {
      setIsResending(false);
    }
  };

  if (resendSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Email Sent!</h2>
              <p className="text-muted-foreground">
                We've sent a verification email to <strong>{email}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Please check your inbox and click the verification link.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/')}
                className="w-full"
              >
                Back to Sign In
              </Button>
              <Button
                onClick={() => {
                  setResendSuccess(false);
                  setEmail('');
                }}
                variant="outline"
                className="w-full"
              >
                Send Another Email
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Resend Verification Email</CardTitle>
          <p className="text-muted-foreground">
            Enter your email address and we'll send you a new verification link.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <form onSubmit={handleResendVerification} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={isResending}
              className="w-full"
            >
              {isResending ? "Sending..." : "Send Verification Email"}
            </Button>
          </form>
          
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Sign In
          </Button>
          
          <div className="text-center text-xs text-muted-foreground space-y-1">
            <p>Can't find the email? Check your spam folder.</p>
            <p>Verification links expire after 24 hours.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};






