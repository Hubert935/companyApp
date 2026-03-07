// ============================================================
// Intelligence Engine Types
// Correspond to the 4 SQL views: v_cert_status, v_role_coverage,
// v_expiry_risk, v_company_health
// ============================================================

import type { CertStatus } from './index'

// ----------------------------------------------------------
// v_company_health — single-row weighted operational health score
// ----------------------------------------------------------
export interface CompanyHealthRow {
  // Component scores (0.0–1.0)
  coverage_score: number          // covered_roles / total_roles
  currency_score: number          // non-drifted certs / total active certs
  drift_score: number             // 1 − (drifted / certified_or_drifted)
  expiry_score: number            // 1 − (critical_7d / total_certified)
  // Raw counts for component bar descriptions
  covered_roles: number
  total_roles: number
  current_certs: number
  total_active_certs: number
  drifted_count: number
  expiring_critical_count: number
  total_certified: number
  // Composite score (0–100) and grade
  health_score: number
  health_grade: 'healthy' | 'needs_attention' | 'at_risk'
  computed_at: string
}

// ----------------------------------------------------------
// v_role_coverage — per-role aggregated coverage metrics
// ----------------------------------------------------------
export interface RoleCoverageRow {
  role_id: string
  company_id: string
  role_name: string
  color: string
  description: string | null
  minimum_certified_count: number
  // Status counts
  total_assigned: number
  certified_count: number
  pending_count: number
  in_training_count: number
  drifted_count: number
  lapsed_count: number
  // Expiry window counts (certified employees only)
  expiring_7d: number
  expiring_30d: number
  expiring_60d: number
  // Risk flags
  is_spof: boolean          // exactly 1 certified employee
  below_threshold: boolean  // certified_count < minimum_certified_count
  coverage_pct: number      // 0–100, capped at 100
}

// ----------------------------------------------------------
// v_expiry_risk — certifications expiring in next 60 days
// ----------------------------------------------------------
export interface ExpiryRiskRow {
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
  expiry_window: '7d' | '30d' | '60d'
  is_spof: boolean          // only certified person for this role
  priority_score: number    // 1–6; higher = more urgent
}

// ----------------------------------------------------------
// v_cert_status — per (employee_id, role_id) full cert state
// ----------------------------------------------------------
export interface CertStatusRow {
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
  role_snapshot: unknown | null
  revoked_at: string | null
  revoked_by: string | null
  revocation_reason: string | null
  current_sop_ids: string[] | null
  snapshot_sop_ids: string[] | null
  is_drifted: boolean
  added_sop_ids: string[]    // SOPs added to role since certification
  removed_sop_ids: string[]  // SOPs removed from role since certification
  cert_status: CertStatus
  days_until_expiry: number | null
  expiring_critical: boolean
  expiring_warning: boolean
  expiring_planning: boolean
}
