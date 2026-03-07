-- ============================================================
-- SOP & Training System — Database Schema
-- Run this in Supabase SQL Editor to bootstrap the database
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- COMPANIES
-- One company per workspace. Owner creates it on signup.
-- ============================================================
create table public.companies (
  id                      uuid primary key default uuid_generate_v4(),
  name                    text not null,
  owner_id                uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  subscription_status     text check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'unpaid')),
  subscription_plan       text,
  created_at              timestamptz not null default now()
);

-- ============================================================
-- PROFILES
-- Extends auth.users. Created via trigger on user signup.
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  company_id  uuid references public.companies(id) on delete set null,
  role        text not null default 'employee' check (role in ('owner', 'manager', 'employee')),
  invited_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- SOP CATEGORIES
-- Structured taxonomy for organising SOPs within a company.
-- Companies define their own categories (e.g. Opening, Safety, HR).
-- ============================================================
create table public.sop_categories (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  color       text not null default 'blue'
                check (color in ('blue','green','orange','purple','red','gray')),
  created_at  timestamptz not null default now(),
  unique (company_id, name)
);

-- ============================================================
-- SOPs
-- Standard Operating Procedures, owned by a company
-- ============================================================
create table public.sops (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  title       text not null,
  description text,
  category    text,                    -- legacy free-text, kept for backward compat
  category_id uuid references public.sop_categories(id) on delete set null,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- SOP STEPS
-- Ordered steps within an SOP
-- ============================================================
create table public.sop_steps (
  id          uuid primary key default uuid_generate_v4(),
  sop_id      uuid not null references public.sops(id) on delete cascade,
  position    integer not null,
  step_type   text not null default 'instruction'
                check (step_type in ('instruction', 'video', 'acknowledgement')),
  title       text not null,
  content     text,
  image_url   text,
  video_url   text,
  created_at  timestamptz not null default now(),
  unique (sop_id, position)
);

-- ============================================================
-- ASSIGNMENTS
-- An SOP assigned to an employee
-- ============================================================
create table public.assignments (
  id            uuid primary key default uuid_generate_v4(),
  sop_id        uuid not null references public.sops(id) on delete cascade,
  employee_id   uuid not null references public.profiles(id) on delete cascade,
  assigned_by   uuid not null references public.profiles(id) on delete cascade,
  due_date      date,
  completed_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (sop_id, employee_id)
);

-- ============================================================
-- STEP COMPLETIONS
-- Tracks which steps an employee has completed
-- ============================================================
create table public.step_completions (
  id              uuid primary key default uuid_generate_v4(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  step_id         uuid not null references public.sop_steps(id) on delete cascade,
  employee_id     uuid not null references public.profiles(id) on delete cascade,
  completed_at    timestamptz not null default now(),
  unique (assignment_id, step_id)
);

-- ============================================================
-- INVITES
-- Magic-link style invites for employees
-- ============================================================
create table public.invites (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  email       text not null,
  role        text not null default 'employee' check (role in ('manager', 'employee')),
  invited_by  uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  created_at  timestamptz not null default now(),
  unique (company_id, email)
);

-- ============================================================
-- SOP BUNDLES
-- Named groups of SOPs for bulk assignment (e.g. "New Hire Onboarding")
-- ============================================================
create table public.sop_bundles (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- BUNDLE SOPS  (join table)
-- Maps SOPs into bundles with a position for ordering
-- ============================================================
create table public.bundle_sops (
  bundle_id  uuid not null references public.sop_bundles(id) on delete cascade,
  sop_id     uuid not null references public.sops(id) on delete cascade,
  position   integer not null default 0,
  primary key (bundle_id, sop_id)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at on SOPs
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sops_updated_at
  before update on public.sops
  for each row execute procedure public.handle_updated_at();

-- Auto-mark assignment complete when all steps done
create or replace function public.check_assignment_completion()
returns trigger
language plpgsql
security definer
as $$
declare
  total_steps   integer;
  done_steps    integer;
begin
  select count(*) into total_steps
  from public.sop_steps ss
  join public.assignments a on a.id = new.assignment_id
  where ss.sop_id = a.sop_id;

  select count(*) into done_steps
  from public.step_completions
  where assignment_id = new.assignment_id;

  if done_steps >= total_steps then
    update public.assignments
    set completed_at = now()
    where id = new.assignment_id and completed_at is null;
  end if;

  return new;
end;
$$;

create trigger on_step_completed
  after insert on public.step_completions
  for each row execute procedure public.check_assignment_completion();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.companies        enable row level security;
alter table public.profiles         enable row level security;
alter table public.sop_categories   enable row level security;
alter table public.sops             enable row level security;
alter table public.sop_steps        enable row level security;
alter table public.assignments      enable row level security;
alter table public.step_completions enable row level security;
alter table public.invites          enable row level security;
alter table public.sop_bundles      enable row level security;
alter table public.bundle_sops      enable row level security;

-- Helper: get current user's company_id
create or replace function public.my_company_id()
returns uuid
language sql stable
security definer
as $$
  select company_id from public.profiles where id = auth.uid();
$$;

-- Helper: get current user's role
create or replace function public.my_role()
returns text
language sql stable
security definer
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Companies: owner and members of company can read; only owner can update
create policy "company members can read own company"
  on public.companies for select
  using (id = public.my_company_id());

create policy "owner can update company"
  on public.companies for update
  using (owner_id = auth.uid());

create policy "authenticated can insert company"
  on public.companies for insert
  with check (owner_id = auth.uid());

-- Profiles: members of same company can read each other
create policy "company members can read profiles"
  on public.profiles for select
  using (company_id = public.my_company_id() or id = auth.uid());

create policy "users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

create policy "system can insert profile"
  on public.profiles for insert
  with check (id = auth.uid());

-- SOP Categories: company members can read; owner/manager can write
create policy "company members can read categories"
  on public.sop_categories for select
  using (company_id = public.my_company_id());

create policy "owner manager can manage categories"
  on public.sop_categories for all
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('owner', 'manager')
  );

-- SOPs: company members can read; owner/manager can write
create policy "company members can read sops"
  on public.sops for select
  using (company_id = public.my_company_id());

create policy "owner manager can insert sops"
  on public.sops for insert
  with check (
    company_id = public.my_company_id()
    and public.my_role() in ('owner', 'manager')
  );

create policy "owner manager can update sops"
  on public.sops for update
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('owner', 'manager')
  );

create policy "owner manager can delete sops"
  on public.sops for delete
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('owner', 'manager')
  );

-- SOP Steps: follow SOP access
create policy "company members can read steps"
  on public.sop_steps for select
  using (
    exists (
      select 1 from public.sops
      where id = sop_steps.sop_id
      and company_id = public.my_company_id()
    )
  );

create policy "owner manager can manage steps"
  on public.sop_steps for all
  using (
    exists (
      select 1 from public.sops
      where id = sop_steps.sop_id
      and company_id = public.my_company_id()
    )
    and public.my_role() in ('owner', 'manager')
  );

-- Assignments: owner/manager can manage; employees see own
create policy "owner manager can manage assignments"
  on public.assignments for all
  using (
    public.my_role() in ('owner', 'manager')
    and exists (
      select 1 from public.sops
      where id = assignments.sop_id
      and company_id = public.my_company_id()
    )
  );

create policy "employees can read own assignments"
  on public.assignments for select
  using (employee_id = auth.uid());

-- Step completions: employees manage own; owner/manager can read
create policy "employees can manage own completions"
  on public.step_completions for all
  using (employee_id = auth.uid());

create policy "owner manager can read completions"
  on public.step_completions for select
  using (
    public.my_role() in ('owner', 'manager')
    and exists (
      select 1 from public.assignments a
      join public.sops s on s.id = a.sop_id
      where a.id = step_completions.assignment_id
      and s.company_id = public.my_company_id()
    )
  );

-- Invites: company owner/manager can manage; anyone can read by email
create policy "owner manager can manage invites"
  on public.invites for all
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('owner', 'manager')
  );

