// Arquivo gerado por `npm run db:types`. Não edite manualmente.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      legal_acceptances: {
        Row: {
          accepted_at: string
          created_at: string
          document_version: string
          id: string
          legal_document_id: string
          source: string
          user_id: string
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          document_version: string
          id?: string
          legal_document_id: string
          source?: string
          user_id: string
        }
        Update: {
          accepted_at?: string
          created_at?: string
          document_version?: string
          id?: string
          legal_document_id?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_acceptances_document_fk"
            columns: ["legal_document_id", "document_version"]
            isOneToOne: false
            referencedRelation: "legal_documents"
            referencedColumns: ["id", "version"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content_hash: string
          content_markdown: string
          created_at: string
          document_type: string
          effective_at: string | null
          id: string
          is_required: boolean
          published_at: string | null
          retired_at: string | null
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          content_hash: string
          content_markdown: string
          created_at?: string
          document_type: string
          effective_at?: string | null
          id?: string
          is_required?: boolean
          published_at?: string | null
          retired_at?: string | null
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          content_hash?: string
          content_markdown?: string
          created_at?: string
          document_type?: string
          effective_at?: string | null
          id?: string
          is_required?: boolean
          published_at?: string | null
          retired_at?: string | null
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          created_at: string
          full_name: string
          id: string
          last_seen_at: string | null
          locale: string
          phone: string | null
          theme: string
          timezone: string
          updated_at: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          full_name: string
          id: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          account_status?: string
          created_at?: string
          full_name?: string
          id?: string
          last_seen_at?: string | null
          locale?: string
          phone?: string | null
          theme?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string
          joined_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          joined_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_settings: {
        Row: {
          accounting_basis: string
          address_city: string | null
          address_district: string | null
          address_line1: string | null
          address_line2: string | null
          address_region: string | null
          country_code: string
          created_at: string
          date_format: string
          default_alert_offsets: number[]
          general_settings: Json
          legal_name: string
          postal_code: string | null
          tax_id: string | null
          trade_name: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          accounting_basis?: string
          address_city?: string | null
          address_district?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_region?: string | null
          country_code?: string
          created_at?: string
          date_format?: string
          default_alert_offsets?: number[]
          general_settings?: Json
          legal_name: string
          postal_code?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          accounting_basis?: string
          address_city?: string | null
          address_district?: string | null
          address_line1?: string | null
          address_line2?: string | null
          address_region?: string | null
          country_code?: string
          created_at?: string
          date_format?: string
          default_alert_offsets?: number[]
          general_settings?: Json
          legal_name?: string
          postal_code?: string | null
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          archived_at: string | null
          created_at: string
          created_by: string
          currency: string
          id: string
          name: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          id?: string
          name: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          id?: string
          name?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_identity_workspace: {
        Args: {
          p_accepted_legal_document_ids: string[]
          p_accounting_basis?: string
          p_currency?: string
          p_date_format?: string
          p_default_alert_offsets?: number[]
          p_full_name: string
          p_legal_name?: string
          p_locale?: string
          p_phone?: string
          p_tax_id?: string
          p_theme?: string
          p_timezone?: string
          p_trade_name?: string
          p_workspace_name: string
        }
        Returns: {
          profile_id: string
          workspace_created: boolean
          workspace_id: string
        }[]
      }
      get_current_account_gate: {
        Args: never
        Returns: {
          account_status: string
          has_profile: boolean
          has_workspace: boolean
          workspace_status: string
        }[]
      }
      get_current_account_lifecycle_requests: {
        Args: never
        Returns: {
          artifact_expires_at: string
          completed_at: string
          request_id: string
          request_type: string
          requested_at: string
          scheduled_for: string
          status: string
          verified_at: string
        }[]
      }
      request_current_account_lifecycle: {
        Args: { p_request_type: string }
        Returns: {
          request_created: boolean
          request_id: string
          request_type: string
          requested_at: string
          status: string
        }[]
      }
      update_current_workspace_configuration: {
        Args: {
          p_accounting_basis: string
          p_address_city: string
          p_address_district: string
          p_address_line1: string
          p_address_line2: string
          p_address_region: string
          p_country_code: string
          p_date_format: string
          p_default_alert_offsets: number[]
          p_legal_name: string
          p_postal_code: string
          p_tax_id: string
          p_timezone: string
          p_trade_name: string
          p_workspace_name: string
        }
        Returns: {
          workspace_id: string
        }[]
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
