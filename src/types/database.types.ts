// ============================================================
// Database Types — auto-derived from supabase/schema.sql
// Follows Supabase v2 codegen conventions:
//   Row | Insert | Update | Relationships per table
//   Tables + Views + Functions + Enums + CompositeTypes per schema
// ============================================================

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
      // ----------------------------------------------------------
      // COMPANIES
      // ----------------------------------------------------------
      companies: {
        Row: {
          id: string
          name: string
          owner_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database['public']['Enums']['subscription_status'] | null
          subscription_plan: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          owner_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database['public']['Enums']['subscription_status'] | null
          subscription_plan?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          owner_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database['public']['Enums']['subscription_status'] | null
          subscription_plan?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // PROFILES
      // ----------------------------------------------------------
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          company_id: string | null
          role: Database['public']['Enums']['user_role']
          invited_by: string | null
          phone_number: string | null
          created_at: string
        }
        Insert: {
          id: string                    // must match auth.users id
          email: string
          full_name?: string | null
          company_id?: string | null
          role?: Database['public']['Enums']['user_role']
          invited_by?: string | null
          phone_number?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_id?: string | null
          role?: Database['public']['Enums']['user_role']
          invited_by?: string | null
          phone_number?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // SOP CATEGORIES
      // ----------------------------------------------------------
      sop_categories: {
        Row: {
          id: string
          company_id: string
          name: string
          color: Database['public']['Enums']['category_color']
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          color?: Database['public']['Enums']['category_color']
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          color?: Database['public']['Enums']['category_color']
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // SOPs
      // ----------------------------------------------------------
      sops: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string | null
          category: string | null          // legacy free-text, kept for backward compat
          category_id: string | null       // FK → sop_categories
          created_by: string
          is_archived: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          title: string
          description?: string | null
          category?: string | null
          category_id?: string | null
          created_by: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          title?: string
          description?: string | null
          category?: string | null
          category_id?: string | null
          created_by?: string
          is_archived?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // SOP STEPS
      // ----------------------------------------------------------
      sop_steps: {
        Row: {
          id: string
          sop_id: string
          position: number
          step_type: Database['public']['Enums']['step_type']
          title: string
          content: string | null
          image_url: string | null
          video_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sop_id: string
          position: number
          step_type?: Database['public']['Enums']['step_type']
          title: string
          content?: string | null
          image_url?: string | null
          video_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sop_id?: string
          position?: number
          step_type?: Database['public']['Enums']['step_type']
          title?: string
          content?: string | null
          image_url?: string | null
          video_url?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // ASSIGNMENTS
      // ----------------------------------------------------------
      assignments: {
        Row: {
          id: string
          sop_id: string
          employee_id: string
          assigned_by: string
          due_date: string | null   // ISO date string (date column)
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          sop_id: string
          employee_id: string
          assigned_by: string
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sop_id?: string
          employee_id?: string
          assigned_by?: string
          due_date?: string | null
          completed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // STEP COMPLETIONS
      // ----------------------------------------------------------
      step_completions: {
        Row: {
          id: string
          assignment_id: string
          step_id: string
          employee_id: string
          completed_at: string
        }
        Insert: {
          id?: string
          assignment_id: string
          step_id: string
          employee_id: string
          completed_at?: string
        }
        Update: {
          id?: string
          assignment_id?: string
          step_id?: string
          employee_id?: string
          completed_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // INVITES
      // ----------------------------------------------------------
      invites: {
        Row: {
          id: string
          company_id: string
          email: string
          role: Database['public']['Enums']['invite_role']
          invited_by: string
          accepted_at: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          email: string
          role?: Database['public']['Enums']['invite_role']
          invited_by: string
          accepted_at?: string | null
          expires_at?: string         // defaults to now() + 7 days
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          email?: string
          role?: Database['public']['Enums']['invite_role']
          invited_by?: string
          accepted_at?: string | null
          expires_at?: string
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // COMPANY ROLES  (business/operational roles, not auth roles)
      // ----------------------------------------------------------
      company_roles: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          color: Database['public']['Enums']['category_color']
          minimum_certified_count: number
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          color?: Database['public']['Enums']['category_color']
          minimum_certified_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          color?: Database['public']['Enums']['category_color']
          minimum_certified_count?: number
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // ROLE SOPS  (ordered SOPs required for a role)
      // ----------------------------------------------------------
      role_sops: {
        Row: {
          role_id: string
          sop_id: string
          position: number
        }
        Insert: {
          role_id: string
          sop_id: string
          position?: number
        }
        Update: {
          role_id?: string
          sop_id?: string
          position?: number
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // EMPLOYEE ROLES  (capability state machine)
      // ----------------------------------------------------------
      employee_roles: {
        Row: {
          employee_id: string
          role_id: string
          assigned_at: string
          assigned_by: string | null
          training_completed_at: string | null
          certified_at: string | null
          certified_by: string | null
          expires_at: string | null
          role_snapshot: Json | null          // [{sop_id, position}] at certification time
          revoked_at: string | null
          revoked_by: string | null
          revocation_reason: string | null
        }
        Insert: {
          employee_id: string
          role_id: string
          assigned_at?: string
          assigned_by?: string | null
          training_completed_at?: string | null
          certified_at?: string | null
          certified_by?: string | null
          expires_at?: string | null
          role_snapshot?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          revocation_reason?: string | null
        }
        Update: {
          employee_id?: string
          role_id?: string
          assigned_at?: string
          assigned_by?: string | null
          training_completed_at?: string | null
          certified_at?: string | null
          certified_by?: string | null
          expires_at?: string | null
          role_snapshot?: Json | null
          revoked_at?: string | null
          revoked_by?: string | null
          revocation_reason?: string | null
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // SOP BUNDLES
      // ----------------------------------------------------------
      sop_bundles: {
        Row: {
          id: string
          company_id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // BUNDLE SOPS  (join table)
      // ----------------------------------------------------------
      bundle_sops: {
        Row: {
          bundle_id: string
          sop_id: string
          position: number
        }
        Insert: {
          bundle_id: string
          sop_id: string
          position?: number
        }
        Update: {
          bundle_id?: string
          sop_id?: string
          position?: number
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // NOTIFICATION_SETTINGS  (Twilio SMS per company)
      // ----------------------------------------------------------
      notification_settings: {
        Row: {
          id: string
          company_id: string
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_from_number: string | null
          notify_expiry_7d: boolean
          notify_expired: boolean
          notify_pending_48h: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_from_number?: string | null
          notify_expiry_7d?: boolean
          notify_expired?: boolean
          notify_pending_48h?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_from_number?: string | null
          notify_expiry_7d?: boolean
          notify_expired?: boolean
          notify_pending_48h?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // WEBHOOK_ENDPOINTS  (Zapier / generic outbound webhooks)
      // ----------------------------------------------------------
      webhook_endpoints: {
        Row: {
          id: string
          company_id: string
          url: string
          secret: string
          label: string | null
          events: string[]
          is_active: boolean
          last_fired_at: string | null
          last_status_code: number | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          url: string
          secret: string
          label?: string | null
          events?: string[]
          is_active?: boolean
          last_fired_at?: string | null
          last_status_code?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          url?: string
          secret?: string
          label?: string | null
          events?: string[]
          is_active?: boolean
          last_fired_at?: string | null
          last_status_code?: number | null
          created_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // INTEGRATIONS  (Gusto / Homebase / Slack OAuth tokens)
      // ----------------------------------------------------------
      integrations: {
        Row: {
          id: string
          company_id: string
          provider: 'gusto' | 'homebase' | 'slack'
          access_token: string | null
          refresh_token: string | null
          token_expires_at: string | null
          config: Record<string, unknown>
          connected_at: string | null
          last_sync_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company_id: string
          provider: 'gusto' | 'homebase' | 'slack'
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          config?: Record<string, unknown>
          connected_at?: string | null
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          provider?: 'gusto' | 'homebase' | 'slack'
          access_token?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          config?: Record<string, unknown>
          connected_at?: string | null
          last_sync_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }

      // ----------------------------------------------------------
      // NOTIFICATION_LOG  (SMS/Slack deduplication + audit)
      // ----------------------------------------------------------
      notification_log: {
        Row: {
          id: string
          company_id: string
          channel: 'sms' | 'slack'
          recipient: string
          message: string
          event_type: string
          employee_id: string | null
          role_id: string | null
          status: 'sent' | 'failed'
          error: string | null
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          channel: 'sms' | 'slack'
          recipient: string
          message: string
          event_type: string
          employee_id?: string | null
          role_id?: string | null
          status?: 'sent' | 'failed'
          error?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          channel?: 'sms' | 'slack'
          recipient?: string
          message?: string
          event_type?: string
          employee_id?: string | null
          role_id?: string | null
          status?: 'sent' | 'failed'
          error?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }

    // ----------------------------------------------------------
    // VIEWS  (Intelligence Engine)
    // ----------------------------------------------------------
    Views: {
      v_cert_status: {
        Row: {
          employee_id: string
          role_id: string
          company_id: string
          role_name: string
          role_color: string
          employee_name: string | null
          employee_email: string
          assigned_at: string
          training_completed_at: string | null
          certified_at: string | null
          certified_by: string | null
          certified_by_name: string | null
          expires_at: string | null
          role_snapshot: Json | null
          revoked_at: string | null
          revoked_by: string | null
          revocation_reason: string | null
          current_sop_ids: string[] | null
          snapshot_sop_ids: string[] | null
          is_drifted: boolean
          added_sop_ids: string[]
          removed_sop_ids: string[]
          cert_status: string   // 'in_training'|'pending_review'|'certified'|'needs_recertification'|'expired'|'revoked'
          days_until_expiry: number | null
          expiring_critical: boolean
          expiring_warning: boolean
          expiring_planning: boolean
        }
        Relationships: []
      }
      v_role_coverage: {
        Row: {
          role_id: string
          company_id: string
          role_name: string
          color: string
          description: string | null
          minimum_certified_count: number
          total_assigned: number
          certified_count: number
          pending_count: number
          in_training_count: number
          drifted_count: number
          lapsed_count: number
          expiring_7d: number
          expiring_30d: number
          expiring_60d: number
          is_spof: boolean
          below_threshold: boolean
          coverage_pct: number
        }
        Relationships: []
      }
      v_expiry_risk: {
        Row: {
          employee_id: string
          role_id: string
          company_id: string
          employee_name: string | null
          employee_email: string
          role_name: string
          role_color: string
          certified_at: string | null
          certified_by_name: string | null
          expires_at: string
          days_until_expiry: number
          expiry_window: string   // '7d' | '30d' | '60d'
          is_spof: boolean
          priority_score: number
        }
        Relationships: []
      }
      v_company_health: {
        Row: {
          coverage_score: number
          currency_score: number
          drift_score: number
          expiry_score: number
          covered_roles: number
          total_roles: number
          current_certs: number
          total_active_certs: number
          drifted_count: number
          expiring_critical_count: number
          total_certified: number
          health_score: number
          health_grade: string   // 'healthy' | 'needs_attention' | 'at_risk'
          computed_at: string
        }
        Relationships: []
      }
    }

    // ----------------------------------------------------------
    // FUNCTIONS  (RPC helpers)
    // ----------------------------------------------------------
    Functions: {
      my_company_id: {
        Args: Record<string, never>
        Returns: string
      }
      my_role: {
        Args: Record<string, never>
        Returns: string
      }
    }

    // ----------------------------------------------------------
    // ENUMS  (check constraints modelled as union types)
    // ----------------------------------------------------------
    Enums: {
      user_role: 'owner' | 'manager' | 'employee'
      invite_role: 'manager' | 'employee'
      subscription_status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid'
      category_color: 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray'
      step_type: 'instruction' | 'video' | 'acknowledgement'
    }

    // ----------------------------------------------------------
    // COMPOSITE TYPES  (none — required field for Supabase v2 generic)
    // ----------------------------------------------------------
    CompositeTypes: Record<string, never>
  }
}

// ----------------------------------------------------------
// Convenience helpers — extract Row / Insert / Update for a table
// ----------------------------------------------------------
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type TablesInsert<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']

export type Enums<T extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][T]