create policy "invited user can read own invite"
  on public.invites for select
  using (email = (select email from auth.users where id = auth.uid()));

-- SOP Bundles: company members can read; owner/manager can write
create policy "company members can read bundles"
  on public.sop_bundles for select
  using (company_id = public.my_company_id());

create policy "owner manager can manage bundles"
  on public.sop_bundles for all
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('owner', 'manager')
  );

-- Bundle SOPs: follow bundle access
create policy "company members can read bundle_sops"
  on public.bundle_sops for select
  using (
    exists (
      select 1 from public.sop_bundles
      where id = bundle_sops.bundle_id
      and company_id = public.my_company_id()
    )
  );

create policy "owner manager can manage bundle_sops"
  on public.bundle_sops for all
  using (
    exists (
      select 1 from public.sop_bundles
      where id = bundle_sops.bundle_id
      and company_id = public.my_company_id()
    )
    and public.my_role() in ('owner', 'manager')
  );

-- ============================================================
-- CAPABILITY ENGINE
-- ============================================================

-- Company Roles: business/operational roles (not auth roles)
-- e.g. "Barista", "Shift Manager", "Line Cook"
create table if not exists public.company_roles (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  name        text not null,
  description text,
  color       text not null default 'blue'
                check (color in ('blue','green','orange','purple','red','gray')),
  created_at  timestamptz not null default now(),
  unique (company_id, name)
);

