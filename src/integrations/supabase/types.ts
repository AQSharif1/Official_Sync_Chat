export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string | null
          created_at: string
          gif_url: string | null
          group_id: string
          id: string
          message_type: string
          updated_at: string
          user_id: string
          voice_audio_url: string | null
          voice_transcription: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_url?: string | null
          group_id: string
          id?: string
          message_type: string
          updated_at?: string
          user_id: string
          voice_audio_url?: string | null
          voice_transcription?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_url?: string | null
          group_id?: string
          id?: string
          message_type?: string
          updated_at?: string
          user_id?: string
          voice_audio_url?: string | null
          voice_transcription?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_prompts: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_active: boolean
          prompt_text: string
          prompt_type: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          prompt_text: string
          prompt_type?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_active?: boolean
          prompt_text?: string
          prompt_type?: string
        }
        Relationships: []
      }
      flagged_messages: {
        Row: {
          chat_type: string
          confidence_score: number | null
          created_at: string
          flag_reason: string
          flagged_by: string
          id: string
          is_confirmed: boolean | null
          message_id: string
          reviewed_at: string | null
        }
        Insert: {
          chat_type: string
          confidence_score?: number | null
          created_at?: string
          flag_reason: string
          flagged_by?: string
          id?: string
          is_confirmed?: boolean | null
          message_id: string
          reviewed_at?: string | null
        }
        Update: {
          chat_type?: string
          confidence_score?: number | null
          created_at?: string
          flag_reason?: string
          flagged_by?: string
          id?: string
          is_confirmed?: boolean | null
          message_id?: string
          reviewed_at?: string | null
        }
        Relationships: []
      }
      group_invites: {
        Row: {
          created_at: string
          current_uses: number
          expires_at: string
          group_id: string
          id: string
          invite_code: string
          inviter_id: string
          is_active: boolean
          max_uses: number | null
        }
        Insert: {
          created_at?: string
          current_uses?: number
          expires_at?: string
          group_id: string
          id?: string
          invite_code: string
          inviter_id: string
          is_active?: boolean
          max_uses?: number | null
        }
        Update: {
          created_at?: string
          current_uses?: number
          expires_at?: string
          group_id?: string
          id?: string
          invite_code?: string
          inviter_id?: string
          is_active?: boolean
          max_uses?: number | null
        }
        Relationships: []
      }
      group_lifecycle_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          group_id: string
          id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          group_id: string
          id?: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          group_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_lifecycle_events_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_name_proposals: {
        Row: {
          created_at: string
          group_id: string
          id: string
          is_active: boolean
          proposed_name: string
          proposer_id: string
          vote_deadline: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          is_active?: boolean
          proposed_name: string
          proposer_id: string
          vote_deadline?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          is_active?: boolean
          proposed_name?: string
          proposer_id?: string
          vote_deadline?: string
        }
        Relationships: []
      }
      group_name_votes: {
        Row: {
          group_id: string
          id: string
          proposed_name: string
          proposer_id: string
          user_id: string
          vote_choice: string
          vote_deadline: string
          voted_at: string
        }
        Insert: {
          group_id: string
          id?: string
          proposed_name: string
          proposer_id: string
          user_id: string
          vote_choice: string
          vote_deadline: string
          voted_at?: string
        }
        Update: {
          group_id?: string
          id?: string
          proposed_name?: string
          proposer_id?: string
          user_id?: string
          vote_choice?: string
          vote_deadline?: string
          voted_at?: string
        }
        Relationships: []
      }
      group_personalities: {
        Row: {
          created_at: string
          dominant_traits: string[]
          energy_level: number
          favorite_activities: string[]
          group_id: string
          group_vibe_score: number
          id: string
          interaction_style: string
          last_updated: string
        }
        Insert: {
          created_at?: string
          dominant_traits?: string[]
          energy_level?: number
          favorite_activities?: string[]
          group_id: string
          group_vibe_score?: number
          id?: string
          interaction_style?: string
          last_updated?: string
        }
        Update: {
          created_at?: string
          dominant_traits?: string[]
          energy_level?: number
          favorite_activities?: string[]
          group_id?: string
          group_vibe_score?: number
          id?: string
          interaction_style?: string
          last_updated?: string
        }
        Relationships: []
      }
      group_votes: {
        Row: {
          group_id: string
          id: string
          user_id: string
          vote_choice: string
          voted_at: string
        }
        Insert: {
          group_id: string
          id?: string
          user_id: string
          vote_choice: string
          voted_at?: string
        }
        Update: {
          group_id?: string
          id?: string
          user_id?: string
          vote_choice?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_votes_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          current_members: number
          custom_theme: string | null
          group_name_changed: boolean
          id: string
          is_extended: boolean
          is_private: boolean
          lifecycle_stage: string
          max_members: number
          name: string
          next_vote_date: string | null
          vibe_label: string
          vote_active: boolean
          vote_deadline: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          current_members?: number
          custom_theme?: string | null
          group_name_changed?: boolean
          id?: string
          is_extended?: boolean
          is_private?: boolean
          lifecycle_stage?: string
          max_members?: number
          name: string
          next_vote_date?: string | null
          vibe_label: string
          vote_active?: boolean
          vote_deadline?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          current_members?: number
          custom_theme?: string | null
          group_name_changed?: boolean
          id?: string
          is_extended?: boolean
          is_private?: boolean
          lifecycle_stage?: string
          max_members?: number
          name?: string
          next_vote_date?: string | null
          vibe_label?: string
          vote_active?: boolean
          vote_deadline?: string | null
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      private_chats: {
        Row: {
          created_at: string
          id: string
          is_user1_blocked: boolean
          is_user1_favorited: boolean
          is_user1_muted: boolean
          is_user2_blocked: boolean
          is_user2_favorited: boolean
          is_user2_muted: boolean
          updated_at: string
          user1_alias: string
          user1_id: string
          user2_alias: string
          user2_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_user1_blocked?: boolean
          is_user1_favorited?: boolean
          is_user1_muted?: boolean
          is_user2_blocked?: boolean
          is_user2_favorited?: boolean
          is_user2_muted?: boolean
          updated_at?: string
          user1_alias: string
          user1_id: string
          user2_alias: string
          user2_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_user1_blocked?: boolean
          is_user1_favorited?: boolean
          is_user1_muted?: boolean
          is_user2_blocked?: boolean
          is_user2_favorited?: boolean
          is_user2_muted?: boolean
          updated_at?: string
          user1_alias?: string
          user1_id?: string
          user2_alias?: string
          user2_id?: string
        }
        Relationships: []
      }
      private_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: []
      }
      private_messages: {
        Row: {
          content: string | null
          created_at: string
          gif_url: string | null
          id: string
          message_type: string
          private_chat_id: string
          updated_at: string
          user_id: string
          voice_audio_url: string | null
          voice_transcription: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string
          gif_url?: string | null
          id?: string
          message_type: string
          private_chat_id: string
          updated_at?: string
          user_id: string
          voice_audio_url?: string | null
          voice_transcription?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string
          gif_url?: string | null
          id?: string
          message_type?: string
          private_chat_id?: string
          updated_at?: string
          user_id?: string
          voice_audio_url?: string | null
          voice_transcription?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          daily_mood: number | null
          genres: string[]
          group_id: string | null
          habits: string[]
          id: string
          last_mood_update: string | null
          mood: number
          mood_emoji: string | null
          personality: string[]
          show_mood_emoji: boolean | null
          updated_at: string
          user_id: string
          username: string
          username_changed: boolean
        }
        Insert: {
          created_at?: string
          daily_mood?: number | null
          genres?: string[]
          group_id?: string | null
          habits?: string[]
          id?: string
          last_mood_update?: string | null
          mood?: number
          mood_emoji?: string | null
          personality?: string[]
          show_mood_emoji?: boolean | null
          updated_at?: string
          user_id: string
          username: string
          username_changed?: boolean
        }
        Update: {
          created_at?: string
          daily_mood?: number | null
          genres?: string[]
          group_id?: string | null
          habits?: string[]
          id?: string
          last_mood_update?: string | null
          mood?: number
          mood_emoji?: string | null
          personality?: string[]
          show_mood_emoji?: boolean | null
          updated_at?: string
          user_id?: string
          username?: string
          username_changed?: boolean
        }
        Relationships: []
      }
      reconnection_requests: {
        Row: {
          created_at: string
          group_id: string
          id: string
          requester_id: string
          target_user_id: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          requester_id: string
          target_user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          requester_id?: string
          target_user_id?: string
        }
        Relationships: []
      }
      security_audit_log: {
        Row: {
          created_at: string | null
          event_details: Json | null
          event_type: string
          id: string
          ip_address: unknown | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_details?: Json | null
          event_type: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_details?: Json | null
          event_type?: string
          id?: string
          ip_address?: unknown | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_description: string
          achievement_title: string
          achievement_type: string
          badge_icon: string
          created_at: string
          id: string
          points: number
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_description: string
          achievement_title: string
          achievement_type: string
          badge_icon: string
          created_at?: string
          id?: string
          points?: number
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_description?: string
          achievement_title?: string
          achievement_type?: string
          badge_icon?: string
          created_at?: string
          id?: string
          points?: number
          unlocked_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_engagement: {
        Row: {
          achievement_points: number
          created_at: string
          daily_streak: number
          group_switches_used_today: number
          id: string
          is_premium: boolean
          last_active: string
          messages_sent_today: number
          reactions_given_today: number
          reconnects_used_today: number
          tools_used_today: number
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_points?: number
          created_at?: string
          daily_streak?: number
          group_switches_used_today?: number
          id?: string
          is_premium?: boolean
          last_active?: string
          messages_sent_today?: number
          reactions_given_today?: number
          reconnects_used_today?: number
          tools_used_today?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_points?: number
          created_at?: string
          daily_streak?: number
          group_switches_used_today?: number
          id?: string
          is_premium?: boolean
          last_active?: string
          messages_sent_today?: number
          reactions_given_today?: number
          reconnects_used_today?: number
          tools_used_today?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_exit_requests: {
        Row: {
          created_at: string
          exit_reason: string
          exit_window_expires: string
          group_id: string
          id: string
          is_processed: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          exit_reason?: string
          exit_window_expires: string
          group_id: string
          id?: string
          is_processed?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          exit_reason?: string
          exit_window_expires?: string
          group_id?: string
          id?: string
          is_processed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exit_requests_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_moderation_actions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          target_user_id: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          target_user_id: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          target_user_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_reports: {
        Row: {
          additional_context: string | null
          chat_type: string
          created_at: string
          id: string
          report_reason: string
          reported_message_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          additional_context?: string | null
          chat_type: string
          created_at?: string
          id?: string
          report_reason: string
          reported_message_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          additional_context?: string | null
          chat_type?: string
          created_at?: string
          id?: string
          report_reason?: string
          reported_message_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: []
      }
      user_switches: {
        Row: {
          created_at: string
          current_month_year: string
          id: string
          last_switch_date: string | null
          switches_used_this_month: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_month_year?: string
          id?: string
          last_switch_date?: string | null
          switches_used_this_month?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_month_year?: string
          id?: string
          last_switch_date?: string | null
          switches_used_this_month?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_violations: {
        Row: {
          chat_type: string
          created_at: string
          current_status: string
          id: string
          lockout_until: string | null
          message_id: string | null
          shadow_mute_until: string | null
          updated_at: string
          user_id: string
          violation_count: number
          violation_type: string
          warning_given_at: string | null
        }
        Insert: {
          chat_type: string
          created_at?: string
          current_status?: string
          id?: string
          lockout_until?: string | null
          message_id?: string | null
          shadow_mute_until?: string | null
          updated_at?: string
          user_id: string
          violation_count?: number
          violation_type: string
          warning_given_at?: string | null
        }
        Update: {
          chat_type?: string
          created_at?: string
          current_status?: string
          id?: string
          lockout_until?: string | null
          message_id?: string | null
          shadow_mute_until?: string | null
          updated_at?: string
          user_id?: string
          violation_count?: number
          violation_type?: string
          warning_given_at?: string | null
        }
        Relationships: []
      }
      username_changes: {
        Row: {
          change_month_year: string
          changed_at: string
          created_at: string
          id: string
          new_username: string
          old_username: string | null
          user_id: string
        }
        Insert: {
          change_month_year?: string
          changed_at?: string
          created_at?: string
          id?: string
          new_username: string
          old_username?: string | null
          user_id: string
        }
        Update: {
          change_month_year?: string
          changed_at?: string
          created_at?: string
          id?: string
          new_username?: string
          old_username?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
              join_group_safe: {
          Args: { p_group_id: string }
          Returns: Json
        }
      can_user_change_username: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      can_user_switch_groups: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      change_username: {
        Args: { p_user_id: string; p_new_username: string }
        Returns: boolean
      }
      check_and_award_achievements: {
        Args:
          | { p_user_id: string }
          | { p_user_id: string; p_karma_multiplier?: number }
        Returns: undefined
      }
      check_group_name_vote_result: {
        Args: { p_group_id: string; p_proposed_name: string }
        Returns: Json
      }
      check_message_security: {
        Args: { content: string }
        Returns: Json
      }
      generate_group_vibe: {
        Args: { member_personalities: string[]; member_genres: string[] }
        Returns: string
      }
      generate_unique_group_name: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_available_groups: {
        Args: { p_limit: number }
        Returns: unknown
      }
      get_group_lifecycle_stage: {
        Args: { group_created_at: string }
        Returns: string
      }
      get_mood_emoji: {
        Args: { mood_level: number }
        Returns: string
      }
      get_remaining_switches: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_switch_limit: {
        Args: { p_user_id: string }
        Returns: number
      }
      is_group_member: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
      is_user_locked_out: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      is_user_shadow_muted: {
        Args: { user_id_param: string }
        Returns: boolean
      }
      log_security_event: {
        Args: {
          p_event_type: string
          p_event_details?: Json
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: undefined
      }
      moderate_message_content: {
        Args: { content_text: string }
        Returns: boolean
      }
      needs_lifecycle_vote: {
        Args: { group_id: string }
        Returns: boolean
      }
      remove_user_from_group: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Json
      }
      update_group_member_count: {
        Args: { p_group_id: string }
        Returns: undefined
      }
      update_user_engagement: {
        Args: { p_user_id: string; p_activity_type: string }
        Returns: undefined
      }
      use_group_switch: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      user_belongs_to_group: {
        Args: { _group_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
