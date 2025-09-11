import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UsernameChangeData {
  canChange: boolean;
  isFirstTime: boolean;
  isPremium: boolean;
  loading: boolean;
}

export const useUsernameChange = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [changeData, setChangeData] = useState<UsernameChangeData>({
    canChange: false,
    isFirstTime: true,
    isPremium: false,
    loading: true
  });

  useEffect(() => {
    if (user) {
      fetchChangeData();
    }
  }, [user]);

const fetchChangeData = async () => {
    if (!user) return;

    try {
      setChangeData(prev => ({ ...prev, loading: true }));

      // Check user profile for username_changed flag
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username_changed')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      // Check if user is premium
      const { data: premiumData, error: premiumError } = await supabase
        .from('subscribers')
        .select('subscribed, subscription_end')
        .eq('user_id', user.id)
        .eq('subscribed', true)
        .maybeSingle();

      if (premiumError) throw premiumError;

      const isPremium = premiumData && 
        (premiumData.subscription_end === null || new Date(premiumData.subscription_end) > new Date());

      setChangeData({
        canChange: !profile.username_changed,
        isFirstTime: !profile.username_changed,
        isPremium: !!isPremium,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching username change data:', error);
      setChangeData(prev => ({ ...prev, loading: false }));
    }
  };

const changeUsername = async (newUsername: string) => {
    if (!user) return false;

    try {
      // Check if user has already changed username
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('username_changed')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;

      if (profile.username_changed) {
        toast({
          title: "Cannot Change Username",
          description: "You've already used your one-time username change.",
          variant: "destructive",
        });
        return false;
      }

      // Validate username
      if (!newUsername.trim() || newUsername.length < 3) {
        toast({
          title: "Invalid Username",
          description: "Username must be at least 3 characters long.",
          variant: "destructive",
        });
        return false;
      }

      if (newUsername.length > 20) {
        toast({
          title: "Username Too Long",
          description: "Username must be 20 characters or less.",
          variant: "destructive",
        });
        return false;
      }

      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('username', newUsername.trim())
        .neq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingUser) {
        toast({
          title: "Username Taken",
          description: "This username is already taken. Please choose another.",
          variant: "destructive",
        });
        return false;
      }

      // Update username and mark as changed
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          username: newUsername.trim(),
          username_changed: true
        })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Refresh change data
      await fetchChangeData();

      toast({
        title: "Username Changed!",
        description: `Your username has been updated to "${newUsername}". This was your one-time change.`,
      });

      return true;
    } catch (error) {
      console.error('Error changing username:', error);
      toast({
        title: "Error",
        description: "Failed to change username. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    ...changeData,
    changeUsername,
    refreshChangeData: fetchChangeData
  };
};