-- Role SOPs: ordered SOPs required for a role
create table if not exists public.role_sops (
  role_id  uuid not null references public.company_roles(id) on delete cascade,
  sop_id   uuid not null references public.sops(id) on delete cascade,
  position integer not null default 0,
  primary key (role_id, sop_id)
);

-- Employee Roles: capability state machine
-- Training completion and certification are separate events.
-- Status is always derived from these event columns — never stored.
create table if not exists public.employee_roles (
  employee_id           uuid not null references public.profiles(id) on delete cascade,
  role_id               uuid not null references public.company_roles(id) on delete cascade,
  assigned_at           timestamptz not null default now(),
  assigned_by           uuid references public.profiles(id) on delete set null,

  -- Training layer (system-detected)
  training_completed_at timestamptz,

  -- Certification layer (human-authorised)
  certified_at          timestamptz,
  certified_by          uuid references public.profiles(id) on delete set null,
  expires_at            timestamptz,
  role_snapshot         jsonb,            -- [{sop_id, position}] snapshot at certification

  -- Revocation layer
  revoked_at            timestamptz,
  revoked_by            uuid references public.profiles(id) on delete set null,
  revocation_reason     text,

  primary key (employee_id, role_id)
);

alter table public.company_roles  enable row level security;
alter table public.role_sops      enable row level security;
alter table public.employee_roles enable row level security;

-- Company roles: all company members read; owner/manager write
create policy "company members can read company_roles"
  on public.company_roles for select
  using (company_id = public.my_company_id());

create policy "owner manager can manage company_roles"
  on public.company_roles for all
  using (
    company_id = public.my_company_id()
    and public.my_role() in ('owner', 'manager')
  );

-- Role SOPs: follow company_roles access
create policy "company members can read role_sops"
  on public.role_sops for select
  using (
    exists (
      select 1 from public.company_roles r
      where r.id = role_sops.role_id
      and r.company_id = public.my_company_id()
    )
  );

create policy "owner manager can manage role_sops"
  on public.role_sops for all
  using (
    exists (
      select 1 from public.company_roles r
      where r.id = role_sops.role_id
      and r.company_id = public.my_company_id()
    )
    and public.my_role() in ('owner', 'manager')
  );

