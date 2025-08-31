-- =====================================================
-- 🚀 SYNCCHAT COMPLETE DATABASE MIGRATION
-- =====================================================
-- Copy and paste this entire script into your Supabase SQL Editor
-- Run it all at once to set up your complete database schema

-- =====================================================
-- 1. CORE TABLES (Users, Groups, Profiles)
-- =====================================================

-- Create profiles table to store user onboarding data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  username TEXT NOT NULL UNIQUE,
  genres TEXT[] NOT NULL DEFAULT '{}',
  personality TEXT[] NOT NULL DEFAULT '{}',
  habits TEXT[] NOT NULL DEFAULT '{}',
  mood INTEGER NOT NULL DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  vibe_label TEXT NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 10,
  current_members INTEGER NOT NULL DEFAULT 0,
  lifecycle_stage TEXT DEFAULT 'active',
  is_private BOOLEAN DEFAULT false,
  created_by_user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group_members junction table
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create user_switches table to track free switches
CREATE TABLE IF NOT EXISTS public.user_switches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  has_used_free_switch BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. CHAT & MESSAGING TABLES
-- =====================================================

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  gif_url TEXT,
  voice_audio_url TEXT,
  voice_transcription TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- =====================================================
-- 3. ENGAGEMENT & ACHIEVEMENTS
-- =====================================================

-- Create user_engagement table
CREATE TABLE IF NOT EXISTS public.user_engagement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  messages_sent_today INTEGER NOT NULL DEFAULT 0,
  reactions_given_today INTEGER NOT NULL DEFAULT 0,
  tools_used_today INTEGER NOT NULL DEFAULT 0,
  group_switches_used_today INTEGER NOT NULL DEFAULT 0,
  reconnects_used_today INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_days INTEGER NOT NULL DEFAULT 0,
  achievement_points INTEGER NOT NULL DEFAULT 0,
  total_karma_points INTEGER NOT NULL DEFAULT 0,
  current_group_karma INTEGER NOT NULL DEFAULT 0,
  karma_level TEXT NOT NULL DEFAULT 'Newcomer',
  monthly_karma_points INTEGER NOT NULL DEFAULT 0,
  last_level_update TIMESTAMPTZ DEFAULT now(),
  current_group_join_date TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_achievements table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_type)
);

-- Create subscribers table (for premium features)
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 4. ENHANCED KARMA SYSTEM
-- =====================================================

-- Create user karma progress table
CREATE TABLE IF NOT EXISTS public.user_karma_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_karma_points INTEGER NOT NULL DEFAULT 0,
  current_level TEXT NOT NULL DEFAULT 'Newbie',
  level_progress INTEGER NOT NULL DEFAULT 0,
  last_active TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create group karma monthly table
CREATE TABLE IF NOT EXISTS public.group_karma_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  monthly_karma_points INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  rank INTEGER DEFAULT NULL,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_id, month_year)
);

-- Create group member karma table
CREATE TABLE IF NOT EXISTS public.group_member_karma (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  karma_contributed INTEGER NOT NULL DEFAULT 0,
  month_year TEXT NOT NULL DEFAULT to_char(now(), 'YYYY-MM'),
  last_contributed TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id, month_year)
);

-- Create karma activities log table
CREATE TABLE IF NOT EXISTS public.karma_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  points_earned INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create monthly competitions table
CREATE TABLE IF NOT EXISTS public.monthly_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year TEXT NOT NULL UNIQUE,
  competition_type TEXT NOT NULL DEFAULT 'most_active',
  status TEXT NOT NULL DEFAULT 'active',
  total_groups INTEGER NOT NULL DEFAULT 0,
  total_participants INTEGER NOT NULL DEFAULT 0,
  rewards_distributed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- 5. EMAIL UNIQUENESS ENFORCEMENT
-- =====================================================

-- Function to check for existing accounts before signup
CREATE OR REPLACE FUNCTION public.check_email_uniqueness()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email already exists in auth.users
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = NEW.email 
    AND id != NEW.id
    AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'An account with this email already exists. Please use a different email or delete your existing account first.'
      USING ERRCODE = 'unique_violation';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to enforce email uniqueness on user creation
DROP TRIGGER IF EXISTS enforce_email_uniqueness ON auth.users;
CREATE TRIGGER enforce_email_uniqueness
  BEFORE INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.check_email_uniqueness();

-- Function to check if email is available for signup
CREATE OR REPLACE FUNCTION public.is_email_available(check_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if email exists and is not deleted
  RETURN NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = check_email 
    AND deleted_at IS NULL
  );
