export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      couple_events: {
        Row: {
          all_day: boolean
          couple_id: string
          created_at: string
          created_by: string
          end_time: string | null
          event_type: string
          id: string
          location: string | null
          notes: string | null
          owner_id: string | null
          recurrence: string
          reminder_minutes: number | null
          start_time: string | null
          starts_on: string
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          couple_id: string
          created_at?: string
          created_by: string
          end_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string | null
          recurrence?: string
          reminder_minutes?: number | null
          start_time?: string | null
          starts_on: string
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          couple_id?: string
          created_at?: string
          created_by?: string
          end_time?: string | null
          event_type?: string
          id?: string
          location?: string | null
          notes?: string | null
          owner_id?: string | null
          recurrence?: string
          reminder_minutes?: number | null
          start_time?: string | null
          starts_on?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_events_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "couple_events_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      couple_members: {
        Row: {
          couple_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          couple_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          couple_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "couple_members_couple_id_fkey"
            columns: ["couple_id"]
            isOneToOne: false
            referencedRelation: "couples"
            referencedColumns: ["id"]
          },
        ]
      }
      couples: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string | null
          started_on: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string | null
          started_on?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string | null
          started_on?: string | null
        }
        Relationships: []
      }
      cycle_days: {
        Row: {
          created_at: string
          day: string
          energy: number | null
          flow: string | null
          mood: string | null
          notes: string | null
          pain: number | null
          sleep_hours: number | null
          symptoms: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          energy?: number | null
          flow?: string | null
          mood?: string | null
          notes?: string | null
          pain?: number | null
          sleep_hours?: number | null
          symptoms?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          energy?: number | null
          flow?: string | null
          mood?: string | null
          notes?: string | null
          pain?: number | null
          sleep_hours?: number | null
          symptoms?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          birthdate: string | null
          created_at: string
          display_name: string
          id: string
          pronouns: string | null
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          birthdate?: string | null
          created_at?: string
          display_name?: string
          id: string
          pronouns?: string | null
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          birthdate?: string | null
          created_at?: string
          display_name?: string
          id?: string
          pronouns?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_locations: {
        Row: {
          accuracy: number | null
          latitude: number
          longitude: number
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          latitude: number
          longitude: number
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          latitude?: number
          longitude?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          cycle_tracking_enabled: boolean
          hidden_home_cards: string[]
          share_activity: boolean
          share_custom_status: boolean
          share_cycle_dates: boolean
          share_cycle_phase: boolean
          share_cycle_symptoms: boolean
          share_location: boolean
          share_mood: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          cycle_tracking_enabled?: boolean
          hidden_home_cards?: string[]
          share_activity?: boolean
          share_custom_status?: boolean
          share_cycle_dates?: boolean
          share_cycle_phase?: boolean
          share_cycle_symptoms?: boolean
          share_location?: boolean
          share_mood?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          cycle_tracking_enabled?: boolean
          hidden_home_cards?: string[]
          share_activity?: boolean
          share_custom_status?: boolean
          share_cycle_dates?: boolean
          share_cycle_phase?: boolean
          share_cycle_symptoms?: boolean
          share_location?: boolean
          share_mood?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_status: {
        Row: {
          activity: string | null
          custom_status: string | null
          mood: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          activity?: string | null
          custom_status?: string | null
          mood?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: string | null
          custom_status?: string | null
          mood?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_couple: { Args: never; Returns: string }
      get_partner_cycle: {
        Args: never
        Returns: {
          last_period_end: string
          last_period_start: string
          recent_mood: string
          recent_symptoms: string[]
          shares_dates: boolean
          shares_symptoms: boolean
          updated_at: string
        }[]
      }
      get_partner_location: {
        Args: never
        Returns: {
          accuracy: number
          latitude: number
          longitude: number
          updated_at: string
        }[]
      }
      get_partner_status: {
        Args: never
        Returns: {
          activity: string
          custom_status: string
          mood: string
          shares_cycle: boolean
          shares_location: boolean
          updated_at: string
        }[]
      }
      is_partner: { Args: { _other: string }; Returns: boolean }
      join_couple: { Args: { _code: string }; Returns: string }
      leave_couple: { Args: never; Returns: undefined }
      my_couple_id: { Args: never; Returns: string }
      preview_invite: { Args: { _code: string }; Returns: string }
      set_couple_start: { Args: { _date: string }; Returns: undefined }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
