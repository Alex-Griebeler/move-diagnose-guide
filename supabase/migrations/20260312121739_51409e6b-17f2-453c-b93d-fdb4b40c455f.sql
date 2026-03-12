
-- ============================================
-- Phase 3: Clinical Governance Tables
-- Idempotent migration with bootstrap
-- ============================================

-- 1. Organizations
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Organization Members
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_in_org text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- 3. Clinical Threshold Profiles
CREATE TABLE IF NOT EXISTS public.clinical_threshold_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_name text NOT NULL DEFAULT 'Default',
  evidence_version text NOT NULL DEFAULT '2026.03.v3',
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_threshold_profiles ENABLE ROW LEVEL SECURITY;

-- Unique active profile per organization (prevents race conditions at DB level)
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_per_org
  ON public.clinical_threshold_profiles (organization_id) WHERE is_active = true;

-- 4. Clinical Threshold Audit Log
CREATE TABLE IF NOT EXISTS public.clinical_threshold_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES public.clinical_threshold_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  changed_by uuid NOT NULL DEFAULT auth.uid(),
  before_config jsonb,
  after_config jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.clinical_threshold_audit_log ENABLE ROW LEVEL SECURITY;

-- 5. Security Definer: is_org_member
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = _user_id
  )
$$;

-- 6. Atomic Activation: activate_threshold_profile
CREATE OR REPLACE FUNCTION public.activate_threshold_profile(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_old_config jsonb;
  v_new_config jsonb;
  v_caller uuid;
BEGIN
  v_caller := auth.uid();

  -- Validate caller is a professional
  IF NOT public.has_role(v_caller, 'professional') THEN
    RAISE EXCEPTION 'Only professionals can activate threshold profiles';
  END IF;

  -- Lock the target profile row and get org_id
  SELECT organization_id, config INTO v_org_id, v_new_config
  FROM public.clinical_threshold_profiles
  WHERE id = p_profile_id
  FOR UPDATE;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Profile not found: %', p_profile_id;
  END IF;

  -- Validate caller is member of the organization
  IF NOT public.is_org_member(v_org_id, v_caller) THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  -- Get current active profile config for audit
  SELECT config INTO v_old_config
  FROM public.clinical_threshold_profiles
  WHERE organization_id = v_org_id AND is_active = true;

  -- Deactivate all profiles in this org
  UPDATE public.clinical_threshold_profiles
  SET is_active = false, updated_at = now()
  WHERE organization_id = v_org_id AND is_active = true;

  -- Activate the requested profile
  UPDATE public.clinical_threshold_profiles
  SET is_active = true, updated_at = now()
  WHERE id = p_profile_id;

  -- Audit log
  INSERT INTO public.clinical_threshold_audit_log (profile_id, action, changed_by, before_config, after_config, reason)
  VALUES (p_profile_id, 'activate', v_caller, v_old_config, v_new_config, 'Profile activated via RPC');
END;
$$;

-- 7. RLS Policies

-- Organizations: members can view
CREATE POLICY "Members can view their organizations"
  ON public.organizations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()
  ));

-- Organization Members: members can view members of their orgs
CREATE POLICY "Members can view org members"
  ON public.organization_members FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

-- Professionals can add members
CREATE POLICY "Professionals can add org members"
  ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id, auth.uid())
    AND public.has_role(auth.uid(), 'professional')
  );

-- Threshold Profiles: org members can read
CREATE POLICY "Org members can view threshold profiles"
  ON public.clinical_threshold_profiles FOR SELECT TO authenticated
  USING (public.is_org_member(organization_id, auth.uid()));

-- Professionals can create profiles
CREATE POLICY "Professionals can create threshold profiles"
  ON public.clinical_threshold_profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_member(organization_id, auth.uid())
    AND public.has_role(auth.uid(), 'professional')
  );

-- Professionals can update profiles in their org
CREATE POLICY "Professionals can update threshold profiles"
  ON public.clinical_threshold_profiles FOR UPDATE TO authenticated
  USING (
    public.is_org_member(organization_id, auth.uid())
    AND public.has_role(auth.uid(), 'professional')
  );

-- Audit log: org members can read via profile
CREATE POLICY "Org members can view audit logs"
  ON public.clinical_threshold_audit_log FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.clinical_threshold_profiles tp
    WHERE tp.id = clinical_threshold_audit_log.profile_id
    AND public.is_org_member(tp.organization_id, auth.uid())
  ));

-- Audit log insert is done by security definer function only
CREATE POLICY "System can insert audit logs"
  ON public.clinical_threshold_audit_log FOR INSERT TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- 8. Bootstrap: Create default org and enroll all existing profiles
DO $$
DECLARE
  v_org_id uuid;
  v_user RECORD;
BEGIN
  -- Create default organization if not exists
  SELECT id INTO v_org_id FROM public.organizations WHERE name = 'Default' LIMIT 1;
  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name) VALUES ('Default') RETURNING id INTO v_org_id;
  END IF;

  -- Enroll all existing profiles as members
  FOR v_user IN SELECT id FROM public.profiles LOOP
    INSERT INTO public.organization_members (organization_id, user_id, role_in_org)
    VALUES (v_org_id, v_user.id, 'member')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
  END LOOP;
END;
$$;

-- 9. Updated_at triggers
CREATE OR REPLACE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_clinical_threshold_profiles_updated_at
  BEFORE UPDATE ON public.clinical_threshold_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
