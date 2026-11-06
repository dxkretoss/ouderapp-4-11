-- ==============================================================================
-- Ouderschap & Co — Complete Master Database Schema
-- Ready for New Supabase Projects (Single execution in Supabase SQL Editor)
-- Includes: All Tables, Constraints, Storage Buckets & Policies, RPC Functions,
-- Indexes, Row Level Security, and Supabase Auth Synchronization.
-- ==============================================================================

-- 1. Enable cryptographic functions for UUIDs & password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 2. CORE DATABASE TABLES
-- ==============================================================================

-- A. Profiles Table (Master User Entity)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  password TEXT,
  name TEXT NOT NULL DEFAULT 'Gebruiker',
  avatar_url TEXT,
  usage_mode TEXT NOT NULL DEFAULT 'together' CHECK (usage_mode IN ('together', 'solo', 'caregiver')),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  verification_code TEXT,
  session_token TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all columns exist in case table already exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT DEFAULT 'Gebruiker';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usage_mode TEXT DEFAULT 'together';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_usage_mode_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_usage_mode_check CHECK (usage_mode IN ('together', 'solo', 'caregiver'));
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verification_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_token TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS handover_initialized BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'parent';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('parent', 'caregiver', 'superadmin', 'professional'));
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS password_hash CASCADE;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS reset_token CASCADE;
DROP VIEW IF EXISTS public.users CASCADE;

-- Seed Super Admin user (Credentials: ouderschap@admin.com / beC88aOuguderF7bNpZtNN)
INSERT INTO public.profiles (
  email,
  password,
  name,
  role,
  usage_mode,
  is_verified,
  onboarding_completed
)
VALUES (
  'ouderschap@admin.com',
  'beC88aOuguderF7bNpZtNN',
  'Super Admin',
  'superadmin',
  'together',
  true,
  true
)
ON CONFLICT (email) DO UPDATE
SET password = EXCLUDED.password,
    role = 'superadmin',
    is_verified = true,
    onboarding_completed = true,
    updated_at = now();


-- B. Children Table
CREATE TABLE IF NOT EXISTS public.children (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  last_name TEXT,
  date_of_birth DATE,
  avatar_url TEXT,
  school TEXT,
  daycare TEXT,
  doctor TEXT,
  medical_notes TEXT,
  care_schedule TEXT,
  clothes_size TEXT,
  shoe_size TEXT,
  bsn TEXT,
  allergies TEXT,
  dietary_notes TEXT,
  practical_notes TEXT,
  color_code TEXT DEFAULT '#3C6E71',
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all children columns exist
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS daycare TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS doctor TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS medical_notes TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS care_schedule TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS clothes_size TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS shoe_size TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS bsn TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS dietary_notes TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS practical_notes TEXT;
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS color_code TEXT DEFAULT '#3C6E71';
ALTER TABLE public.children ADD COLUMN IF NOT EXISTS custody TEXT DEFAULT 'gezamenlijk';
ALTER TABLE public.children DROP CONSTRAINT IF EXISTS children_gender_check;
ALTER TABLE public.children DROP COLUMN IF EXISTS gender CASCADE;

-- C. Child Parents Junction Table (Multi-parent permissions)
CREATE TABLE IF NOT EXISTS public.child_parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'parent' CHECK (role IN ('parent', 'guardian', 'stepparent', 'professional')),
  can_edit BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (child_id, parent_id)
);

-- D. Invitations Table (Co-Parent Onboarding)
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_parent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  to_email TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',
  child_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  role TEXT NOT NULL DEFAULT 'parent',
  to_parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days')
);

ALTER TABLE public.invitations DROP CONSTRAINT IF EXISTS invitations_status_check;
ALTER TABLE public.invitations ADD CONSTRAINT invitations_status_check 
  CHECK (status IN ('pending', 'sent', 'viewed', 'accepted', 'rejected', 'declined', 'expired', 'cancelled', 'disconnected'));

-- E. Parent Connections Table (Linked Co-Parents)
CREATE TABLE IF NOT EXISTS public.parent_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  invitation_id UUID REFERENCES public.invitations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (parent_1_id, parent_2_id)
);

ALTER TABLE public.parent_connections DROP CONSTRAINT IF EXISTS parent_connections_status_check;
ALTER TABLE public.parent_connections ADD CONSTRAINT parent_connections_status_check 
  CHECK (status IN ('pending', 'active', 'connected', 'disconnected'));
ALTER TABLE public.parent_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- F. Shared Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  category TEXT NOT NULL DEFAULT 'general',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  split_type TEXT NOT NULL DEFAULT '50_50' CHECK (split_type IN ('50_50', '60_40', 'custom', 'sole_payer')),
  payer_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  other_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  receipt_url TEXT,
  settled BOOLEAN NOT NULL DEFAULT false,
  settled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all expenses columns exist for drafts and approval status
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS is_draft BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';

-- G. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  type TEXT NOT NULL DEFAULT 'parents' CHECK (type IN ('parents', 'topic', 'pro', 'emergency')),
  related_child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  other_parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  last_message_text TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all conversations columns exist
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS other_parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_text TEXT;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

-- H. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  tone_level TEXT DEFAULT 'geen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_system BOOLEAN NOT NULL DEFAULT false
);

-- Ensure all messages columns exist
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tone_level TEXT DEFAULT 'geen';

