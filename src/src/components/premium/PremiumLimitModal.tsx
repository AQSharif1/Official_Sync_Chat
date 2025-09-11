import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Users, Star, Edit3 } from 'lucide-react';
import { usePremium } from '@/hooks/usePremium';

interface PremiumLimitModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  feature: 'group_switch' | 'reconnect' | 'enhanced_username_changes' | 'custom_theme';
  currentUsage?: number;
  limit?: number;
}

const featureConfig = {
  group_switch: {
    icon: <Users className="h-6 w-6" />,
    title: "Daily Group Switch Limit Reached",
    description: "You've used your free group switch for today. Premium users get unlimited group switching!",
    benefit: "Unlimited group switching"
  },
  reconnect: {
    icon: <Star className="h-6 w-6" />,
    title: "Premium Feature: Direct Messaging", 
    description: "Direct messaging is available exclusively for premium subscribers. Upgrade to unlock unlimited 1-on-1 private conversations!",
    benefit: "Unlimited direct messaging with no daily limits"
  },
  enhanced_username_changes: {
    icon: <Edit3 className="h-6 w-6" />,
    title: "Monthly Username Change Limit Reached",
    description: "You've used all your free username changes this month. Premium users get 5 username changes per month!",
    benefit: "5 username changes per month"
  },
  custom_theme: {
    icon: <Zap className="h-6 w-6" />,
    title: "Premium Feature: Custom Themes",
    description: "Custom group themes are available for premium users. Personalize your groups with unique styles!",
    benefit: "Unlimited custom themes and styles"
  }
};

export const PremiumLimitModal = ({ 
  open, 
  onOpenChange, 
  feature, 
  currentUsage, 
  limit 
}: PremiumLimitModalProps) => {
  const { createCheckout } = usePremium();
  const config = featureConfig[feature];

  const handleUpgrade = (planType: 'monthly' | 'yearly', trial = false) => {
    createCheckout(planType, trial);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="text-primary">{config.icon}</div>
            <DialogTitle className="text-xl">{config.title}</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            {config.description}
          </DialogDescription>
          {currentUsage !== undefined && limit !== undefined && (
            <div className="text-sm text-muted-foreground mt-2">
              You've used {currentUsage} of {limit} free uses today.
            </div>
          )}
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <div className="bg-primary/10 p-4 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Crown className="h-5 w-5 text-primary" />
              <span className="font-medium">Premium Benefit</span>
            </div>
            <p className="text-sm">{config.benefit}</p>
          </div>

          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => handleUpgrade('monthly')}
            >
              Upgrade to Monthly ($9.99/mo)
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleUpgrade('yearly')}
            >
              Upgrade to Yearly ($79.99/yr)
            </Button>
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => handleUpgrade('monthly', true)}
            >
              Try 3-Day Free Trial
            </Button>
          </div>

          <Button 
            variant="ghost" 
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};