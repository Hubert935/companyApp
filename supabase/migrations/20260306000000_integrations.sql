-- ============================================================
-- INTEGRATIONS FOUNDATION MIGRATION
-- Run in Supabase Studio SQL editor or via supabase db reset
-- ============================================================

-- 1. Phone number on profiles (for SMS notifications)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_number text;

-- 2. Twilio credentials + notification preferences per company
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id                   uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id           uuid        NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  twilio_account_sid   text,
  twilio_auth_token    text,
  twilio_from_number   text,
  notify_expiry_7d     boolean     NOT NULL DEFAULT true,
  notify_expired       boolean     NOT NULL DEFAULT true,
  notify_pending_48h   boolean     NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- 3. Zapier (and generic) outbound webhook endpoints
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  url              text        NOT NULL,
  secret           text        NOT NULL,
  label            text,
  events           text[]      NOT NULL DEFAULT ARRAY[
    'cert.created','cert.revoked','cert.expired',
    'role.below_threshold','health.at_risk'
  ],
  is_active        boolean     NOT NULL DEFAULT true,
  last_fired_at    timestamptz,
  last_status_code integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- 4. OAuth tokens + config for Gusto / Homebase / Slack
CREATE TABLE IF NOT EXISTS public.integrations (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  provider         text        NOT NULL CHECK (provider IN ('gusto','homebase','slack')),
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  config           jsonb       NOT NULL DEFAULT '{}'::jsonb,
  connected_at     timestamptz,
  last_sync_at     timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, provider)
);

-- 5. Notification deduplication + audit trail
CREATE TABLE IF NOT EXISTS public.notification_log (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id  uuid        NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel     text        NOT NULL CHECK (channel IN ('sms','slack')),
  recipient   text        NOT NULL,
  message     text        NOT NULL,
  event_type  text        NOT NULL,
  employee_id uuid,
  role_id     uuid,
  status      text        NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','failed')),
  error       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- 6. Enable RLS on all new tables
ALTER TABLE public.notification_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log        ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies — company-scoped using existing my_company_id() helper
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_settings' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.notification_settings
      USING (company_id = public.my_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'webhook_endpoints' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.webhook_endpoints
      USING (company_id = public.my_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'integrations' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.integrations
      USING (company_id = public.my_company_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'notification_log' AND policyname = 'company_isolation'
  ) THEN
    CREATE POLICY "company_isolation" ON public.notification_log
      USING (company_id = public.my_company_id());
  END IF;
END $$;