-- I. Audit Events Table (Used by log-audit edge function)
CREATE TABLE IF NOT EXISTS public.audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- J. Device Tokens Table (Used by send-notification edge function for APNs/FCM)
CREATE TABLE IF NOT EXISTS public.device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ==============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_unique ON public.profiles (lower(email));
CREATE INDEX IF NOT EXISTS idx_profiles_session_token ON public.profiles (session_token);
CREATE INDEX IF NOT EXISTS idx_child_parents_parent ON public.child_parents (parent_id);
CREATE INDEX IF NOT EXISTS idx_child_parents_child ON public.child_parents (child_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations (token);
CREATE INDEX IF NOT EXISTS idx_expenses_payer ON public.expenses (payer_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user ON public.device_tokens (user_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) & ACCESS POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.children ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
  DROP POLICY IF EXISTS "Public profiles insert" ON public.profiles;
  DROP POLICY IF EXISTS "Public profiles update" ON public.profiles;
  DROP POLICY IF EXISTS "Public children all" ON public.children;
  DROP POLICY IF EXISTS "Public child_parents all" ON public.child_parents;
  DROP POLICY IF EXISTS "Public invitations all" ON public.invitations;
  DROP POLICY IF EXISTS "Public parent_connections all" ON public.parent_connections;
  DROP POLICY IF EXISTS "Public expenses all" ON public.expenses;
  DROP POLICY IF EXISTS "Public conversations all" ON public.conversations;
  DROP POLICY IF EXISTS "Public messages all" ON public.messages;
  DROP POLICY IF EXISTS "Public audit_events all" ON public.audit_events;
  DROP POLICY IF EXISTS "Public device_tokens all" ON public.device_tokens;
END $$;

CREATE POLICY "Public profiles read" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public profiles insert" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Public profiles update" ON public.profiles FOR UPDATE USING (true);
CREATE POLICY "Public children all" ON public.children FOR ALL USING (true);
CREATE POLICY "Public child_parents all" ON public.child_parents FOR ALL USING (true);
CREATE POLICY "Public invitations all" ON public.invitations FOR ALL USING (true);
CREATE POLICY "Public parent_connections all" ON public.parent_connections FOR ALL USING (true);
CREATE POLICY "Public expenses all" ON public.expenses FOR ALL USING (true);
CREATE POLICY "Public conversations all" ON public.conversations FOR ALL USING (true);
CREATE POLICY "Public messages all" ON public.messages FOR ALL USING (true);
CREATE POLICY "Public audit_events all" ON public.audit_events FOR ALL USING (true);
CREATE POLICY "Public device_tokens all" ON public.device_tokens FOR ALL USING (true);

-- ==============================================================================
-- 5. CUSTOM AUTHENTICATION RPC FUNCTIONS
-- ==============================================================================

-- A. Custom Sign In (Login)
CREATE OR REPLACE FUNCTION public.custom_login(
  p_email TEXT,
  p_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT;
  v_user RECORD;
  v_token TEXT;
BEGIN
  v_clean_email := lower(trim(p_email));

  SELECT * INTO v_user
  FROM public.profiles
  WHERE lower(email) = v_clean_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email or password.');
  END IF;

  -- Verify bcrypt password hash (or plaintext fallback)
  IF v_user.password IS NULL OR (
    v_user.password != p_password AND
    v_user.password != crypt(p_password, v_user.password)
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid email or password.');
  END IF;

  -- Email Verification Login Guard
  IF NOT COALESCE(v_user.is_verified, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'needs_verification', true,
      'email', v_clean_email,
      'error', 'Email not verified. Please verify your email with the OTP sent to your inbox before logging in.'
    );
  END IF;

  -- Generate and store 30-day session token
  v_token := encode(gen_random_bytes(32), 'hex');
  UPDATE public.profiles 
  SET last_login_at = now(), session_token = v_token 
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'usage_mode', v_user.usage_mode,
      'is_verified', v_user.is_verified,
      'onboarding_completed', v_user.onboarding_completed,
      'avatar_url', v_user.avatar_url
    ),
    'profile', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'usage_mode', v_user.usage_mode,
      'is_verified', v_user.is_verified,
      'onboarding_completed', v_user.onboarding_completed,
      'avatar_url', v_user.avatar_url
    ),
    'session', jsonb_build_object(
      'token', v_token,
      'expires_at', (now() + interval '30 days')
    )
  );
END;
$$;

-- B. Custom Sign Up (Register)
CREATE OR REPLACE FUNCTION public.custom_signup(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_usage_mode TEXT DEFAULT 'together'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT;
  v_existing RECORD;
  v_user_id UUID;
  v_code TEXT;
  v_token TEXT;
BEGIN
  v_clean_email := lower(trim(p_email));

  SELECT * INTO v_existing FROM public.profiles WHERE lower(email) = v_clean_email;

  -- Only block if the account is ALREADY verified
  IF FOUND AND v_existing.is_verified = true THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'A user with this email address already exists.'
    );
  END IF;

  v_code := lpad(floor(random() * 1000000)::text, 6, '0');
  v_token := encode(gen_random_bytes(32), 'hex');

  IF FOUND THEN
    UPDATE public.profiles
    SET
      password = crypt(p_password, gen_salt('bf', 10)),
      name = trim(p_name),
      usage_mode = COALESCE(p_usage_mode, 'together'),
      verification_code = v_code,
      session_token = v_token,
      last_login_at = now(),
      updated_at = now()
    WHERE id = v_existing.id
    RETURNING id INTO v_user_id;
  ELSE
    INSERT INTO public.profiles (
      email,
      password,
      name,
      usage_mode,
      is_verified,
      verification_code,
      session_token,
      last_login_at,
      onboarding_completed
    ) VALUES (
      v_clean_email,
      crypt(p_password, gen_salt('bf', 10)),
      trim(p_name),
      COALESCE(p_usage_mode, 'together'),
      false,
      v_code,
      v_token,
      now(),
      false
    )
    RETURNING id INTO v_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Account created successfully. Verification code generated.',
    'verification_code', v_code,
    'token', v_token,
    'session_token', v_token,
    'user', jsonb_build_object(
      'id', v_user_id,
      'email', v_clean_email,
      'name', trim(p_name),
      'usage_mode', p_usage_mode,
      'is_verified', false,
      'onboarding_completed', false,
      'session_token', v_token
    ),
    'profile', jsonb_build_object(
      'id', v_user_id,
      'email', v_clean_email,
      'name', trim(p_name),
      'usage_mode', p_usage_mode,
      'is_verified', false,
      'onboarding_completed', false,
      'session_token', v_token
    )
  );
END;
$$;

-- C. Custom Email Verification
CREATE OR REPLACE FUNCTION public.custom_verify_email(
  p_email TEXT,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT;
  v_user RECORD;
  v_token TEXT;
BEGIN
  v_clean_email := lower(trim(p_email));

  SELECT * INTO v_user FROM public.profiles WHERE lower(email) = v_clean_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  IF v_user.is_verified THEN
    v_token := COALESCE(v_user.session_token, encode(gen_random_bytes(32), 'hex'));
    UPDATE public.profiles
    SET session_token = v_token,
        last_login_at = now(),
        updated_at = now()
    WHERE id = v_user.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'Email is already verified.',
      'token', v_token,
      'session_token', v_token,
      'user', jsonb_build_object(
        'id', v_user.id,
        'email', v_user.email,
        'name', v_user.name,
        'usage_mode', v_user.usage_mode,
        'is_verified', true,
        'onboarding_completed', v_user.onboarding_completed,
        'session_token', v_token
      ),
      'profile', jsonb_build_object(
        'id', v_user.id,
        'email', v_user.email,
        'name', v_user.name,
        'usage_mode', v_user.usage_mode,
        'is_verified', true,
        'onboarding_completed', v_user.onboarding_completed,
        'session_token', v_token
      )
    );
  END IF;

  IF v_user.verification_code IS NULL OR trim(v_user.verification_code) != trim(p_code) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid verification code.');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  UPDATE public.profiles
  SET is_verified = true,
      verification_code = NULL,
      session_token = v_token,
      last_login_at = now(),
      updated_at = now()
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Email verified successfully.',
    'token', v_token,
    'session_token', v_token,
    'user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'usage_mode', v_user.usage_mode,
      'is_verified', true,
      'onboarding_completed', v_user.onboarding_completed,
      'session_token', v_token
    ),
    'profile', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'usage_mode', v_user.usage_mode,
      'is_verified', true,
      'onboarding_completed', v_user.onboarding_completed,
      'session_token', v_token
    )
  );
