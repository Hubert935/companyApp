import type {
  Company, Profile, SOP, SOPStep,
  Assignment, StepCompletion, Invite,
} from '@/types'

// ─── Stable mock IDs ────────────────────────────────────────────────────────
export const MOCK_COMPANY_ID = 'c0000000-0000-0000-0000-000000000001'
export const MOCK_OWNER_ID   = 'u0000000-0000-0000-0000-000000000001'
export const MOCK_MGR_ID     = 'u0000000-0000-0000-0000-000000000002'
export const MOCK_EMP1_ID    = 'u0000000-0000-0000-0000-000000000003'
export const MOCK_EMP2_ID    = 'u0000000-0000-0000-0000-000000000004'

const SOP1_ID = 's0000000-0000-0000-0000-000000000001'
const SOP2_ID = 's0000000-0000-0000-0000-000000000002'
const SOP3_ID = 's0000000-0000-0000-0000-000000000003'

const S1_1 = 'st00000000-0000-0000-0000-000000000011'
const S1_2 = 'st00000000-0000-0000-0000-000000000012'
const S1_3 = 'st00000000-0000-0000-0000-000000000013'
const S2_1 = 'st00000000-0000-0000-0000-000000000021'
const S2_2 = 'st00000000-0000-0000-0000-000000000022'
const S3_1 = 'st00000000-0000-0000-0000-000000000031'
const S3_2 = 'st00000000-0000-0000-0000-000000000032'
const S3_3 = 'st00000000-0000-0000-0000-000000000033'
const S3_4 = 'st00000000-0000-0000-0000-000000000034'

const ASS1_ID = 'a0000000-0000-0000-0000-000000000001'
const ASS2_ID = 'a0000000-0000-0000-0000-000000000002'
const ASS3_ID = 'a0000000-0000-0000-0000-000000000003'
const ASS4_ID = 'a0000000-0000-0000-0000-000000000004'
const ASS5_ID = 'a0000000-0000-0000-0000-000000000005'

// ─── Tables ──────────────────────────────────────────────────────────────────

export const companies: Company[] = [
  {
    id: MOCK_COMPANY_ID,
    name: 'Acme Cleaning Co.',
    owner_id: MOCK_OWNER_ID,
    stripe_customer_id: null,
    stripe_subscription_id: null,
    subscription_status: 'trialing',
    subscription_plan: 'starter',
    created_at: '2024-01-01T00:00:00Z',
  },
]

export const profiles: Profile[] = [
  {
    id: MOCK_OWNER_ID,
    email: 'owner@demo.com',
    full_name: 'Jane Smith',
    company_id: MOCK_COMPANY_ID,
    role: 'owner',
    invited_by: null,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: MOCK_MGR_ID,
    email: 'carlos@demo.com',
    full_name: 'Carlos Rivera',
    company_id: MOCK_COMPANY_ID,
    role: 'manager',
    invited_by: MOCK_OWNER_ID,
    created_at: '2024-01-05T00:00:00Z',
  },
  {
    id: MOCK_EMP1_ID,
    email: 'priya@demo.com',
    full_name: 'Priya Patel',
    company_id: MOCK_COMPANY_ID,
    role: 'employee',
    invited_by: MOCK_OWNER_ID,
    created_at: '2024-01-10T00:00:00Z',
  },
  {
    id: MOCK_EMP2_ID,
    email: 'tom@demo.com',
    full_name: 'Tom Wu',
    company_id: MOCK_COMPANY_ID,
    role: 'employee',
    invited_by: MOCK_MGR_ID,
    created_at: '2024-01-15T00:00:00Z',
  },
]