END;
$$;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_engagement ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_karma_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_karma_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_member_karma ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.karma_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for groups (readable by group members)
DROP POLICY IF EXISTS "Users can view groups they belong to" ON public.groups;
CREATE POLICY "Users can view groups they belong to" 
ON public.groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = groups.id AND user_id = auth.uid()
  )
);

-- RLS Policies for group_members
DROP POLICY IF EXISTS "Users can view their own group memberships" ON public.group_members;
CREATE POLICY "Users can view their own group memberships" 
ON public.group_members FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view members of their groups" ON public.group_members;
CREATE POLICY "Users can view members of their groups" 
ON public.group_members FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members gm 
    WHERE gm.group_id = group_members.group_id AND gm.user_id = auth.uid()
  )
);

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view messages in their groups" ON public.chat_messages;
CREATE POLICY "Users can view messages in their groups" 
ON public.chat_messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = chat_messages.group_id AND user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert messages in their groups" ON public.chat_messages;
CREATE POLICY "Users can insert messages in their groups" 
ON public.chat_messages FOR INSERT WITH CHECK (
  auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = chat_messages.group_id AND user_id = auth.uid()
  )
);

-- RLS Policies for user_engagement
DROP POLICY IF EXISTS "Users can view their own engagement" ON public.user_engagement;
CREATE POLICY "Users can view their own engagement" 
ON public.user_engagement FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for user_achievements
DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
CREATE POLICY "Users can view their own achievements" 
ON public.user_achievements FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for karma tables
DROP POLICY IF EXISTS "Users can view their own karma progress" ON public.user_karma_progress;
CREATE POLICY "Users can view their own karma progress" 
ON public.user_karma_progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view karma activities in their groups" ON public.karma_activities;
CREATE POLICY "Users can view karma activities in their groups" 
ON public.karma_activities FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.group_members 
    WHERE group_id = karma_activities.group_id AND user_id = auth.uid()
  )
);

-- =====================================================
-- 7. CORE FUNCTIONS
-- =====================================================

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_switches_updated_at ON public.user_switches;
CREATE TRIGGER update_user_switches_updated_at
  BEFORE UPDATE ON public.user_switches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced karma tracking function