END;
$$;

-- D. Custom Resend Verification Code
CREATE OR REPLACE FUNCTION public.custom_resend_verification(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT;
  v_code TEXT;
BEGIN
  v_clean_email := lower(trim(p_email));
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  UPDATE public.profiles
  SET verification_code = v_code,
      updated_at = now()
  WHERE lower(email) = v_clean_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Verification code resent.',
    'verification_code', v_code
  );
END;
$$;

-- E. Custom Password Reset Request
CREATE OR REPLACE FUNCTION public.custom_request_password_reset(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT;
  v_code TEXT;
BEGIN
  v_clean_email := lower(trim(p_email));
  v_code := lpad(floor(random() * 1000000)::text, 6, '0');

  UPDATE public.profiles
  SET verification_code = v_code,
      updated_at = now()
  WHERE lower(email) = v_clean_email;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'If an account exists, a reset code has been sent.',
    'reset_code', v_code
  );
END;
$$;

-- F. Custom Verify Reset OTP
CREATE OR REPLACE FUNCTION public.custom_verify_reset_otp(
  p_email TEXT,
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT;
  v_user RECORD;
BEGIN
  v_clean_email := lower(trim(p_email));

  SELECT * INTO v_user FROM public.profiles WHERE lower(email) = v_clean_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid request.');
  END IF;

  IF v_user.verification_code IS NULL OR trim(v_user.verification_code) != trim(p_token) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or incorrect reset code.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Reset code verified successfully.'
  );
END;
$$;

-- G. Custom Password Reset Submission
CREATE OR REPLACE FUNCTION public.custom_reset_password(
  p_email TEXT,
  p_token TEXT,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_clean_email TEXT;
  v_user RECORD;
BEGIN
  v_clean_email := lower(trim(p_email));

  SELECT * INTO v_user FROM public.profiles WHERE lower(email) = v_clean_email;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid request.');
  END IF;

  IF v_user.verification_code IS NULL OR trim(v_user.verification_code) != trim(p_token) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired reset code.');
  END IF;

  UPDATE public.profiles
  SET password = crypt(p_new_password, gen_salt('bf', 10)),
      verification_code = NULL,
      updated_at = now()
  WHERE id = v_user.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Password has been updated successfully.'
  );
END;
$$;

-- H. Custom Get Current User / Validate Session
CREATE OR REPLACE FUNCTION public.custom_get_current_user(
  p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user RECORD;
BEGIN
  IF p_token IS NULL OR trim(p_token) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session token is required.');
  END IF;

  SELECT * INTO v_user
  FROM public.profiles
  WHERE session_token = trim(p_token);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired session.');
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'usage_mode', v_user.usage_mode,
      'is_verified', v_user.is_verified,
      'onboarding_completed', v_user.onboarding_completed,
      'avatar_url', v_user.avatar_url
    ),
    'profile', jsonb_build_object(
      'id', v_user.id,
      'email', v_user.email,
      'name', v_user.name,
      'usage_mode', v_user.usage_mode,
      'is_verified', v_user.is_verified,
      'onboarding_completed', v_user.onboarding_completed,
      'avatar_url', v_user.avatar_url
    ),
    'session', jsonb_build_object(
      'token', v_user.session_token,
      'expires_at', (now() + interval '30 days')
    )
  );
END;
$$;

-- I. Custom Logout Function
CREATE OR REPLACE FUNCTION public.custom_logout(
  p_token TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_token IS NOT NULL THEN
    UPDATE public.profiles
    SET session_token = NULL
    WHERE session_token = trim(p_token);
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Logged out successfully.');
END;
$$;

-- J. Custom Create Child
CREATE OR REPLACE FUNCTION public.custom_create_child(
  p_parent_id UUID,
  p_name TEXT,
  p_last_name TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_school TEXT DEFAULT NULL,
  p_daycare TEXT DEFAULT NULL,
  p_doctor TEXT DEFAULT NULL,
  p_medical_notes TEXT DEFAULT NULL,
  p_care_schedule TEXT DEFAULT NULL,
  p_clothes_size TEXT DEFAULT NULL,
  p_shoe_size TEXT DEFAULT NULL,
  p_bsn TEXT DEFAULT NULL,
  p_allergies TEXT DEFAULT NULL,
  p_dietary_notes TEXT DEFAULT NULL,
  p_color_code TEXT DEFAULT '#3C6E71',
  p_practical_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child_id UUID;
  v_child_record RECORD;
BEGIN
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Child name is required.');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_parent_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Parent profile not found.');
  END IF;

  INSERT INTO public.children (
    name,
    last_name,
    date_of_birth,
    avatar_url,
    school,
    daycare,
    doctor,
    medical_notes,
    care_schedule,
    clothes_size,
    shoe_size,
    bsn,
    allergies,
    dietary_notes,
    practical_notes,
    color_code,
    created_by
  ) VALUES (
    trim(p_name),
    NULLIF(trim(p_last_name), ''),
    p_date_of_birth,
    p_avatar_url,
    NULLIF(trim(p_school), ''),
    NULLIF(trim(p_daycare), ''),
    NULLIF(trim(p_doctor), ''),
    NULLIF(trim(p_medical_notes), ''),
    NULLIF(trim(p_care_schedule), ''),
    NULLIF(trim(p_clothes_size), ''),
    NULLIF(trim(p_shoe_size), ''),
    NULLIF(trim(p_bsn), ''),
    NULLIF(trim(p_allergies), ''),
    NULLIF(trim(p_dietary_notes), ''),
    NULLIF(trim(p_practical_notes), ''),
    COALESCE(p_color_code, '#3C6E71'),
    p_parent_id
  )
  RETURNING * INTO v_child_record;

  v_child_id := v_child_record.id;

  INSERT INTO public.child_parents (
    child_id,
    parent_id,
    role,
    can_edit
  ) VALUES (
    v_child_id,
    p_parent_id,
    'parent',
    true
  )
  ON CONFLICT (child_id, parent_id) DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'child', to_jsonb(v_child_record)
  );
END;
$$;