const sopSteps: SOPStep[] = [
  // SOP 1 – Opening Procedure
  { id: S1_1, sop_id: SOP1_ID, position: 1, title: 'Unlock and disarm alarm', content: 'Use the key code 1234* to disarm the alarm panel by the front door. You have 30 seconds once the door opens.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },
  { id: S1_2, sop_id: SOP1_ID, position: 2, title: 'Turn on all lights', content: 'Work from the front of the building to the back. All light switches are on the left side of each doorway.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },
  { id: S1_3, sop_id: SOP1_ID, position: 3, title: 'Check supply inventory', content: 'Open the supply closet and check that cleaning solutions, mops, and gloves are stocked. Reorder if any item is below 20% capacity.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },

  // SOP 2 – Deep Clean Bathroom
  { id: S2_1, sop_id: SOP2_ID, position: 1, title: 'Apply toilet bowl cleaner', content: 'Squirt toilet bowl cleaner under the rim and let sit for at least 5 minutes before scrubbing.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },
  { id: S2_2, sop_id: SOP2_ID, position: 2, title: 'Wipe all surfaces with disinfectant', content: 'Use a fresh microfibre cloth with blue disinfectant spray. Wipe sink, countertop, door handle, and light switch.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },

  // SOP 3 – New Employee Safety Orientation
  { id: S3_1, sop_id: SOP3_ID, position: 1, title: 'Review WHMIS chemical labels', content: 'All cleaning products are labeled with WHMIS symbols. Learn what each symbol means before handling any chemical.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },
  { id: S3_2, sop_id: SOP3_ID, position: 2, title: 'Locate all emergency exits', content: 'Walk the full building and identify every exit. There are 3 exits: front door, back loading dock, and side fire exit.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },
  { id: S3_3, sop_id: SOP3_ID, position: 3, title: 'Sign the safety acknowledgement form', content: 'Complete and sign the paper form in the binder at the front desk. Hand it to your manager.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },
  { id: S3_4, sop_id: SOP3_ID, position: 4, title: 'Wear PPE at all times', content: 'Gloves and non-slip shoes are required when on site. Safety goggles are required when mixing chemicals.', image_url: null, video_url: null, created_at: '2024-01-01T00:00:00Z' },
]

export const sops: SOP[] = [
  {
    id: SOP1_ID,
    company_id: MOCK_COMPANY_ID,
    title: 'Opening Procedure',
    description: 'Steps to open and prepare the facility each morning.',
    category: 'Opening',
    created_by: MOCK_OWNER_ID,
    is_archived: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-20T00:00:00Z',
  },
  {
    id: SOP2_ID,
    company_id: MOCK_COMPANY_ID,
    title: 'Deep Clean Bathroom',
    description: 'Full bathroom deep-clean process to be done weekly.',
    category: 'Cleaning',
    created_by: MOCK_OWNER_ID,
    is_archived: false,
    created_at: '2024-01-02T00:00:00Z',
    updated_at: '2024-01-21T00:00:00Z',
  },
  {
    id: SOP3_ID,
    company_id: MOCK_COMPANY_ID,
    title: 'New Employee Safety Orientation',
    description: 'Required safety training every new hire must complete on their first day.',
    category: 'Safety',
    created_by: MOCK_OWNER_ID,
    is_archived: false,
    created_at: '2024-01-03T00:00:00Z',
    updated_at: '2024-01-22T00:00:00Z',
  },
]

export const sop_steps: SOPStep[] = sopSteps

/** SOPs with their steps attached — used for queries that join sop_steps */
export const sopsWithSteps = sops.map((sop) => ({
  ...sop,
  steps: sopSteps.filter((s) => s.sop_id === sop.id),
}))

// Assignments — owner gets some too so /onboarding has content
export const assignments: Assignment[] = [
  // Priya: SOP1 complete, SOP3 in progress
  { id: ASS1_ID, sop_id: SOP1_ID, employee_id: MOCK_EMP1_ID, assigned_by: MOCK_OWNER_ID, due_date: null,           completed_at: '2024-02-01T00:00:00Z', created_at: '2024-01-15T00:00:00Z' },
  { id: ASS2_ID, sop_id: SOP3_ID, employee_id: MOCK_EMP1_ID, assigned_by: MOCK_OWNER_ID, due_date: '2024-03-01',   completed_at: null,                   created_at: '2024-01-16T00:00:00Z' },
  // Tom: SOP3 complete
  { id: ASS3_ID, sop_id: SOP3_ID, employee_id: MOCK_EMP2_ID, assigned_by: MOCK_MGR_ID,   due_date: null,           completed_at: '2024-02-05T00:00:00Z', created_at: '2024-01-20T00:00:00Z' },
  { id: ASS4_ID, sop_id: SOP2_ID, employee_id: MOCK_EMP2_ID, assigned_by: MOCK_MGR_ID,   due_date: '2024-03-15',   completed_at: null,                   created_at: '2024-01-21T00:00:00Z' },
  // Owner — shown on /onboarding for demo
  { id: ASS5_ID, sop_id: SOP3_ID, employee_id: MOCK_OWNER_ID, assigned_by: MOCK_OWNER_ID, due_date: null,          completed_at: null,                   created_at: '2024-01-10T00:00:00Z' },
]

export const step_completions: StepCompletion[] = [
  // Priya completed all steps of SOP1 (ASS1)
  { id: 'sc01', assignment_id: ASS1_ID, step_id: S1_1, employee_id: MOCK_EMP1_ID, completed_at: '2024-02-01T00:00:00Z' },
  { id: 'sc02', assignment_id: ASS1_ID, step_id: S1_2, employee_id: MOCK_EMP1_ID, completed_at: '2024-02-01T00:00:00Z' },
  { id: 'sc03', assignment_id: ASS1_ID, step_id: S1_3, employee_id: MOCK_EMP1_ID, completed_at: '2024-02-01T00:00:00Z' },
  // Priya completed step 1 of SOP3 (ASS2)
  { id: 'sc04', assignment_id: ASS2_ID, step_id: S3_1, employee_id: MOCK_EMP1_ID, completed_at: '2024-02-02T00:00:00Z' },
  // Tom completed all steps of SOP3 (ASS3)
  { id: 'sc05', assignment_id: ASS3_ID, step_id: S3_1, employee_id: MOCK_EMP2_ID, completed_at: '2024-02-05T00:00:00Z' },
  { id: 'sc06', assignment_id: ASS3_ID, step_id: S3_2, employee_id: MOCK_EMP2_ID, completed_at: '2024-02-05T00:00:00Z' },
  { id: 'sc07', assignment_id: ASS3_ID, step_id: S3_3, employee_id: MOCK_EMP2_ID, completed_at: '2024-02-05T00:00:00Z' },
  { id: 'sc08', assignment_id: ASS3_ID, step_id: S3_4, employee_id: MOCK_EMP2_ID, completed_at: '2024-02-05T00:00:00Z' },
  // Owner: completed 2 steps of SOP3 (ASS5)
  { id: 'sc09', assignment_id: ASS5_ID, step_id: S3_1, employee_id: MOCK_OWNER_ID, completed_at: '2024-02-10T00:00:00Z' },
  { id: 'sc10', assignment_id: ASS5_ID, step_id: S3_2, employee_id: MOCK_OWNER_ID, completed_at: '2024-02-10T00:00:00Z' },
]

export const invites: Invite[] = []

// ─── Lookup table used by the mock query builder ──────────────────────────────
type MockTableName = 'companies' | 'profiles' | 'sops' | 'sop_steps' | 'assignments' | 'step_completions' | 'invites'

export const ALL_MOCK_DATA: Record<MockTableName, unknown[]> = {
  companies,
  profiles,
  sops,
  sop_steps,
  assignments,
  step_completions,
  invites,
}