-- Employee roles: all company members read; owner/manager write
create policy "company members can read employee_roles"
  on public.employee_roles for select
  using (
    exists (
      select 1 from public.company_roles r
      where r.id = employee_roles.role_id
      and r.company_id = public.my_company_id()
    )
  );

create policy "owner manager can manage employee_roles"
  on public.employee_roles for all
  using (
    exists (
      select 1 from public.company_roles r
      where r.id = employee_roles.role_id
      and r.company_id = public.my_company_id()
    )
    and public.my_role() in ('owner', 'manager')
  );

-- ============================================================
-- INTELLIGENCE ENGINE
-- ============================================================

-- Add coverage threshold to company_roles
-- (safe: ADD COLUMN with DEFAULT backfills without table lock)
alter table public.company_roles
  add column if not exists minimum_certified_count integer not null default 2
    check (minimum_certified_count >= 1);

-- v_cert_status: per (employee_id, role_id) computed certification status + drift detection
-- Mirrors getCertStatus() TypeScript logic exactly. Scoped to my_company_id() via company_roles JOIN.
create or replace view public.v_cert_status as
with current_sops as (
  select rs.role_id,
         array_agg(rs.sop_id::text order by rs.sop_id::text) as current_sop_ids
  from   public.role_sops rs
  group  by rs.role_id
),
snapshot_sops as (
  select er.employee_id, er.role_id,
         array_agg((elem->>'sop_id') order by (elem->>'sop_id')) as snapshot_sop_ids
  from   public.employee_roles er,
         jsonb_array_elements(coalesce(er.role_snapshot, '[]'::jsonb)) as elem
  group  by er.employee_id, er.role_id
)
select
  er.employee_id,
  er.role_id,
  cr.company_id,
  cr.name                    as role_name,
  cr.color                   as role_color,
  p.full_name                as employee_name,
  p.email                    as employee_email,
  er.assigned_at,
  er.training_completed_at,
  er.certified_at,
  er.certified_by,
  certifier.full_name        as certified_by_name,
  er.expires_at,
  er.role_snapshot,
  er.revoked_at,
  er.revoked_by,
  er.revocation_reason,
  cs.current_sop_ids,
  ss.snapshot_sop_ids,
  -- Drift: certified against outdated role definition
  (er.certified_at is not null and er.revoked_at is null
    and (er.expires_at is null or er.expires_at > now())
    and ss.snapshot_sop_ids is distinct from cs.current_sop_ids
  )                          as is_drifted,
  -- SOPs added to role since certification
  case when er.certified_at is not null and er.revoked_at is null then
    array(select unnest(cs.current_sop_ids)
          except select unnest(coalesce(ss.snapshot_sop_ids, array[]::text[])))
  else array[]::text[] end   as added_sop_ids,
  -- SOPs removed from role since certification
  case when er.certified_at is not null and er.revoked_at is null then
    array(select unnest(coalesce(ss.snapshot_sop_ids, array[]::text[]))
          except select unnest(cs.current_sop_ids))
  else array[]::text[] end   as removed_sop_ids,
  -- Computed status (mirrors getCertStatus() TypeScript exactly)
  case
    when er.revoked_at is not null                                     then 'revoked'
    when er.certified_at is not null and er.expires_at is not null
         and er.expires_at < now()                                     then 'expired'
    when er.certified_at is not null and er.revoked_at is null
         and ss.snapshot_sop_ids is distinct from cs.current_sop_ids  then 'needs_recertification'
    when er.certified_at is not null                                   then 'certified'
    when er.training_completed_at is not null                          then 'pending_review'
    else                                                                    'in_training'
  end                        as cert_status,
  -- Days until expiry (null if no expiry set)
  case when er.expires_at is not null
    then extract(day from er.expires_at - now())::integer
  else null end              as days_until_expiry,
  -- Expiry window flags
  (er.expires_at is not null and er.expires_at > now()
   and er.expires_at < now() + interval '7 days'  and er.revoked_at is null) as expiring_critical,
  (er.expires_at is not null and er.expires_at > now()
   and er.expires_at < now() + interval '30 days' and er.revoked_at is null) as expiring_warning,
  (er.expires_at is not null and er.expires_at > now()
   and er.expires_at < now() + interval '60 days' and er.revoked_at is null) as expiring_planning