-- K. Custom Get My Children
CREATE OR REPLACE FUNCTION public.custom_get_my_children(
  p_parent_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_children JSONB;
BEGIN
  IF p_parent_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'p_parent_id is required', 'children', '[]'::jsonb);
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', k.id,
        'name', k.name,
        'last_name', k.last_name,
        'date_of_birth', k.date_of_birth,
        'avatar_url', k.avatar_url,
        'school', k.school,
        'daycare', k.daycare,
        'doctor', k.doctor,
        'medical_notes', k.medical_notes,
        'care_schedule', k.care_schedule,
        'clothes_size', k.clothes_size,
        'shoe_size', k.shoe_size,
        'bsn', k.bsn,
        'allergies', k.allergies,
        'dietary_notes', k.dietary_notes,
        'practical_notes', k.practical_notes,
        'color_code', COALESCE(k.color_code, '#3C6E71'),
        'created_by', k.created_by,
        'role', COALESCE(k.parent_role, 'parent'),
        'can_edit', true
      )
    ),
    '[]'::jsonb
  )
  INTO v_children
  FROM (
    SELECT DISTINCT ON (c.id)
      c.*,
      cp.role AS parent_role
    FROM children c
    LEFT JOIN child_parents cp ON cp.child_id = c.id
    WHERE c.created_by = p_parent_id OR cp.parent_id = p_parent_id
    ORDER BY c.id, c.created_at ASC
  ) k;

  RETURN jsonb_build_object(
    'success', true,
    'children', v_children
  );
END;
$$;

-- L. Custom Update Child
CREATE OR REPLACE FUNCTION public.custom_update_child(
  p_child_id UUID,
  p_parent_id UUID,
  p_name TEXT DEFAULT NULL,
  p_last_name TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL,
  p_school TEXT DEFAULT NULL,
  p_daycare TEXT DEFAULT NULL,
  p_doctor TEXT DEFAULT NULL,
  p_medical_notes TEXT DEFAULT NULL,
  p_care_schedule TEXT DEFAULT NULL,
  p_clothes_size TEXT DEFAULT NULL,
  p_shoe_size TEXT DEFAULT NULL,
  p_bsn TEXT DEFAULT NULL,
  p_allergies TEXT DEFAULT NULL,
  p_dietary_notes TEXT DEFAULT NULL,
  p_color_code TEXT DEFAULT NULL,
  p_practical_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_child RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.children c
    LEFT JOIN public.child_parents cp ON cp.child_id = c.id
    WHERE c.id = p_child_id AND (c.created_by = p_parent_id OR (cp.parent_id = p_parent_id AND cp.can_edit = true))
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission denied or child not found.');
  END IF;

  UPDATE public.children
  SET
    name = COALESCE(NULLIF(trim(p_name), ''), name),
    last_name = COALESCE(trim(p_last_name), last_name),
    date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
    avatar_url = COALESCE(p_avatar_url, avatar_url),
    school = COALESCE(trim(p_school), school),
    daycare = COALESCE(trim(p_daycare), daycare),
    doctor = COALESCE(trim(p_doctor), doctor),
    medical_notes = COALESCE(trim(p_medical_notes), medical_notes),
    care_schedule = COALESCE(trim(p_care_schedule), care_schedule),
    clothes_size = COALESCE(trim(p_clothes_size), clothes_size),
    shoe_size = COALESCE(trim(p_shoe_size), shoe_size),
    bsn = COALESCE(trim(p_bsn), bsn),
    allergies = COALESCE(trim(p_allergies), allergies),
    dietary_notes = COALESCE(trim(p_dietary_notes), dietary_notes),
    practical_notes = COALESCE(trim(p_practical_notes), practical_notes),
    color_code = COALESCE(p_color_code, color_code),
    updated_at = now()
  WHERE id = p_child_id
  RETURNING * INTO v_child;

  RETURN jsonb_build_object(
    'success', true,
    'child', to_jsonb(v_child)
  );
END;
$$;

-- M. Custom Delete Child
CREATE OR REPLACE FUNCTION public.custom_delete_child(
  p_child_id UUID,
  p_parent_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.children c
    WHERE c.id = p_child_id AND c.created_by = p_parent_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only the creator of the child profile can delete it.');
  END IF;

  DELETE FROM public.children WHERE id = p_child_id;

  RETURN jsonb_build_object('success', true, 'message', 'Child profile deleted.');
END;
$$;

-- N. Custom Update Usage Mode
CREATE OR REPLACE FUNCTION public.custom_update_usage_mode(
  p_user_id UUID,
  p_usage_mode TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_usage_mode NOT IN ('together', 'solo', 'caregiver') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid usage mode. Must be together, solo, or caregiver.');
  END IF;

  UPDATE public.profiles
  SET usage_mode = p_usage_mode, updated_at = now()
  WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true, 'usage_mode', p_usage_mode);
END;
$$;

-- O. Custom Disconnect Co-Parent & Revoke Shared Access (Migration 04)
CREATE OR REPLACE FUNCTION public.custom_disconnect_coparent(
  p_user_id UUID,
  p_coparent_id UUID,
  p_invitation_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 1. Update invitation status to disconnected
  IF p_invitation_id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'disconnected'
    WHERE id = p_invitation_id;
  ELSE
    UPDATE public.invitations
    SET status = 'disconnected'
    WHERE (from_parent_id = p_user_id AND to_parent_id = p_coparent_id)
       OR (from_parent_id = p_coparent_id AND to_parent_id = p_user_id);
  END IF;

  -- 2. Update parent_connections status to disconnected
  UPDATE public.parent_connections
  SET status = 'disconnected', updated_at = now()
  WHERE (parent_1_id = p_user_id AND parent_2_id = p_coparent_id)
     OR (parent_1_id = p_coparent_id AND parent_2_id = p_user_id);

  -- 3. Revoke access in child_parents junction table
  DELETE FROM public.child_parents
  WHERE parent_id = p_coparent_id
    AND child_id IN (SELECT id FROM public.children WHERE created_by = p_user_id);

  DELETE FROM public.child_parents
  WHERE parent_id = p_user_id
    AND child_id IN (SELECT id FROM public.children WHERE created_by = p_coparent_id);

  IF p_invitation_id IS NOT NULL THEN
    DELETE FROM public.child_parents
    WHERE (parent_id = p_coparent_id OR parent_id = p_user_id)
      AND child_id IN (
        SELECT unnest(child_ids)
        FROM public.invitations 
        WHERE id = p_invitation_id AND child_ids IS NOT NULL
      )
      AND child_id NOT IN (
        SELECT id FROM public.children WHERE created_by = parent_id
      );
  END IF;

  -- 4. Revert usage_mode to 'solo' if no active connections remain
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_connections
    WHERE (parent_1_id = p_user_id OR parent_2_id = p_user_id)
      AND status IN ('connected', 'active')
  ) THEN
    UPDATE public.profiles
    SET usage_mode = 'solo', updated_at = now()
    WHERE id = p_user_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.parent_connections
    WHERE (parent_1_id = p_coparent_id OR parent_2_id = p_coparent_id)
      AND status IN ('connected', 'active')
  ) THEN
    UPDATE public.profiles
    SET usage_mode = 'solo', updated_at = now()
    WHERE id = p_coparent_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Co-parent connection removed successfully. Shared child access revoked.'
  );
