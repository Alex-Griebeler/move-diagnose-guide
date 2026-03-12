-- Phase 3 Residual Fixes: Dedup + Unique Constraint + Idempotent Policies

-- 1. Deduplicate global_test_results using ROW_NUMBER (keep most recent)
DELETE FROM global_test_results
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY assessment_id, test_name
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rn
    FROM global_test_results
  ) ranked
  WHERE rn > 1
);

-- 2. Add unique constraint (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_global_test_results_assessment_test'
  ) THEN
    ALTER TABLE global_test_results
      ADD CONSTRAINT uq_global_test_results_assessment_test UNIQUE (assessment_id, test_name);
  END IF;
END $$;

-- 3. Idempotent governance policies

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organizations' AND policyname = 'Members can view their organizations') THEN
    CREATE POLICY "Members can view their organizations" ON public.organizations FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM organization_members om WHERE om.organization_id = organizations.id AND om.user_id = auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_members' AND policyname = 'Members can view org members') THEN
    CREATE POLICY "Members can view org members" ON public.organization_members FOR SELECT TO authenticated
      USING (is_org_member(organization_id, auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'organization_members' AND policyname = 'Professionals can add org members') THEN
    CREATE POLICY "Professionals can add org members" ON public.organization_members FOR INSERT TO authenticated
      WITH CHECK (is_org_member(organization_id, auth.uid()) AND has_role(auth.uid(), 'professional'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_threshold_profiles' AND policyname = 'Org members can view threshold profiles') THEN
    CREATE POLICY "Org members can view threshold profiles" ON public.clinical_threshold_profiles FOR SELECT TO authenticated
      USING (is_org_member(organization_id, auth.uid()));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_threshold_profiles' AND policyname = 'Professionals can create threshold profiles') THEN
    CREATE POLICY "Professionals can create threshold profiles" ON public.clinical_threshold_profiles FOR INSERT TO authenticated
      WITH CHECK (is_org_member(organization_id, auth.uid()) AND has_role(auth.uid(), 'professional'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_threshold_profiles' AND policyname = 'Professionals can update threshold profiles') THEN
    CREATE POLICY "Professionals can update threshold profiles" ON public.clinical_threshold_profiles FOR UPDATE TO authenticated
      USING (is_org_member(organization_id, auth.uid()) AND has_role(auth.uid(), 'professional'::app_role));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_threshold_audit_log' AND policyname = 'Org members can view audit logs') THEN
    CREATE POLICY "Org members can view audit logs" ON public.clinical_threshold_audit_log FOR SELECT TO authenticated
      USING (EXISTS (SELECT 1 FROM clinical_threshold_profiles tp WHERE tp.id = clinical_threshold_audit_log.profile_id AND is_org_member(tp.organization_id, auth.uid())));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'clinical_threshold_audit_log' AND policyname = 'System can insert audit logs') THEN
    CREATE POLICY "System can insert audit logs" ON public.clinical_threshold_audit_log FOR INSERT TO authenticated
      WITH CHECK (changed_by = auth.uid());
  END IF;
END $$;