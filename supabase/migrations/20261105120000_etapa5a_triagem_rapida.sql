-- Etapa 5a, second migration: a quick protocol session needs the red flag triage, and with a red flag it is
-- completed (or gets an intervention) only after the professional clears it. Applied after publishing the screens
-- that do the triage: the old ones create sessions without red_flags.
-- Rollback: supabase/rollbacks/20261105120000_etapa5a_triagem_rapida_down.sql

-- Precondition: 20261104120000 is applied, and this runs as the role that owns its functions
DO $$
BEGIN
  IF to_regprocedure('public.red_flags_cleared(uuid,uuid,text[],bigint)') IS NULL THEN
    RAISE EXCEPTION 'etapa 5a: aplicar 20261104120000_etapa5a_red_flags antes';
  END IF;
  IF (SELECT pg_get_userbyid(p.proowner) FROM pg_proc p
      WHERE p.oid = 'public.red_flags_cleared(uuid,uuid,text[],bigint)'::regprocedure) IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION 'etapa 5a: a migration precisa rodar como o dono das funções da 20261104120000';
  END IF;
END $$;

-- One trigger computes the version and then applies the rules, so the rules always see this row's own version:
-- a red flag lit by the same UPDATE that completes the session gets a new version, which no earlier clearance has.
-- It replaces quick_session_red_flags_version (20261104120000), so the order of triggers by name does not matter.
CREATE OR REPLACE FUNCTION public.guard_quick_session_red_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _active text[];
BEGIN
  _active := public.active_red_flags(NEW.red_flags, NULL);
  IF TG_OP = 'INSERT' THEN
    NEW.red_flags_version := public.red_flags_next_version(NULL, _active, 0);
    -- No triage, no session
    IF jsonb_typeof(NEW.red_flags) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'triage_missing' USING ERRCODE = 'P0001';
    END IF;
    -- The intervention only comes in through an UPDATE, which goes through the lock below
    IF NEW.intervention_applied IS NOT NULL OR NEW.status IS DISTINCT FROM 'in_progress' THEN
      RAISE EXCEPTION 'a quick protocol session starts in progress and without an intervention' USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  NEW.red_flags_version := public.red_flags_next_version(
    public.active_red_flags(OLD.red_flags, NULL), _active, OLD.red_flags_version);
  IF NEW.status = 'completed' OR NEW.intervention_applied IS NOT NULL THEN
    IF jsonb_typeof(NEW.red_flags) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'triage_missing' USING ERRCODE = 'P0001';
    END IF;
    IF NOT public.red_flags_cleared(NULL, NEW.id, _active, NEW.red_flags_version) THEN
      RAISE EXCEPTION 'red_flags_not_cleared' USING ERRCODE = 'P0001';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_quick_session_red_flags() FROM PUBLIC, anon, authenticated, service_role;

DROP TRIGGER IF EXISTS quick_session_red_flags_version ON public.quick_protocol_sessions;
DROP TRIGGER IF EXISTS guard_quick_session_red_flags ON public.quick_protocol_sessions;
CREATE TRIGGER guard_quick_session_red_flags
BEFORE INSERT OR UPDATE ON public.quick_protocol_sessions
FOR EACH ROW
EXECUTE FUNCTION public.guard_quick_session_red_flags();

-- Postcondition: same owner rule as 20261104120000
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid = 'public.guard_quick_session_red_flags()'::regprocedure
      AND p.proowner = (SELECT q.proowner FROM pg_proc q WHERE q.oid = 'public.save_assessment_protocol(uuid,jsonb,jsonb)'::regprocedure)
      AND pg_get_userbyid(p.proowner) NOT IN ('anon', 'authenticated', 'service_role')
      AND NOT pg_has_role('anon', p.proowner, 'MEMBER')
      AND NOT pg_has_role('authenticated', p.proowner, 'MEMBER')
      AND NOT pg_has_role('service_role', p.proowner, 'MEMBER')) THEN
    RAISE EXCEPTION 'etapa 5a: dono inesperado de guard_quick_session_red_flags';
  END IF;
END $$;