from   public.employee_roles er
join   public.company_roles  cr        on cr.id       = er.role_id
join   public.profiles       p         on p.id        = er.employee_id
left join public.profiles    certifier on certifier.id = er.certified_by
left join current_sops       cs        on cs.role_id   = er.role_id
left join snapshot_sops      ss        on ss.employee_id = er.employee_id
                                       and ss.role_id    = er.role_id
where  cr.company_id = public.my_company_id();

-- v_role_coverage: per-role aggregated coverage metrics
create or replace view public.v_role_coverage as
select
  cr.id                          as role_id,
  cr.company_id,
  cr.name                        as role_name,
  cr.color,
  cr.description,
  coalesce(cr.minimum_certified_count, 2) as minimum_certified_count,
  count(vcs.employee_id) filter (where vcs.cert_status != 'revoked')              as total_assigned,
  count(vcs.employee_id) filter (where vcs.cert_status = 'certified')             as certified_count,
  count(vcs.employee_id) filter (where vcs.cert_status = 'pending_review')        as pending_count,
  count(vcs.employee_id) filter (where vcs.cert_status = 'in_training')           as in_training_count,
  count(vcs.employee_id) filter (where vcs.cert_status = 'needs_recertification') as drifted_count,
  count(vcs.employee_id) filter (where vcs.cert_status in ('expired','revoked'))  as lapsed_count,
  count(vcs.employee_id) filter (where vcs.expiring_critical and vcs.cert_status = 'certified') as expiring_7d,
  count(vcs.employee_id) filter (where vcs.expiring_warning  and vcs.cert_status = 'certified') as expiring_30d,
  count(vcs.employee_id) filter (where vcs.expiring_planning and vcs.cert_status = 'certified') as expiring_60d,
  (count(vcs.employee_id) filter (where vcs.cert_status = 'certified') = 1)       as is_spof,
  (count(vcs.employee_id) filter (where vcs.cert_status = 'certified')
    < coalesce(cr.minimum_certified_count, 2))                                    as below_threshold,
  least(100, round(
    count(vcs.employee_id) filter (where vcs.cert_status = 'certified')::numeric
    / nullif(coalesce(cr.minimum_certified_count, 2), 0) * 100
  ))                             as coverage_pct
from   public.company_roles cr
left join public.v_cert_status vcs on vcs.role_id = cr.id
where  cr.company_id = public.my_company_id()
group  by cr.id, cr.company_id, cr.name, cr.color, cr.description, cr.minimum_certified_count;

-- v_expiry_risk: certifications expiring in 60 days, with priority scoring
create or replace view public.v_expiry_risk as
with role_cert_counts as (
  select role_id, count(*) as certified_count
  from   public.v_cert_status
  where  cert_status = 'certified'
  group  by role_id
)
select
  vcs.employee_id,
  vcs.role_id,
  vcs.company_id,
  vcs.employee_name,
  vcs.employee_email,
  vcs.role_name,
  vcs.role_color,
  vcs.certified_at,
  vcs.certified_by_name,
  vcs.expires_at,
  vcs.days_until_expiry,
  case
    when vcs.days_until_expiry <= 7  then '7d'
    when vcs.days_until_expiry <= 30 then '30d'
    else '60d'
  end                              as expiry_window,
  (coalesce(rcc.certified_count, 0) = 1) as is_spof,
  -- Priority: window urgency + SPOF multiplier
  (case when vcs.days_until_expiry <= 7  then 3
        when vcs.days_until_expiry <= 30 then 2
        else 1 end
   + case when coalesce(rcc.certified_count, 0) = 1 then 3 else 0 end
  )                                as priority_score
