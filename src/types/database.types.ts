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
      // SOPs
      // ----------------------------------------------------------
      sops: {
        Row: {
          id: string
          company_id: string
          title: string
          description: string | null
          category: string | null
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
