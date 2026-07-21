
-- 1) user_roles: explicit deny for writes from client roles.
--    handle_new_user() is SECURITY DEFINER and runs as the function owner, so
--    the signup trigger continues to insert the default 'student' role.
DROP POLICY IF EXISTS "Only system can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only system can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only system can delete user roles" ON public.user_roles;

CREATE POLICY "Only system can insert user roles"
ON public.user_roles FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Only system can update user roles"
ON public.user_roles FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Only system can delete user roles"
ON public.user_roles FOR DELETE TO authenticated, anon
USING (false);

-- 2) organizations: explicit deny for writes from client roles.
DROP POLICY IF EXISTS "Deny organization inserts" ON public.organizations;
DROP POLICY IF EXISTS "Deny organization updates" ON public.organizations;
DROP POLICY IF EXISTS "Deny organization deletes" ON public.organizations;

CREATE POLICY "Deny organization inserts"
ON public.organizations FOR INSERT TO authenticated, anon
WITH CHECK (false);

CREATE POLICY "Deny organization updates"
ON public.organizations FOR UPDATE TO authenticated, anon
USING (false) WITH CHECK (false);

CREATE POLICY "Deny organization deletes"
ON public.organizations FOR DELETE TO authenticated, anon
USING (false);

-- 3) clinical_threshold_profiles: DELETE policy for professionals in the org.
DROP POLICY IF EXISTS "Professionals can delete threshold profiles" ON public.clinical_threshold_profiles;
CREATE POLICY "Professionals can delete threshold profiles"
ON public.clinical_threshold_profiles FOR DELETE TO authenticated
USING (
  public.is_org_member(organization_id, auth.uid())
  AND public.has_role(auth.uid(), 'professional'::app_role)
);

-- 4) Storage: remove overly permissive signed-URL policy.
DROP POLICY IF EXISTS "Users can read assessment media via signed URLs" ON storage.objects;

-- 5) Lock down SECURITY DEFINER function execution.
--    handle_new_user + update_updated_at_column are trigger functions — no client should execute them.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

--    has_role / is_org_member are used by RLS policies for authenticated users; revoke from anon only.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated;

--    activate_threshold_profile is an RPC for authenticated professionals only.
REVOKE EXECUTE ON FUNCTION public.activate_threshold_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.activate_threshold_profile(uuid) TO authenticated;