from   public.v_cert_status  vcs
left join role_cert_counts   rcc on rcc.role_id = vcs.role_id
where  vcs.cert_status  = 'certified'
  and  vcs.expires_at  is not null
  and  vcs.expires_at   > now()
  and  vcs.expires_at   < now() + interval '60 days';

-- v_company_health: single-row weighted operational health score (0–100)
-- Components: Coverage 35%, Currency 30%, Drift 20%, Expiry 15%
create or replace view public.v_company_health as
with role_cov as (
  select
    count(*) filter (where not below_threshold and certified_count > 0) as covered_roles,
    count(*)                                                             as total_roles
  from public.v_role_coverage
),
cert_cur as (
  select
    count(*) filter (where cert_status = 'certified' and not is_drifted)        as current_certs,
    count(*) filter (where cert_status in ('certified','needs_recertification')) as total_active_certs
  from public.v_cert_status
),
drift_e as (
  select
    count(*) filter (where cert_status = 'needs_recertification')               as drifted_count,
    count(*) filter (where cert_status in ('certified','needs_recertification')) as cert_or_drifted
  from public.v_cert_status
),
exp_u as (
  select
    count(*) filter (where expiring_critical and cert_status = 'certified') as critical_7d,
    count(*) filter (where cert_status = 'certified')                       as total_certified
  from public.v_cert_status
)
select
  round(coalesce(rc.covered_roles::numeric / nullif(rc.total_roles, 0), 1), 3)         as coverage_score,
  round(coalesce(cc.current_certs::numeric / nullif(cc.total_active_certs, 0), 1), 3)  as currency_score,
  round(coalesce(1 - de.drifted_count::numeric / nullif(de.cert_or_drifted, 0), 1), 3) as drift_score,
  round(coalesce(1 - eu.critical_7d::numeric / nullif(eu.total_certified, 0), 1), 3)   as expiry_score,
  rc.covered_roles, rc.total_roles,
  cc.current_certs, cc.total_active_certs,
  de.drifted_count,
  eu.critical_7d    as expiring_critical_count,
  eu.total_certified,
  round((
    coalesce(rc.covered_roles::numeric / nullif(rc.total_roles, 0), 1) * 0.35 +
    coalesce(cc.current_certs::numeric / nullif(cc.total_active_certs, 0), 1) * 0.30 +
    coalesce(1 - de.drifted_count::numeric / nullif(de.cert_or_drifted, 0), 1) * 0.20 +
    coalesce(1 - eu.critical_7d::numeric / nullif(eu.total_certified, 0), 1) * 0.15
  ) * 100)           as health_score,
  case
    when round((
      coalesce(rc.covered_roles::numeric/nullif(rc.total_roles,0),1)*0.35 +
      coalesce(cc.current_certs::numeric/nullif(cc.total_active_certs,0),1)*0.30 +
      coalesce(1-de.drifted_count::numeric/nullif(de.cert_or_drifted,0),1)*0.20 +
      coalesce(1-eu.critical_7d::numeric/nullif(eu.total_certified,0),1)*0.15
    )*100) >= 80 then 'healthy'
    when round((
      coalesce(rc.covered_roles::numeric/nullif(rc.total_roles,0),1)*0.35 +
      coalesce(cc.current_certs::numeric/nullif(cc.total_active_certs,0),1)*0.30 +
      coalesce(1-de.drifted_count::numeric/nullif(de.cert_or_drifted,0),1)*0.20 +
      coalesce(1-eu.critical_7d::numeric/nullif(eu.total_certified,0),1)*0.15
    )*100) >= 60 then 'needs_attention'
    else 'at_risk'
  end                as health_grade,
  now()              as computed_at
from role_cov rc, cert_cur cc, drift_e de, exp_u eu;
