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
-- SOPs
-- Standard Operating Procedures, owned by a company
-- ============================================================
create table public.sops (
  id          uuid primary key default uuid_generate_v4(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  title       text not null,
  description text,
  category    text,
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

alter table public.companies       enable row level security;
alter table public.profiles        enable row level security;
alter table public.sops            enable row level security;
alter table public.sop_steps       enable row level security;
alter table public.assignments     enable row level security;
alter table public.step_completions enable row level security;
alter table public.invites         enable row level security;

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
