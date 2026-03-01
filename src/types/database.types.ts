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
          created_at: string
        }
        Insert: {
          id: string                    // must match auth.users id
          email: string
          full_name?: string | null
          company_id?: string | null
          role?: Database['public']['Enums']['user_role']
          invited_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          company_id?: string | null
          role?: Database['public']['Enums']['user_role']
          invited_by?: string | null
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
          created_at: string
        }
        Insert: {
          id?: string
          company_id: string
          name: string
          description?: string | null
          color?: Database['public']['Enums']['category_color']
          created_at?: string
        }
        Update: {
          id?: string
          company_id?: string
          name?: string
          description?: string | null
          color?: Database['public']['Enums']['category_color']
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
    }

    // ----------------------------------------------------------
    // VIEWS  (none — required field for Supabase v2 generic)
    // ----------------------------------------------------------
    Views: Record<string, never>

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