CREATE OR REPLACE FUNCTION public.track_karma_activity(
  p_user_id uuid,
  p_group_id uuid,
  p_activity_type text,
  p_points integer,
  p_description text,
  p_multiplier numeric DEFAULT 1.0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  final_points INTEGER := p_points * p_multiplier;
BEGIN
  -- Insert into karma_activities log
  INSERT INTO public.karma_activities (user_id, group_id, activity_type, points_earned, description)
  VALUES (p_user_id, p_group_id, p_activity_type, final_points, p_description);

  -- Update user's total karma
  INSERT INTO public.user_karma_progress (user_id, total_karma_points, last_active)
  VALUES (p_user_id, final_points, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    total_karma_points = user_karma_progress.total_karma_points + final_points,
    last_active = now();

  -- Update group's monthly karma
  INSERT INTO public.group_karma_monthly (group_id, monthly_karma_points, last_activity)
  VALUES (p_group_id, final_points, now())
  ON CONFLICT (group_id, month_year) 
  DO UPDATE SET 
    monthly_karma_points = group_karma_monthly.monthly_karma_points + final_points,
    last_activity = now();

  -- Update user's contribution to the current group
  INSERT INTO public.group_member_karma (user_id, group_id, karma_contributed, last_contributed)
  VALUES (p_user_id, p_group_id, final_points, now())
  ON CONFLICT (user_id, group_id, month_year) 
  DO UPDATE SET 
    karma_contributed = group_member_karma.karma_contributed + final_points,
    last_contributed = now();
END;
$function$;

-- Function to get group leaderboard
CREATE OR REPLACE FUNCTION public.get_group_leaderboard(p_group_id uuid)
RETURNS TABLE(
  user_id uuid,
  username text,
  karma_contributed integer,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    gmk.user_id,
    p.username,
    gmk.karma_contributed,
    ROW_NUMBER() OVER (ORDER BY gmk.karma_contributed DESC)::integer as rank
  FROM public.group_member_karma gmk
  JOIN public.profiles p ON p.user_id = gmk.user_id
  WHERE gmk.group_id = p_group_id
    AND gmk.month_year = to_char(now(), 'YYYY-MM')
  ORDER BY gmk.karma_contributed DESC
  LIMIT 10;
END;
$function$;

-- Function to get global leaderboard
CREATE OR REPLACE FUNCTION public.get_global_leaderboard()
RETURNS TABLE(
  user_id uuid,
  username text,
  total_karma_points integer,
  current_level text,
  rank integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ukp.user_id,
    p.username,
    ukp.total_karma_points,
    ukp.current_level,
    ROW_NUMBER() OVER (ORDER BY ukp.total_karma_points DESC)::integer as rank
  FROM public.user_karma_progress ukp
  JOIN public.profiles p ON p.user_id = ukp.user_id
  ORDER BY ukp.total_karma_points DESC
  LIMIT 50;
END;
$function$;

-- Enhanced user engagement function
CREATE OR REPLACE FUNCTION public.update_user_engagement(p_user_id uuid, p_activity_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  today_start TIMESTAMP WITH TIME ZONE := date_trunc('day', now());
  engagement_record RECORD;
  is_premium_user BOOLEAN := false;
  karma_multiplier INTEGER := 1;
BEGIN
  -- Check if user is premium
  SELECT subscribed INTO is_premium_user
  FROM public.subscribers
  WHERE user_id = p_user_id AND subscribed = true;

  IF is_premium_user THEN
    karma_multiplier := 2;
  END IF;

  -- Get or create engagement record for today
  INSERT INTO public.user_engagement (user_id, last_active_date)
  VALUES (p_user_id, CURRENT_DATE)
  ON CONFLICT (user_id) DO NOTHING;

  -- Update engagement based on activity type
  IF p_activity_type = 'message' THEN
    UPDATE public.user_engagement 
    SET messages_sent_today = messages_sent_today + 1,
        last_active_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_activity_type = 'reaction' THEN
    UPDATE public.user_engagement 
    SET reactions_given_today = reactions_given_today + 1,
        last_active_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id;
  ELSIF p_activity_type = 'tool' THEN
    UPDATE public.user_engagement 
    SET tools_used_today = tools_used_today + 1,
        last_active_date = CURRENT_DATE,
        updated_at = now()
    WHERE user_id = p_user_id;
  END IF;

  -- Check and award achievements
  PERFORM public.check_and_award_achievements(p_user_id, karma_multiplier);
END;
$function$;

-- Achievement checking function
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid, p_karma_multiplier integer DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  engagement_data RECORD;
  message_count INTEGER;
  base_points INTEGER;
BEGIN
  -- Get user engagement data
  SELECT * INTO engagement_data
  FROM public.user_engagement
  WHERE user_id = p_user_id;

  IF engagement_data IS NULL THEN
    RETURN;
  END IF;

  -- First message achievement
  IF engagement_data.messages_sent_today >= 1 THEN
    base_points := 10;
    INSERT INTO public.user_achievements (user_id, achievement_type, title, description, icon, points)
    VALUES (p_user_id, 'first_message', 'First Steps', 'Sent your first message!', '💬', base_points * p_karma_multiplier)
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- 3-day streak achievement
  IF engagement_data.streak_days >= 3 THEN
    base_points := 25;
    INSERT INTO public.user_achievements (user_id, achievement_type, title, description, icon, points)
    VALUES (p_user_id, 'streak_3', 'Getting Started', 'Active for 3 days!', '🔥', base_points * p_karma_multiplier)
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- 7-day streak achievement
  IF engagement_data.streak_days >= 7 THEN
    base_points := 50;
    INSERT INTO public.user_achievements (user_id, achievement_type, title, description, icon, points)
    VALUES (p_user_id, 'streak_7', 'Committed', 'Active for a week!', '⭐', base_points * p_karma_multiplier)
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- Social butterfly (10+ reactions in a day)
  IF engagement_data.reactions_given_today >= 10 THEN
    base_points := 15;
    INSERT INTO public.user_achievements (user_id, achievement_type, title, description, icon, points)
    VALUES (p_user_id, 'social_butterfly', 'Social Butterfly', 'Gave 10+ reactions in one day!', '🦋', base_points * p_karma_multiplier)
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
  END IF;

  -- Update total achievement points
  UPDATE public.user_engagement
  SET achievement_points = (
    SELECT COALESCE(SUM(points), 0)
    FROM public.user_achievements
    WHERE user_id = p_user_id
  )
  WHERE user_id = p_user_id;
END;
$function$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

-- Grant necessary permissions for functions
GRANT EXECUTE ON FUNCTION public.track_karma_activity(uuid, uuid, text, integer, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_leaderboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_engagement(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_award_achievements(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_email_available(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_email_uniqueness() TO anon, authenticated;

-- =====================================================
-- 🎉 MIGRATION COMPLETE!
-- =====================================================
-- Your SyncChat database is now ready for production!
-- 
-- Next steps:
-- 1. Deploy your app with environment variables
-- 2. Test user registration and group creation
-- 3. Verify real-time messaging works
-- 4. Check karma system functionality
--
-- 🚀 Ready to launch SyncChat!
-- =====================================================