END;
$$;

-- ==============================================================================
-- 6. GRANT API PERMISSIONS
-- ==============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.custom_login(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_signup(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_verify_email(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_resend_verification(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_request_password_reset(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_verify_reset_otp(TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_reset_password(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_get_current_user(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_logout(TEXT) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.custom_create_child(UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_get_my_children(UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_update_child(UUID, UUID, TEXT, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_delete_child(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_update_usage_mode(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.custom_disconnect_coparent(UUID, UUID, UUID) TO anon, authenticated, service_role;

-- ==============================================================================
-- 7. STORAGE BUCKETS & ACCESS POLICIES
-- ==============================================================================

-- A. Create buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('child-avatars', 'child-avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('receipts', 'receipts', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('documents', 'documents', false, 20971520, ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('moments', 'moments', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- B. Storage Policies for avatars, child-avatars, and receipts
DO $$
BEGIN
  -- Child avatars
  DROP POLICY IF EXISTS "Public child-avatars access" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users upload child-avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users update child-avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users delete child-avatars" ON storage.objects;

  CREATE POLICY "Public child-avatars access" ON storage.objects FOR SELECT USING (bucket_id = 'child-avatars');
  CREATE POLICY "Authenticated users upload child-avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'child-avatars');
  CREATE POLICY "Authenticated users update child-avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'child-avatars');
  CREATE POLICY "Users delete child-avatars" ON storage.objects FOR DELETE USING (bucket_id = 'child-avatars');

  -- Profile avatars
  DROP POLICY IF EXISTS "Public avatars access" ON storage.objects;
  DROP POLICY IF EXISTS "Users upload avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users update avatars" ON storage.objects;
  DROP POLICY IF EXISTS "Users delete avatars" ON storage.objects;

  CREATE POLICY "Public avatars access" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
  CREATE POLICY "Users upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
  CREATE POLICY "Users update avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');
  CREATE POLICY "Users delete avatars" ON storage.objects FOR DELETE USING (bucket_id = 'avatars');

  -- Receipts
  DROP POLICY IF EXISTS "Public receipts access" ON storage.objects;
  DROP POLICY IF EXISTS "Users upload receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users update receipts" ON storage.objects;
  DROP POLICY IF EXISTS "Users delete receipts" ON storage.objects;

  CREATE POLICY "Public receipts access" ON storage.objects FOR SELECT TO anon, authenticated, public USING (bucket_id = 'receipts');
  CREATE POLICY "Users upload receipts" ON storage.objects FOR INSERT TO anon, authenticated, public WITH CHECK (bucket_id = 'receipts');
  CREATE POLICY "Users update receipts" ON storage.objects FOR UPDATE TO anon, authenticated, public USING (bucket_id = 'receipts');
  CREATE POLICY "Users delete receipts" ON storage.objects FOR DELETE TO anon, authenticated, public USING (bucket_id = 'receipts');

  -- Moments
  DROP POLICY IF EXISTS "Public moments access" ON storage.objects;
  DROP POLICY IF EXISTS "Users upload moments" ON storage.objects;
  DROP POLICY IF EXISTS "Users update moments" ON storage.objects;
  DROP POLICY IF EXISTS "Users delete moments" ON storage.objects;

  CREATE POLICY "Public moments access" ON storage.objects FOR SELECT TO anon, authenticated, public USING (bucket_id = 'moments');
  CREATE POLICY "Users upload moments" ON storage.objects FOR INSERT TO anon, authenticated, public WITH CHECK (bucket_id = 'moments');
  CREATE POLICY "Users update moments" ON storage.objects FOR UPDATE TO anon, authenticated, public USING (bucket_id = 'moments');
  CREATE POLICY "Users delete moments" ON storage.objects FOR DELETE TO anon, authenticated, public USING (bucket_id = 'moments');
END $$;

-- ==============================================================================
-- 8. SUPABASE AUTH SYNCHRONIZATION (auth.users <-> public.profiles)
-- ==============================================================================

-- Trigger to sync users created via Supabase standard Auth to public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    name,
    usage_mode,
    is_verified,
    onboarding_completed
  ) VALUES (
    new.id,
    lower(trim(new.email)),
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Parent'),
    COALESCE(new.raw_user_meta_data->>'usage_mode', 'together'),
    COALESCE(new.email_confirmed_at IS NOT NULL, false),
    false
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(public.profiles.name, EXCLUDED.name);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to sync any profile changes to auth.users
CREATE OR REPLACE FUNCTION public.sync_profile_to_auth_user()
RETURNS trigger AS $$
BEGIN
  IF NEW.email IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.id OR lower(email) = lower(NEW.email)) THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change,
        email_change_token_current,
        phone_change,
        phone_change_token,
        reauthentication_token,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000'::uuid,
        NEW.id,
        'authenticated',
        'authenticated',
        lower(trim(NEW.email)),
        COALESCE(NEW.password, crypt('Password123!', gen_salt('bf', 10))),
        CASE WHEN NEW.is_verified THEN now() ELSE NULL END,
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('name', NEW.name, 'usage_mode', NEW.usage_mode),
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        NEW.created_at,
        NEW.updated_at
      );

      INSERT INTO auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        NEW.id,
        jsonb_build_object('sub', NEW.id::text, 'email', lower(trim(NEW.email))),
        'email',
        NEW.id::text,
        now(),
        NEW.created_at,
        NEW.updated_at
      ) ON CONFLICT (provider, provider_id) DO NOTHING;
    ELSE
      UPDATE auth.users
      SET
        email = lower(trim(NEW.email)),
        email_confirmed_at = CASE WHEN NEW.is_verified AND email_confirmed_at IS NULL THEN now() ELSE email_confirmed_at END,
        raw_user_meta_data = jsonb_build_object('name', NEW.name, 'usage_mode', NEW.usage_mode),
        updated_at = now()
      WHERE id = NEW.id OR lower(email) = lower(NEW.email);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix missing auth.identities records for any existing users
INSERT INTO auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
SELECT 
  id,
  id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email',
  id::text,
  now(),
  created_at,
  updated_at
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM auth.identities i WHERE i.user_id = u.id
);

-- Fix any NULL token columns in existing auth.users to prevent 'Database error loading user' in GoTrue
UPDATE auth.users
SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change IS NULL
  OR email_change_token_new IS NULL;

DROP TRIGGER IF EXISTS trg_sync_profile_to_auth_user ON public.profiles;
CREATE TRIGGER trg_sync_profile_to_auth_user
  AFTER INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_auth_user();

-- Trigger to cascade user deletion from auth.users to public.profiles, family_caregivers, and invitations
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS trigger AS $$
BEGIN
  -- 1. Cascade delete family caregivers linked to this user (as creator or as caregiver email/id)
  DELETE FROM public.family_caregivers 
  WHERE created_by = OLD.id 
     OR connected_user_id = OLD.id 
     OR (OLD.email IS NOT NULL AND lower(email) = lower(OLD.email));

  -- 2. Cascade delete invitations linked to this user
  DELETE FROM public.invitations 
  WHERE from_parent_id = OLD.id 
     OR (OLD.email IS NOT NULL AND lower(to_email) = lower(OLD.email));

  -- 3. Cascade delete from public.profiles
  DELETE FROM public.profiles WHERE id = OLD.id OR (OLD.email IS NOT NULL AND lower(email) = lower(OLD.email));

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- Clean up any orphaned profile records whose auth user was previously deleted
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Ensure profiles does not have a strict foreign key blocking custom_signup (deletion cascade handled by on_auth_user_deleted trigger)
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ==============================================================================
-- 10. FAMILY CIRCLE (CAREGIVERS & PERMISSIONS)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.family_caregivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Caregiver',
    phone TEXT,
    email TEXT,
    is_emergency_contact BOOLEAN DEFAULT FALSE,
    invite_token UUID DEFAULT gen_random_uuid() UNIQUE,
    status TEXT NOT NULL DEFAULT 'contact_only',
    connected_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.family_caregivers DROP CONSTRAINT IF EXISTS family_caregivers_created_by_fkey;
ALTER TABLE public.family_caregivers DROP CONSTRAINT IF EXISTS family_caregivers_connected_user_id_fkey;

CREATE INDEX IF NOT EXISTS idx_family_caregivers_creator ON public.family_caregivers(created_by);
CREATE INDEX IF NOT EXISTS idx_family_caregivers_token ON public.family_caregivers(invite_token);
CREATE INDEX IF NOT EXISTS idx_family_caregivers_connected ON public.family_caregivers(connected_user_id);

CREATE TABLE IF NOT EXISTS public.caregiver_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caregiver_id UUID NOT NULL REFERENCES public.family_caregivers(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    permission_level TEXT NOT NULL DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(caregiver_id, child_id, section)
);

CREATE INDEX IF NOT EXISTS idx_caregiver_permissions_lookup ON public.caregiver_permissions(caregiver_id, child_id);

ALTER TABLE public.family_caregivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caregiver_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public family_caregivers all" ON public.family_caregivers FOR ALL USING (true);
CREATE POLICY "Public caregiver_permissions all" ON public.caregiver_permissions FOR ALL USING (true);

-- Grant table privileges
GRANT ALL ON TABLE public.family_caregivers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.caregiver_permissions TO anon, authenticated, service_role;

-- ==============================================================================
-- 8. CALENDAR & BUDGET PROPOSALS TABLES
-- ==============================================================================

-- A. Calendar Events Table
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General' CHECK (category IN ('School', 'Sport', 'Care', 'Medical', 'Celebration', 'Vacation', 'General')),
  start_date DATE NOT NULL,
  start_time TIME,
  end_date DATE,
  end_time TIME,
  is_all_day BOOLEAN NOT NULL DEFAULT false,
  location TEXT,
  description TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  recurrence JSONB,
  skipped_dates DATE[] DEFAULT ARRAY[]::DATE[],
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'proposal', 'cancelled')),
  pending_proposal JSONB,
  attendance_needed BOOLEAN NOT NULL DEFAULT false,
  attendance_status TEXT DEFAULT 'uncoordinated' CHECK (attendance_status IN ('uncoordinated', 'both', 'parent_1', 'parent_2', 'separate')),
  reminder TEXT DEFAULT 'geen',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_start_date ON public.calendar_events (start_date);
CREATE INDEX IF NOT EXISTS idx_calendar_child ON public.calendar_events (child_id);
CREATE INDEX IF NOT EXISTS idx_calendar_created_by ON public.calendar_events (created_by);

-- B. Budget Proposals Table
CREATE TABLE IF NOT EXISTS public.budget_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  max_amount NUMERIC(10, 2) NOT NULL CHECK (max_amount > 0),
  payer_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  other_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 50.00,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'counterproposal', 'agreed', 'rejected', 'spent', 'withdrawn')),
  turn_to_respond UUID REFERENCES public.profiles(id),
  preferred_response_date DATE,
  period TEXT DEFAULT 'one_time' CHECK (period IN ('one_time', 'monthly', 'yearly')),
  valid_from DATE,
  valid_to DATE,
  terms TEXT,
  notes TEXT,
  attachment_url TEXT,
  reminders_sent TIMESTAMPTZ[] DEFAULT ARRAY[]::TIMESTAMPTZ[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_proposals_child ON public.budget_proposals (child_id);
CREATE INDEX IF NOT EXISTS idx_budget_proposals_created_by ON public.budget_proposals (created_by);

-- C. Budget Proposal Steps (Append-only Audit Log)
CREATE TABLE IF NOT EXISTS public.budget_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budget_proposals(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  action_type TEXT NOT NULL,
  amount NUMERIC(10, 2),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_budget_steps_budget ON public.budget_steps (budget_id);

-- D. Expenses Column Updates
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS budget_id UUID REFERENCES public.budget_proposals(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'agreed';
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS family_id UUID;

-- E. RLS & Permissions
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_steps ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.budget_proposals DROP CONSTRAINT IF EXISTS budget_proposals_status_check;
ALTER TABLE public.budget_proposals ADD CONSTRAINT budget_proposals_status_check CHECK (status IN ('pending', 'counterproposal', 'agreed', 'rejected', 'spent', 'withdrawn', 'wacht', 'tegenvoorstel', 'akkoord', 'afgewezen', 'afgesproken', 'uitgegeven'));

DROP POLICY IF EXISTS "Public calendar_events all" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_select_privacy" ON public.calendar_events;
DROP POLICY IF EXISTS "calendar_events_modify_policy" ON public.calendar_events;
CREATE POLICY "Public calendar_events all" ON public.calendar_events FOR ALL USING (true);

DROP POLICY IF EXISTS "Public budget_proposals all" ON public.budget_proposals;
CREATE POLICY "Public budget_proposals all" ON public.budget_proposals FOR ALL USING (true);

DROP POLICY IF EXISTS "Public budget_steps all" ON public.budget_steps;
CREATE POLICY "Public budget_steps all" ON public.budget_steps FOR ALL USING (true);

GRANT ALL ON TABLE public.calendar_events TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.budget_proposals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.budget_steps TO anon, authenticated, service_role;

-- Enable Supabase Realtime for instant messaging, calendar, and budgets
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.calendar_events;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_proposals;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_steps;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;

-- Ensure reminder column exists on calendar_events
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS reminder TEXT DEFAULT 'geen';

-- F. Notifications Table (Platform-wide notifications & reminders)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'reminder' CHECK (type IN ('reminder', 'appointment', 'message', 'proposal', 'cost', 'handover', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications (created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public notifications all" ON public.notifications;
CREATE POLICY "Public notifications all" ON public.notifications FOR ALL USING (true);
GRANT ALL ON TABLE public.notifications TO anon, authenticated, service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;

-- G. Handover & Packing Tables (Fully dynamic checklist, fixed routines & changeover logs)

-- 1. Handover Checklist Items
CREATE TABLE IF NOT EXISTS public.handover_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  moment_id TEXT NOT NULL DEFAULT 'w1',
  item_name TEXT NOT NULL,
  is_packed BOOLEAN NOT NULL DEFAULT false,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.handover_checklist_items DROP COLUMN IF EXISTS is_deleted;

CREATE INDEX IF NOT EXISTS idx_handover_checklist_user ON public.handover_checklist_items (user_id);
CREATE INDEX IF NOT EXISTS idx_handover_checklist_moment ON public.handover_checklist_items (moment_id);

ALTER TABLE public.handover_checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public handover_checklist_items all" ON public.handover_checklist_items;
CREATE POLICY "Public handover_checklist_items all" ON public.handover_checklist_items FOR ALL USING (true);
GRANT ALL ON TABLE public.handover_checklist_items TO anon, authenticated, service_role;

-- 2. Fixed Routines (Gear to bring on specific recurring days)
CREATE TABLE IF NOT EXISTS public.fixed_routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  item_name TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.fixed_routines DROP COLUMN IF EXISTS is_deleted;

CREATE INDEX IF NOT EXISTS idx_fixed_routines_user ON public.fixed_routines (user_id);

ALTER TABLE public.fixed_routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public fixed_routines all" ON public.fixed_routines;
CREATE POLICY "Public fixed_routines all" ON public.fixed_routines FOR ALL USING (true);
GRANT ALL ON TABLE public.fixed_routines TO anon, authenticated, service_role;

-- 3. Handover Logs (Notes, moods, sleep, transitions shared with co-parent)
CREATE TABLE IF NOT EXISTS public.handover_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE CASCADE,
  datum TEXT NOT NULL,
  richting_key TEXT NOT NULL DEFAULT 'handover.directionToOther',
  mood TEXT,
  sleep TEXT,
  transition TEXT,
  topics JSONB DEFAULT '[]'::jsonb,
  note TEXT,
  positive_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_handover_logs_user ON public.handover_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_handover_logs_child ON public.handover_logs (child_id);
CREATE INDEX IF NOT EXISTS idx_handover_logs_created_at ON public.handover_logs (created_at DESC);

ALTER TABLE public.handover_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public handover_logs all" ON public.handover_logs;
CREATE POLICY "Public handover_logs all" ON public.handover_logs FOR ALL USING (true);
GRANT ALL ON TABLE public.handover_logs TO anon, authenticated, service_role;

-- 4. Vacations & Planning (Holidays, proposals, and agreements)
CREATE TABLE IF NOT EXISTS public.vacations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'voorstel', 'afgesproken')),
  assigned_to TEXT DEFAULT 'open',
  assigned_parent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  proposed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details TEXT,
  travel_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacations_created_by ON public.vacations (created_by);
CREATE INDEX IF NOT EXISTS idx_vacations_assigned_parent_id ON public.vacations (assigned_parent_id);
CREATE INDEX IF NOT EXISTS idx_vacations_status ON public.vacations (status);

ALTER TABLE public.vacations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public vacations all" ON public.vacations;
CREATE POLICY "Public vacations all" ON public.vacations FOR ALL USING (true);
GRANT ALL ON TABLE public.vacations TO anon, authenticated, service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.handover_checklist_items;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fixed_routines;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.handover_logs;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.vacations;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;
-- ==============================================================================
-- MILESTONE 2: DYNAMIC PARENT FUNCTIONALITY TABLES
-- ==============================================================================

-- 1. Tasks Table (Shared & Individual Child Tasks)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  assigned_to TEXT,
  deadline DATE,
  recurrence TEXT DEFAULT 'eenmalig',
  reminder_days INT DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  transfer_to TEXT,
  caregiver_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure all tasks columns exist
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS caregiver_ids TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON public.tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_child_id ON public.tasks (child_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON public.tasks (is_completed);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public tasks all" ON public.tasks;
CREATE POLICY "Public tasks all" ON public.tasks FOR ALL USING (true);
GRANT ALL ON TABLE public.tasks TO anon, authenticated, service_role;

-- 2. Belongings & Packing Items Alterations
ALTER TABLE public.handover_checklist_items ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'mee';
ALTER TABLE public.handover_checklist_items ADD COLUMN IF NOT EXISTS location TEXT;

-- 3. Documents Table (Family & Child Documents)
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Algemeen',
  file_path TEXT NOT NULL,
  file_size INT DEFAULT 0,
  mime_type TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents (user_id);
CREATE INDEX IF NOT EXISTS idx_documents_child_id ON public.documents (child_id);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents (category);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public documents all" ON public.documents;
CREATE POLICY "Public documents all" ON public.documents FOR ALL USING (true);
GRANT ALL ON TABLE public.documents TO anon, authenticated, service_role;

-- 4. Shared Moments Table (Positive Memories & Milestones)
CREATE TABLE IF NOT EXISTS public.shared_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  is_milestone BOOLEAN NOT NULL DEFAULT false,
  is_private BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shared_moments_user_id ON public.shared_moments (user_id);
CREATE INDEX IF NOT EXISTS idx_shared_moments_child_id ON public.shared_moments (child_id);

ALTER TABLE public.shared_moments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public shared_moments all" ON public.shared_moments;
CREATE POLICY "Public shared_moments all" ON public.shared_moments FOR ALL USING (true);
GRANT ALL ON TABLE public.shared_moments TO anon, authenticated, service_role;

-- 5. Parent Agreements & Decisions Table
CREATE TABLE IF NOT EXISTS public.parent_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Overig',
  agreement_type TEXT NOT NULL DEFAULT 'agreement',
  status TEXT NOT NULL DEFAULT 'active',
  proposed_by UUID REFERENCES public.profiles(id),
  proposal_type TEXT,
  proposal_text TEXT,
  co_parent_response TEXT,
  co_parent_responded_at TIMESTAMPTZ,
  history JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_parent_agreements_user_id ON public.parent_agreements (user_id);
CREATE INDEX IF NOT EXISTS idx_parent_agreements_child_id ON public.parent_agreements (child_id);
CREATE INDEX IF NOT EXISTS idx_parent_agreements_status ON public.parent_agreements (status);

ALTER TABLE public.parent_agreements ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES public.children(id) ON DELETE SET NULL;
ALTER TABLE public.parent_agreements ADD COLUMN IF NOT EXISTS proposed_by UUID REFERENCES public.profiles(id);
ALTER TABLE public.parent_agreements ADD COLUMN IF NOT EXISTS proposal_type TEXT;
ALTER TABLE public.parent_agreements ADD COLUMN IF NOT EXISTS proposal_text TEXT;
ALTER TABLE public.parent_agreements ADD COLUMN IF NOT EXISTS co_parent_response TEXT;
ALTER TABLE public.parent_agreements ADD COLUMN IF NOT EXISTS co_parent_responded_at TIMESTAMPTZ;
ALTER TABLE public.parent_agreements ADD COLUMN IF NOT EXISTS history JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.parent_agreements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public parent_agreements all" ON public.parent_agreements;
CREATE POLICY "Public parent_agreements all" ON public.parent_agreements FOR ALL USING (true);
GRANT ALL ON TABLE public.parent_agreements TO anon, authenticated, service_role;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.documents;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shared_moments;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.parent_agreements;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;

-- ==============================================================================
-- MILESTONE 3: CALENDAR, SETTLEMENTS, CARE PROPOSALS & EXPENSES
-- ==============================================================================

-- 1. Ensure all modern Calendar Events columns exist
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS is_all_day BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS is_shared BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS end_time TIME;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS attendance_needed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'uncoordinated';
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS reminder TEXT DEFAULT 'geen';

-- 2. Settlements Table (Afrekenen & expense settlement tracking)
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL,
  period TEXT DEFAULT 'maand',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'nog-te-betalen', 'betaalverzoek-gedeeld', 'aangegeven', 'wacht-op-ontvanger', 'ontvangst-bevestigd', 'afgerond')),
  payment_link TEXT,
  reference_code TEXT,
  expense_ids UUID[] DEFAULT ARRAY[]::UUID[],
  paid_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settlements DROP CONSTRAINT IF EXISTS settlements_status_check;
ALTER TABLE public.settlements ADD CONSTRAINT settlements_status_check CHECK (status IN ('open', 'nog-te-betalen', 'betaalverzoek-gedeeld', 'aangegeven', 'wacht-op-ontvanger', 'ontvangst-bevestigd', 'afgerond'));

CREATE INDEX IF NOT EXISTS idx_settlements_payer ON public.settlements (payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_receiver ON public.settlements (receiver_id);
CREATE INDEX IF NOT EXISTS idx_settlements_status ON public.settlements (status);

ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public settlements all" ON public.settlements;
CREATE POLICY "Public settlements all" ON public.settlements FOR ALL USING (true);
GRANT ALL ON TABLE public.settlements TO anon, authenticated, service_role;

-- 3. Care Schedule Proposals Table (Verzoeken om te wijzigen)
CREATE TABLE IF NOT EXISTS public.care_schedule_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_ids UUID[] DEFAULT ARRAY[]::UUID[],
  type TEXT NOT NULL DEFAULT 'onetime' CHECK (type IN ('onetime', 'recurring', 'swap')),
  proposal_date DATE NOT NULL,
  swap_with_date DATE,
  proposing_parent_name TEXT,
  target_parent_name TEXT,
  target_parent_id UUID,
  note TEXT,
  impact_note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'counterproposal', 'declined')),
  counter_date DATE,
  counter_note TEXT,
  responded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.care_schedule_proposals ADD COLUMN IF NOT EXISTS target_parent_name TEXT;
ALTER TABLE public.care_schedule_proposals ADD COLUMN IF NOT EXISTS target_parent_id UUID;

CREATE INDEX IF NOT EXISTS idx_care_schedule_proposals_created_by ON public.care_schedule_proposals (created_by);
CREATE INDEX IF NOT EXISTS idx_care_schedule_proposals_status ON public.care_schedule_proposals (status);

ALTER TABLE public.care_schedule_proposals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public care_schedule_proposals all" ON public.care_schedule_proposals;
CREATE POLICY "Public care_schedule_proposals all" ON public.care_schedule_proposals FOR ALL USING (true);
GRANT ALL ON TABLE public.care_schedule_proposals TO anon, authenticated, service_role;

-- 4. Savings Pots Table (Spaarpotjes)
CREATE TABLE IF NOT EXISTS public.savings_pots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  target_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  current_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  account_name TEXT,
  iban TEXT,
  color TEXT DEFAULT '#3C6E71',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.savings_pots ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.savings_pots ADD COLUMN IF NOT EXISTS iban TEXT;

CREATE INDEX IF NOT EXISTS idx_savings_pots_child ON public.savings_pots (child_id);

ALTER TABLE public.savings_pots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public savings_pots all" ON public.savings_pots;
CREATE POLICY "Public savings_pots all" ON public.savings_pots FOR ALL USING (true);
GRANT ALL ON TABLE public.savings_pots TO anon, authenticated, service_role;

-- 5. Recurring Expenses Table (Vaste lasten)
CREATE TABLE IF NOT EXISTS public.recurring_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID,
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  interval TEXT NOT NULL DEFAULT 'monthly' CHECK (interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),
  payer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  split_ratio NUMERIC(5, 2) DEFAULT 50.00,
  category TEXT DEFAULT 'Overig',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_payer ON public.recurring_expenses (payer_id);

ALTER TABLE public.recurring_expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public recurring_expenses all" ON public.recurring_expenses;
CREATE POLICY "Public recurring_expenses all" ON public.recurring_expenses FOR ALL USING (true);
GRANT ALL ON TABLE public.recurring_expenses TO anon, authenticated, service_role;

-- 22. Still Needed Items Table ("Nog nodig")
CREATE TABLE IF NOT EXISTS public.still_needed_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  child_id UUID REFERENCES public.children(id) ON DELETE SET NULL,
  child_name TEXT,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'Nodig',
  is_purchased BOOLEAN NOT NULL DEFAULT false,
  purchased_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  budget_id UUID REFERENCES public.budget_proposals(id) ON DELETE SET NULL,
  deadline TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_still_needed_items_user_id ON public.still_needed_items (user_id);
CREATE INDEX IF NOT EXISTS idx_still_needed_items_child_id ON public.still_needed_items (child_id);
CREATE INDEX IF NOT EXISTS idx_still_needed_items_is_purchased ON public.still_needed_items (is_purchased);

ALTER TABLE public.still_needed_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public still_needed_items all" ON public.still_needed_items;
CREATE POLICY "Public still_needed_items all" ON public.still_needed_items FOR ALL USING (true);
GRANT ALL ON TABLE public.still_needed_items TO anon, authenticated, service_role;

-- Enable Realtime for Milestone 3 tables
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_schedule_proposals;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.savings_pots;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_expenses;
  EXCEPTION WHEN others THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.still_needed_items;
  EXCEPTION WHEN others THEN NULL;
  END;
END
$$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';




