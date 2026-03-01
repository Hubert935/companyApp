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
export type CategoryColor      = Enums<'category_color'>      // 'blue' | 'green' | 'orange' | 'purple' | 'red' | 'gray'
export type StepType           = Enums<'step_type'>           // 'instruction' | 'video' | 'acknowledgement'

// ----------------------------------------------------------
// Row types  (what you get back from SELECT *)
// ----------------------------------------------------------
export type Company        = Tables<'companies'>
export type Profile        = Tables<'profiles'>
export type SOPCategory    = Tables<'sop_categories'>
export type SOP            = Tables<'sops'>
export type SOPStep        = Tables<'sop_steps'>
export type Assignment     = Tables<'assignments'>
export type StepCompletion = Tables<'step_completions'>
export type Invite         = Tables<'invites'>
export type SOPBundle      = Tables<'sop_bundles'>
export type BundleSOP      = Tables<'bundle_sops'>
export type CompanyRole    = Tables<'company_roles'>
export type RoleSOP        = Tables<'role_sops'>
export type EmployeeRole   = Tables<'employee_roles'>

// ----------------------------------------------------------
// Insert types  (shape expected by INSERT)
// ----------------------------------------------------------
export type NewCompany        = TablesInsert<'companies'>
export type NewProfile        = TablesInsert<'profiles'>
export type NewSOPCategory    = TablesInsert<'sop_categories'>
export type NewSOP            = TablesInsert<'sops'>
export type NewSOPStep        = TablesInsert<'sop_steps'>
export type NewAssignment     = TablesInsert<'assignments'>
export type NewStepCompletion = TablesInsert<'step_completions'>
export type NewInvite         = TablesInsert<'invites'>
export type NewSOPBundle      = TablesInsert<'sop_bundles'>
export type NewBundleSOP      = TablesInsert<'bundle_sops'>
export type NewCompanyRole    = TablesInsert<'company_roles'>
export type NewRoleSOP        = TablesInsert<'role_sops'>
export type NewEmployeeRole   = TablesInsert<'employee_roles'>

// ----------------------------------------------------------
// Update types  (all fields optional, used by UPDATE)
// ----------------------------------------------------------
export type UpdateCompany        = TablesUpdate<'companies'>
export type UpdateProfile        = TablesUpdate<'profiles'>
export type UpdateSOPCategory    = TablesUpdate<'sop_categories'>
export type UpdateSOP            = TablesUpdate<'sops'>
export type UpdateSOPStep        = TablesUpdate<'sop_steps'>
export type UpdateAssignment     = TablesUpdate<'assignments'>
export type UpdateStepCompletion = TablesUpdate<'step_completions'>
export type UpdateInvite         = TablesUpdate<'invites'>
export type UpdateSOPBundle      = TablesUpdate<'sop_bundles'>
export type UpdateBundleSOP      = TablesUpdate<'bundle_sops'>
export type UpdateCompanyRole    = TablesUpdate<'company_roles'>
export type UpdateRoleSOP        = TablesUpdate<'role_sops'>
export type UpdateEmployeeRole   = TablesUpdate<'employee_roles'>

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

/** Bundle with its ordered SOP IDs */
export interface BundleWithSOPIds extends SOPBundle {
  bundle_sops: { sop_id: string; position: number }[]
}

/** Bundle with full SOP details eagerly joined */
export interface BundleWithSOPs extends SOPBundle {
  bundle_sops: (BundleSOP & { sop: Pick<SOP, 'id' | 'title' | 'description'> })[]
}

// ----------------------------------------------------------
// Capability Engine — Roles + Certification
// ----------------------------------------------------------

/** Certification status derived from event columns on employee_roles.
 *  Never stored — always computed on read. */
export type CertStatus =
  | 'in_training'          // role assigned, training not yet complete
  | 'pending_review'       // training complete, awaiting manager approval
  | 'certified'            // manager-approved, not expired, snapshot matches current role
  | 'needs_recertification'// role SOPs changed since certification was granted
  | 'expired'              // certified_at set but expires_at is in the past
  | 'revoked'              // explicitly revoked by a manager

/** Pure function — derives certification status from event columns.
 *  @param er           The employee_roles row
 *  @param currentSopIds The current sop_ids from role_sops for this role
 */
export function getCertStatus(
  er: Pick<
    EmployeeRole,
    | 'revoked_at'
    | 'certified_at'
    | 'expires_at'
    | 'role_snapshot'
    | 'training_completed_at'
  >,
  currentSopIds: string[]
): CertStatus {
  if (er.revoked_at) return 'revoked'

  if (er.certified_at) {
    if (er.expires_at && new Date(er.expires_at) < new Date()) return 'expired'

    const snapshot = (er.role_snapshot as { sop_id: string }[] | null) ?? []
    const snapshotKey = snapshot.map((s) => s.sop_id).sort().join(',')
    const currentKey  = [...currentSopIds].sort().join(',')
    if (snapshotKey !== currentKey) return 'needs_recertification'

    return 'certified'
  }

  if (er.training_completed_at) return 'pending_review'
  return 'in_training'
}

/** Role with its ordered SOP ids (for list/picker views) */
export interface RoleWithSOPIds extends CompanyRole {
  role_sops: { sop_id: string; position: number }[]
}

/** Role with full SOP details (for editor) */
export interface RoleWithSOPs extends CompanyRole {
  role_sops: (RoleSOP & { sop: Pick<SOP, 'id' | 'title' | 'description'> })[]
}

/** EmployeeRole enriched with the role object and certification status */
export interface EmployeeRoleWithStatus extends EmployeeRole {
  company_role: CompanyRole
  status: CertStatus
}
