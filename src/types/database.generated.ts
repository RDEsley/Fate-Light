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
      audit_events: {
        Row: {
          action: string
          actor_user_id: string
          after_json: Json | null
          before_json: Json | null
          changed_fields: string[]
          correlation_id: string
          entity_id: string
          entity_type: string
          id: string
          occurred_at: string
          reason: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          after_json?: Json | null
          before_json?: Json | null
          changed_fields: string[]
          correlation_id?: string
          entity_id: string
          entity_type: string
          id?: string
          occurred_at?: string
          reason?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          after_json?: Json | null
          before_json?: Json | null
          changed_fields?: string[]
          correlation_id?: string
          entity_id?: string
          entity_type?: string
          id?: string
          occurred_at?: string
          reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          additional_fee: number
          client_id: string
          client_service_id: string | null
          company_revenue: number
          created_at: string
          created_by: string
          description: string
          due_date: string
          gross_total: number | null
          id: string
          media_budget: number
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          additional_fee?: number
          client_id: string
          client_service_id?: string | null
          company_revenue?: number
          created_at?: string
          created_by?: string
          description: string
          due_date: string
          gross_total?: number | null
          id?: string
          media_budget?: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          additional_fee?: number
          client_id?: string
          client_service_id?: string | null
          company_revenue?: number
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          gross_total?: number | null
          id?: string
          media_budget?: number
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_client_fk"
            columns: ["workspace_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "charges_service_fk"
            columns: ["workspace_id", "client_id", "client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["workspace_id", "client_id", "id"]
          },
          {
            foreignKeyName: "charges_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_contacts: {
        Row: {
          archived_at: string | null
          client_id: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          is_primary: boolean
          name: string
          phone: string | null
          role: string | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          client_id: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          is_primary?: boolean
          name?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_contacts_client_fk"
            columns: ["workspace_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "client_contacts_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      client_services: {
        Row: {
          additional_fee: number
          billing_type: string
          client_id: string
          company_revenue: number
          created_at: string
          created_by: string
          description: string | null
          id: string
          media_budget: number
          name: string
          next_due_date: string | null
          notes: string | null
          start_date: string
          status: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          additional_fee?: number
          billing_type?: string
          client_id: string
          company_revenue?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          media_budget?: number
          name: string
          next_due_date?: string | null
          notes?: string | null
          start_date: string
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          additional_fee?: number
          billing_type?: string
          client_id?: string
          company_revenue?: number
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          media_budget?: number
          name?: string
          next_due_date?: string | null
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_services_client_fk"
            columns: ["workspace_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "client_services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_json: Json | null
          archived_at: string | null
          commercial_status: string
          created_at: string
          created_by: string
          email: string | null
          id: string
          kind: string
          name: string
          notes: string | null
          phone: string | null
          responsible_name: string | null
          tags: string[]
          tax_id: string | null
          trade_name: string | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          address_json?: Json | null
          archived_at?: string | null
          commercial_status?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          kind: string
          name: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          tags?: string[]
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          address_json?: Json | null
          archived_at?: string | null
          commercial_status?: string
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          kind?: string
          name?: string
          notes?: string | null
          phone?: string | null
          responsible_name?: string | null
          tags?: string[]
          tax_id?: string | null
          trade_name?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          auto_renew: boolean
          client_id: string
          cost: number | null
          created_at: string
          created_by: string
          domain: string
          expires_on: string
          id: string
          notes: string | null
          payment_responsibility: string
          registrar: string | null
          status: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          auto_renew?: boolean
          client_id: string
          cost?: number | null
          created_at?: string
          created_by?: string
          domain: string
          expires_on: string
          id?: string
          notes?: string | null
          payment_responsibility: string
          registrar?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          auto_renew?: boolean
          client_id?: string
          cost?: number | null
          created_at?: string
          created_by?: string
          domain?: string
          expires_on?: string
          id?: string
          notes?: string | null
          payment_responsibility?: string
          registrar?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "domains_client_fk"
            columns: ["workspace_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "domains_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          active: boolean
          archived_at: string | null
          color: string | null
          created_at: string
          created_by: string
          default_nature: string
          id: string
          name: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          default_nature?: string
          id?: string
          name: string
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          color?: string | null
          created_at?: string
          created_by?: string
          default_nature?: string
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_categories_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          client_id: string | null
          created_at: string
          created_by: string
          description: string
          due_date: string
          expense_type: string
          id: string
          notes: string | null
          paid_at: string | null
          status: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          amount: number
          category: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          description: string
          due_date: string
          expense_type: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          amount?: number
          category?: string
          client_id?: string | null
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string
          expense_type?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          status?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_client_fk"
            columns: ["workspace_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "expenses_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
      services: {
        Row: {
          active: boolean
          archived_at: string | null
          created_at: string
          created_by: string
          default_component_kind: string
          default_financial_nature: string
          description: string | null
          id: string
          name: string
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: string
          default_component_kind?: string
          default_financial_nature?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          archived_at?: string | null
          created_at?: string
          created_by?: string
          default_component_kind?: string
          default_financial_nature?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          archived_at: string | null
          contact_json: Json | null
          created_at: string
          created_by: string
          id: string
          name: string
          notes: string | null
          tax_id: string | null
          updated_at: string
          updated_by: string
          workspace_id: string
        }
        Insert: {
          archived_at?: string | null
          contact_json?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          name: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id: string
        }
        Update: {
          archived_at?: string | null
          contact_json?: Json | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          notes?: string | null
          tax_id?: string | null
          updated_at?: string
          updated_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      charges_overview: {
        Row: {
          additional_fee: number | null
          client_id: string | null
          client_service_id: string | null
          company_result_value: number | null
          company_revenue: number | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          effective_status: string | null
          gross_total: number | null
          id: string | null
          media_budget: number | null
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          status: string | null
          updated_at: string | null
          updated_by: string | null
          workspace_id: string | null
        }
        Insert: {
          additional_fee?: number | null
          client_id?: string | null
          client_service_id?: string | null
          company_result_value?: never
          company_revenue?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          effective_status?: never
          gross_total?: number | null
          id?: string | null
          media_budget?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Update: {
          additional_fee?: number | null
          client_id?: string | null
          client_service_id?: string | null
          company_result_value?: never
          company_revenue?: number | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          effective_status?: never
          gross_total?: number | null
          id?: string | null
          media_budget?: number | null
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "charges_client_fk"
            columns: ["workspace_id", "client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["workspace_id", "id"]
          },
          {
            foreignKeyName: "charges_service_fk"
            columns: ["workspace_id", "client_id", "client_service_id"]
            isOneToOne: false
            referencedRelation: "client_services"
            referencedColumns: ["workspace_id", "client_id", "id"]
          },
          {
            foreignKeyName: "charges_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
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
