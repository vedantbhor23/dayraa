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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_locks: {
        Row: {
          auto_lock_minutes: number
          enabled: boolean
          failed_attempts: number
          locked_until: string | null
          pin_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_lock_minutes?: number
          enabled?: boolean
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_lock_minutes?: number
          enabled?: boolean
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_job_tokens: {
        Row: {
          name: string
          token: string
        }
        Insert: {
          name: string
          token?: string
        }
        Update: {
          name?: string
          token?: string
        }
        Relationships: []
      }
      item_attachments: {
        Row: {
          created_at: string
          data: Json
          id: string
          item_id: string
          kind: string
          label: string
          owner_id: string
          storage_path: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          item_id: string
          kind: string
          label?: string
          owner_id: string
          storage_path?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          item_id?: string
          kind?: string
          label?: string
          owner_id?: string
          storage_path?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_attachments_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "life_items"
            referencedColumns: ["id"]
          },
        ]
      }
      item_shares: {
        Row: {
          can_edit: boolean
          created_at: string
          grantee_id: string
          id: string
          item_id: string
          owner_id: string
          permissions: string[]
        }
        Insert: {
          can_edit?: boolean
          created_at?: string
          grantee_id: string
          id?: string
          item_id: string
          owner_id: string
          permissions?: string[]
        }
        Update: {
          can_edit?: boolean
          created_at?: string
          grantee_id?: string
          id?: string
          item_id?: string
          owner_id?: string
          permissions?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "item_shares_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "life_items"
            referencedColumns: ["id"]
          },
        ]
      }
      life_items: {
        Row: {
          body: string
          completed: boolean
          created_at: string
          deleted_at: string | null
          due_on: string | null
          id: string
          kind: string
          metadata: Json
          mood: string | null
          occurred_on: string
          owner_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          body?: string
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          due_on?: string | null
          id?: string
          kind: string
          metadata?: Json
          mood?: string | null
          occurred_on?: string
          owner_id: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          body?: string
          completed?: boolean
          created_at?: string
          deleted_at?: string | null
          due_on?: string | null
          id?: string
          kind?: string
          metadata?: Json
          mood?: string | null
          occurred_on?: string
          owner_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string
          contact_discovery: boolean
          created_at: string
          default_visibility: string
          deletion_requested_at: string | null
          discoverability: string
          display_name: string
          id: string
          profile_visibility: string
          start_page: string
          theme: string
          updated_at: string
          username: string | null
          week_start: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string
          contact_discovery?: boolean
          created_at?: string
          default_visibility?: string
          deletion_requested_at?: string | null
          discoverability?: string
          display_name?: string
          id: string
          profile_visibility?: string
          start_page?: string
          theme?: string
          updated_at?: string
          username?: string | null
          week_start?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string
          contact_discovery?: boolean
          created_at?: string
          default_visibility?: string
          deletion_requested_at?: string | null
          discoverability?: string
          display_name?: string
          id?: string
          profile_visibility?: string
          start_page?: string
          theme?: string
          updated_at?: string
          username?: string | null
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      are_connected: { Args: { _a: string; _b: string }; Returns: boolean }
      can_view_profile: { Args: { _owner: string }; Returns: boolean }
      cancel_account_deletion: { Args: never; Returns: undefined }
      disable_app_lock: { Args: { _pin: string }; Returns: undefined }
      get_app_lock: {
        Args: never
        Returns: {
          auto_lock_minutes: number
          enabled: boolean
          has_pin: boolean
        }[]
      }
      item_access: { Args: { _item: string; _perm: string }; Returns: boolean }
      my_connections: {
        Args: never
        Returns: {
          avatar_url: string
          connection_id: string
          display_name: string
          incoming: boolean
          person_id: string
          status: string
          username: string
        }[]
      }
      recently_signed_in: { Args: { _minutes?: number }; Returns: boolean }
      request_account_deletion: { Args: never; Returns: string }
      reset_app_pin_after_signin: { Args: never; Returns: undefined }
      search_people: {
        Args: { _q: string }
        Returns: {
          avatar_url: string
          display_name: string
          id: string
          username: string
        }[]
      }
      set_app_lock_minutes: { Args: { _minutes: number }; Returns: undefined }
      set_app_pin: {
        Args: { _current?: string; _pin: string }
        Returns: undefined
      }
      verify_app_pin: { Args: { _pin: string }; Returns: Json }
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
