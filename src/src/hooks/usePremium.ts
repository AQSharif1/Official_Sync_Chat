import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export interface PremiumData {
  subscribed: boolean;
  subscription_tier: string | null;
  subscription_end: string | null;
  trial_end: string | null;
}

export const usePremium = () => {
  const { user } = useAuth();
  const [premium, setPremium] = useState<PremiumData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkSubscription();
    }
  }, [user]);

  const checkSubscription = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error checking subscription:', error);
        return;
      }

      setPremium(data);
    } catch (error) {
      console.error('Error checking subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCheckout = async (planType: 'monthly' | 'yearly', trial = false) => {
    if (!user) return;

    try {
      console.log('🚀 Creating checkout for plan:', planType, 'trial:', trial);
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planType, trial },
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('❌ Error creating checkout:', error);
        return;
      }

      console.log('✅ Checkout created, opening Stripe...');
      
      // Open Stripe checkout in a new tab
      const checkoutWindow = window.open(data.url, '_blank');
      
      // Start polling for subscription status changes (fallback for webhook delays)
      if (checkoutWindow) {
        startSubscriptionPolling();
      }
      
    } catch (error) {
      console.error('💥 Error creating checkout:', error);
    }
  };

  // Polling fallback for immediate subscription status updates
  const startSubscriptionPolling = useCallback(() => {
    if (!user) return;

    console.log('⏰ Starting subscription status polling...');
    
    const pollInterval = setInterval(async () => {
      try {
        console.log('🔍 Polling subscription status...');
        await checkSubscription();
        
        // Stop polling if user is now premium
        if (premium?.subscribed) {
          console.log('✅ User is now premium, stopping polling');
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, 3000); // Check every 3 seconds

    // Stop polling after 5 minutes (max wait time)
    setTimeout(() => {
      console.log('⏰ Stopping subscription polling (timeout)');
      clearInterval(pollInterval);
    }, 300000);

    return () => clearInterval(pollInterval);
  }, [user, premium]);

  const openCustomerPortal = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('customer-portal', {
        headers: {
          Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (error) {
        console.error('Error opening customer portal:', error);
        return;
      }

      window.open(data.url, '_blank');
    } catch (error) {
      console.error('Error opening customer portal:', error);
    }
  };

  const canUseFeature = () => {
    if (!premium) return false;
    
    // Premium users can use all features
    if (premium.subscribed) return true;
    
    // Free users have limitations
    return false;
  };

  return {
    premium,
    loading,
    isPremium: premium?.subscribed || false,
    isTrialing: premium?.trial_end ? new Date(premium.trial_end) > new Date() : false,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    canUseFeature,
  };
};