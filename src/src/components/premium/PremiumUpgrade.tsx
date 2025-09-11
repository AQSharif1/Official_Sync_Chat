import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Sparkles, Star, Users, Zap } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';
import { cn } from '@/lib/utils';

interface PremiumUpgradeProps {
  onClose?: () => void;
}

export const PremiumUpgrade = ({ onClose }: PremiumUpgradeProps) => {
  const { createCheckout, isPremium, isTrialing, openCustomerPortal } = usePremium();
  const [loading, setLoading] = useState<string | null>(null);

  const handleUpgrade = async (planType: 'monthly' | 'yearly', trial = false) => {
    setLoading(planType);
    await createCheckout(planType, trial);
    setLoading(null);
  };

  const features = [
    {
      icon: <Users className="h-5 w-5" />,
      title: "Private Groups",
      description: "Create and name your own private groups",
      free: false,
      premium: true
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Unlimited Switching",
      description: "Switch groups as many times as you want",
      free: "1 per day",
      premium: "Unlimited"
    },
    {
      icon: <Star className="h-5 w-5" />,
      title: "Direct Messaging",
      description: "Unlimited 1-on-1 private conversations",
      free: "Not available",
      premium: "Unlimited"
    },
    {
      icon: <Crown className="h-5 w-5" />,
      title: "Custom Themes",
      description: "Personalize your group with custom themes",
      free: false,
      premium: true
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "2x Karma Bonus",
      description: "Earn double points for all achievements",
      free: "1x rate",
      premium: "2x rate"
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Exclusive Events",
      description: "Join monthly premium-only vibe events",
      free: false,
      premium: true
    }
  ];

  if (isPremium || isTrialing) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Crown className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl">Premium Active</CardTitle>
          </div>
          <CardDescription>
            {isTrialing ? "You're currently on a free trial" : "You have access to all premium features"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                <div className="text-primary">{feature.icon}</div>
                <div>
                  <h4 className="font-medium">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-4 pt-4">
            <Button onClick={openCustomerPortal} variant="outline">
              Manage Subscription
            </Button>
            {onClose && (
              <Button onClick={onClose}>
                Continue Chatting
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Crown className="h-8 w-8 text-primary" />
          <CardTitle className="text-3xl">Upgrade to Premium</CardTitle>
        </div>
        <CardDescription className="text-lg">
          Unlock exclusive features and enhance your chat experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Feature Comparison */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">Features</th>
                <th className="text-center p-4">Free</th>
                <th className="text-center p-4">
                  <div className="flex items-center justify-center space-x-2">
                    <Crown className="h-5 w-5 text-primary" />
                    <span>Premium</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {features.map((feature, index) => (
                <tr key={index} className="border-b">
                  <td className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-muted-foreground">{feature.icon}</div>
                      <div>
                        <div className="font-medium">{feature.title}</div>
                        <div className="text-sm text-muted-foreground">{feature.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center p-4">
                    {feature.free ? (
                      typeof feature.free === 'string' ? (
                        <Badge variant="secondary">{feature.free}</Badge>
                      ) : (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="text-center p-4">
                    {feature.premium ? (
                      typeof feature.premium === 'string' ? (
                        <Badge className="bg-primary text-primary-foreground">{feature.premium}</Badge>
                      ) : (
                        <Check className="h-5 w-5 text-green-500 mx-auto" />
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Plan */}
          <Card className="relative border-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Monthly</CardTitle>
                  <CardDescription>Perfect for trying premium features</CardDescription>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold">$9.99</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => handleUpgrade('monthly')}
                disabled={loading === 'monthly'}
              >
                {loading === 'monthly' ? 'Processing...' : 'Get Monthly Premium'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleUpgrade('monthly', true)}
                disabled={loading === 'monthly'}
              >
                Start 3-Day Free Trial
              </Button>
            </CardContent>
          </Card>

          {/* Yearly Plan */}
          <Card className="relative border-2 border-primary">
            <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
              Best Value
            </Badge>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">Yearly</CardTitle>
                  <CardDescription>Save 33% with annual billing</CardDescription>
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold">$79.99</span>
                <span className="text-muted-foreground">/year</span>
                <div className="text-sm text-muted-foreground">
                  <span className="line-through">$119.88</span> Save $39.89
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                className="w-full" 
                onClick={() => handleUpgrade('yearly')}
                disabled={loading === 'yearly'}
              >
                {loading === 'yearly' ? 'Processing...' : 'Get Yearly Premium'}
              </Button>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => handleUpgrade('yearly', true)}
                disabled={loading === 'yearly'}
              >
                Start 3-Day Free Trial
              </Button>
            </CardContent>
          </Card>
        </div>

        {onClose && (
          <div className="text-center">
            <Button variant="ghost" onClick={onClose}>
              Maybe Later
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};