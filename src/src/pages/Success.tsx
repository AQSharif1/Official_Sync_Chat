import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Check } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';

export const SuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkSubscription } = usePremium();
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    // Refresh subscription status after successful payment
    if (sessionId) {
      setTimeout(() => {
        checkSubscription();
      }, 2000);
    }
  }, [sessionId, checkSubscription]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-lg mx-auto text-center">
        <CardHeader>
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="bg-green-100 p-3 rounded-full">
              <Check className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to Premium!</CardTitle>
          <CardDescription className="text-lg">
            Your subscription has been activated successfully
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Crown className="h-6 w-6 text-primary" />
              <span className="font-semibold text-lg">Premium Features Unlocked</span>
            </div>
            <ul className="text-sm space-y-2 text-left">
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Create private groups with custom names</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Unlimited group switching</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Unlimited direct messaging</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Custom group themes and emoji packs</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>2x Karma bonus on all achievements</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="h-4 w-4 text-green-500" />
                <span>Access to exclusive monthly vibe events</span>
              </li>
            </ul>
          </div>

          <Button 
            className="w-full" 
            onClick={() => navigate('/')}
            size="lg"
          >
            Start Chatting with Premium
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};