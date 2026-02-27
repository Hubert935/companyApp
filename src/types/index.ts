// ============================================================
// App-level types — all derived from database.types.ts
// Import from here, not from database.types.ts directly
// ============================================================

import type { Database, Tables, TablesInsert, TablesUpdate, Enums } from './database.types'

// Re-export helpers so callers can use them without touching database.types.ts
export type { Database, Tables, TablesInsert, TablesUpdate, Enums }

// ----------------------------------------------------------
// Enum types
// ----------------------------------------------------------
export type UserRole           = Enums<'user_role'>           // 'owner' | 'manager' | 'employee'
export type InviteRole         = Enums<'invite_role'>         // 'manager' | 'employee'
export type SubscriptionStatus = Enums<'subscription_status'> // 'trialing' | 'active' | ...

// ----------------------------------------------------------
// Row types  (what you get back from SELECT *)
// ----------------------------------------------------------
export type Company        = Tables<'companies'>
export type Profile        = Tables<'profiles'>
export type SOP            = Tables<'sops'>
export type SOPStep        = Tables<'sop_steps'>
export type Assignment     = Tables<'assignments'>
export type StepCompletion = Tables<'step_completions'>
export type Invite         = Tables<'invites'>

// ----------------------------------------------------------
// Insert types  (shape expected by INSERT)
// ----------------------------------------------------------
export type NewCompany        = TablesInsert<'companies'>
export type NewProfile        = TablesInsert<'profiles'>
export type NewSOP            = TablesInsert<'sops'>
export type NewSOPStep        = TablesInsert<'sop_steps'>
export type NewAssignment     = TablesInsert<'assignments'>
export type NewStepCompletion = TablesInsert<'step_completions'>
export type NewInvite         = TablesInsert<'invites'>

// ----------------------------------------------------------
// Update types  (all fields optional, used by UPDATE)
// ----------------------------------------------------------
export type UpdateCompany        = TablesUpdate<'companies'>
export type UpdateProfile        = TablesUpdate<'profiles'>
export type UpdateSOP            = TablesUpdate<'sops'>
export type UpdateSOPStep        = TablesUpdate<'sop_steps'>
export type UpdateAssignment     = TablesUpdate<'assignments'>
export type UpdateStepCompletion = TablesUpdate<'step_completions'>
export type UpdateInvite         = TablesUpdate<'invites'>

// ----------------------------------------------------------
// Composite / joined types
// Represent what Supabase returns when you join related tables
// ----------------------------------------------------------

/** SOP with its ordered steps eagerly joined */
export interface SOPWithSteps extends SOP {
  steps: SOPStep[]
}

/** Assignment joined with SOP + steps — used on the onboarding / training page */
export interface AssignmentWithSOP extends Assignment {
  sop: SOP & { steps: SOPStep[] }
}

/** Assignment joined with SOP title + employee name — used on dashboard recent list */
export interface AssignmentWithDetails extends Assignment {
  sop:      Pick<SOP, 'id' | 'title'>
  employee: Pick<Profile, 'id' | 'full_name' | 'email'>
}

/** SOP augmented with progress stats computed from assignments/completions */
export interface SOPWithProgress extends SOP {
  assignment_id:   string
  total_steps:     number
  completed_steps: number
  completed_at:    string | null
  due_date:        string | null
}

/** Profile with aggregated assignment counts — useful for manager views */
export interface ProfileWithProgress extends Profile {
  total_assignments:     number
  completed_assignments: number
}
