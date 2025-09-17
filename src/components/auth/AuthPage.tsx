import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, Lock, Eye, EyeOff, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const AuthPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const { toast } = useToast();
  const { signUp, signIn, resendVerification } = useAuth();
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [resendEmail, setResendEmail] = useState('');
  const [isResending, setIsResending] = useState(false);



  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signUp(formData.email, formData.password);
      
      if (error) {
        if (error.message?.includes('already registered') || 
            error.message?.includes('already exists') ||
            error.message?.includes('User already registered')) {
          toast({
            title: "Account already exists",
            description: "This email is already registered. Please use the Sign In tab to log in to your existing account.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message || "An unexpected error occurred.",
            variant: "destructive",
          });
        }
      } else {
        // Show success message and redirect to login
        setSignupEmail(formData.email);
        setShowSignupSuccess(true);
        // Clear form
        setFormData({ email: '', password: '' });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        if (error.message?.includes('email_not_confirmed')) {
          toast({
            title: "Email not confirmed",
            description: "Please check your email and click the confirmation link before signing in.",
            variant: "destructive",
          });
        } else if (error.message?.includes('Invalid') || error.message?.includes('not found')) {
          toast({
            title: "Account not found",
            description: "No account found with this email. Please create an account using the Sign Up tab.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sign in failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Welcome back!",
          description: "Successfully signed in.",
        });
        // Redirect will happen automatically via auth state change
        window.location.href = '/';
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotPasswordEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotPasswordEmail, {
        redirectTo: 'https://syncchatapp.com/',
      });

      if (error) {
        toast({
          title: "Reset failed",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reset email sent!",
          description: "Check your email for password reset instructions.",
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resendEmail) {
      toast({
        title: "Email required",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await resendVerification(resendEmail);
      
      if (error) {
        // Check if this is the "already verified" message
        if (error.message?.includes('email_confirmed_at')) {
          toast({
            title: "Email Already Verified",
            description: "Your email is already verified. You can sign in normally.",
            variant: "default",
          });
        } else {
          toast({
            title: "Resend failed",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Verification email sent!",
          description: "Check your inbox for the confirmation link.",
        });
        setShowResendVerification(false);
        setResendEmail('');
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

  // Show signup success message
  if (showSignupSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <div className="p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Check Your Email!</h2>
              <p className="text-muted-foreground">
                We sent a verification link to <strong>{signupEmail}</strong>
              </p>
              <p className="text-sm text-muted-foreground">
                Please click the link in your email to verify your account.
              </p>
            </div>
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setShowSignupSuccess(false);
                  setSignupEmail('');
                }}
                className="w-full"
              >
                Back to Sign In
              </Button>
              <p className="text-xs text-muted-foreground">
                Can't find the email? Check your spam folder.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold gradient-text">Welcome</h1>
          </div>
          <p className="text-muted-foreground">
            Join groups, chat with friends, and discover new connections
          </p>
        </div>

        {/* Auth Form */}
        <Card className="glass-card shadow-elegant p-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <div className="text-sm text-muted-foreground text-center mb-4">
              <p><strong>Have an account?</strong> Use Sign In tab. <strong>New here?</strong> Use Sign Up tab to create an account.</p>
            </div>

            {/* Resend Verification Section - More Prominent */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Mail className="w-4 h-4" />
                <span className="text-sm font-medium">Need to verify your email?</span>
              </div>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 mb-3">
                If you haven't received a verification email, click below to resend it.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowResendVerification(true)}
                className="w-full border-blue-200 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/40"
              >
                <Mail className="w-4 h-4 mr-2" />
                Resend Verification Email
              </Button>
            </div>

            <TabsContent value="signin" className="space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-9 pr-9"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full shadow-glow"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
              
              {/* Forgot Password & Resend Verification */}
              <div className="text-center space-y-2">
                <div className="flex justify-center gap-4">
                  <Button 
                    variant="link" 
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => setShowForgotPassword(true)}
                  >
                    Forgot password?
                  </Button>
                  <Button 
                    variant="link" 
                    className="text-sm text-muted-foreground hover:text-primary"
                    onClick={() => setShowResendVerification(true)}
                  >
                    Resend verification
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Need to verify your email?{' '}
                  <Button 
                    variant="link" 
                    className="text-xs p-0 h-auto text-primary hover:text-primary/80"
                    onClick={() => window.location.href = '/email-verification'}
                  >
                    Click here
                  </Button>
                </div>
              </div>

              {/* Forgot Password Modal */}
              {showForgotPassword && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <Card className="w-full max-w-md p-6">
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">Reset Password</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter your email to receive reset instructions
                        </p>
                      </div>
                      
                      <form onSubmit={handleForgotPassword} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="reset-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="reset-email"
                              type="email"
                              placeholder="Enter your email"
                              value={forgotPasswordEmail}
                              onChange={(e) => setForgotPasswordEmail(e.target.value)}
                              className="pl-9"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => setShowForgotPassword(false)}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1"
                            disabled={isLoading}
                          >
                            {isLoading ? "Sending..." : "Send Reset"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </Card>
                </div>
              )}

              {/* Resend Verification Modal */}
              {showResendVerification && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                  <Card className="w-full max-w-md p-6">
                    <div className="space-y-4">
                      <div className="text-center">
                        <h3 className="text-lg font-semibold">Resend Verification Email</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter your email to receive a new verification link
                        </p>
                      </div>
                      
                      <form onSubmit={handleResendVerification} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="resend-email">Email</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="resend-email"
                              type="email"
                              placeholder="Enter your email"
                              value={resendEmail}
                              onChange={(e) => setResendEmail(e.target.value)}
                              className="pl-9"
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => {
                              setShowResendVerification(false);
                              setResendEmail('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button 
                            type="submit" 
                            className="flex-1"
                            disabled={isResending}
                          >
                            {isResending ? "Sending..." : "Send Verification"}
                          </Button>
                        </div>
                      </form>
                    </div>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="Enter your email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="pl-9 pr-9"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password should be at least 6 characters long
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full shadow-glow"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>By continuing, you agree to our terms of service</p>
        </div>
      </div>
    </div>
  );
};