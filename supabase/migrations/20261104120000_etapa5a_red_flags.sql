-- Etapa 5a (C-01): a red flag marked in the anamnesis locks the protocol until the professional who owns the
-- assessment clears it, with a justification. The lock is enforced here, not only on the screen.
-- First of two migrations: everything the published app copes with. The quick protocol rules the old screens do
-- not follow are in 20261105120000_etapa5a_triagem_rapida.sql, applied after publishing the new screens.
-- Rollback (after the 20261105120000 one): supabase/rollbacks/20261104120000_etapa5a_red_flags_down.sql

-- Precondition: this migration runs as a role clients cannot be or become, and that role owns protocols and
-- save_assessment_protocol. Every SECURITY DEFINER function below gets that owner, and the protocols guard lets
-- only the table owner write: a client that could become the owner could take the save path around the lock.
DO $$
BEGIN
  IF current_user IN ('anon', 'authenticated', 'service_role')
     OR pg_has_role('anon', current_user, 'MEMBER')
     OR pg_has_role('authenticated', current_user, 'MEMBER')
     OR pg_has_role('service_role', current_user, 'MEMBER') THEN
    RAISE EXCEPTION 'etapa 5a: a migration precisa rodar como um papel que os clientes não assumem';
  END IF;
  IF (SELECT pg_get_userbyid(c.relowner) FROM pg_class c WHERE c.oid = 'public.protocols'::regclass) IS DISTINCT FROM current_user
     OR (SELECT pg_get_userbyid(p.proowner) FROM pg_proc p
         WHERE p.oid = 'public.save_assessment_protocol(uuid,jsonb,jsonb)'::regprocedure) IS DISTINCT FROM current_user THEN
    RAISE EXCEPTION 'etapa 5a: protocols e save_assessment_protocol precisam ser do papel que roda a migration';
  END IF;
END $$;

-- =============================================
-- a) Active red flags
-- =============================================
-- The keys whose value is JSON true, sorted. An unknown key counts too: the safe side is to lock.
-- has_red_flags comes from the screen and is never trusted alone, but if it is true with no key true the
-- result is {unspecified}, so it still locks. Anything that is not an object counts as no red flag.
CREATE OR REPLACE FUNCTION public.active_red_flags(_flags jsonb, _has boolean)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN cardinality(f.keys) > 0 THEN f.keys
    WHEN _has IS TRUE THEN ARRAY['unspecified']
    ELSE ARRAY[]::text[]
  END
  FROM (
    SELECT ARRAY(
      SELECT e.key
      FROM jsonb_each(CASE WHEN jsonb_typeof(_flags) = 'object' THEN _flags ELSE '{}'::jsonb END) AS e
      WHERE e.value = 'true'::jsonb
      ORDER BY e.key COLLATE "C"
    ) AS keys
  ) AS f
$$;

-- =============================================
-- b) Red flag version
-- =============================================
-- A red flag that lights up (new, or unmarked and marked again) takes the next number, and a clearance is valid
-- only for the version it was given in. Numbers never repeat; clients cannot reset the sequence.
CREATE SEQUENCE IF NOT EXISTS public.red_flags_version_seq;
REVOKE ALL ON SEQUENCE public.red_flags_version_seq FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE public.anamnesis_responses
  ADD COLUMN IF NOT EXISTS red_flags_version bigint NOT NULL DEFAULT 0;

-- Quick protocol triage: null means not done yet
ALTER TABLE public.quick_protocol_sessions
  ADD COLUMN IF NOT EXISTS red_flags jsonb,
  ADD COLUMN IF NOT EXISTS red_flags_version bigint NOT NULL DEFAULT 0;

-- _old is null on insert (or when the row moves to another assessment). A new set of red flags that adds any
-- flag gets the next number; unmarking keeps the version. Whatever the client sends is ignored.
CREATE OR REPLACE FUNCTION public.red_flags_next_version(_old text[], _new text[], _version bigint)
RETURNS bigint
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN _old IS NULL THEN CASE WHEN cardinality(_new) > 0 THEN nextval('public.red_flags_version_seq') ELSE 0 END
    WHEN _old @> _new THEN _version
    ELSE nextval('public.red_flags_version_seq')
  END
$$;

-- =============================================
-- c) Clearances and revocations
-- =============================================
-- Written only by the functions below, with the active red flags and their version copied by the server.
-- Immutable: a revocation is a new row. The cascade removes them only with a deleted open assessment or session.
CREATE TABLE IF NOT EXISTS public.red_flag_clearances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid REFERENCES public.assessments(id) ON DELETE CASCADE,
  quick_session_id uuid REFERENCES public.quick_protocol_sessions(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL,
  justification text NOT NULL
    CHECK (char_length(justification) BETWEEN 20 AND 2000 AND justification = btrim(justification, E' \t\r\n')),
  cleared_flags text[] NOT NULL CHECK (cardinality(cleared_flags) > 0),
  red_flags_version bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(assessment_id, quick_session_id) = 1)
);

CREATE INDEX IF NOT EXISTS idx_red_flag_clearances_assessment ON public.red_flag_clearances(assessment_id);
CREATE INDEX IF NOT EXISTS idx_red_flag_clearances_quick_session ON public.red_flag_clearances(quick_session_id);

CREATE TABLE IF NOT EXISTS public.red_flag_clearance_revocations (
  clearance_id uuid PRIMARY KEY REFERENCES public.red_flag_clearances(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL,
  reason text NOT NULL
    CHECK (char_length(reason) BETWEEN 20 AND 2000 AND reason = btrim(reason, E' \t\r\n')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.red_flag_clearances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.red_flag_clearance_revocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Professionals can view their red flag clearances" ON public.red_flag_clearances;
CREATE POLICY "Professionals can view their red flag clearances"
ON public.red_flag_clearances FOR SELECT TO authenticated
USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can view their red flag revocations" ON public.red_flag_clearance_revocations;
CREATE POLICY "Professionals can view their red flag revocations"
ON public.red_flag_clearance_revocations FOR SELECT TO authenticated
USING (professional_id = auth.uid());

-- A direct write is a permission error, not "0 rows"
REVOKE ALL ON public.red_flag_clearances, public.red_flag_clearance_revocations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.red_flag_clearances, public.red_flag_clearance_revocations TO authenticated, service_role;

-- Reapplied after a rollback (which keeps the rows and the sequence), the next version is still above any stored one
DO $$
BEGIN
  PERFORM setval('public.red_flags_version_seq', greatest(
    (SELECT max(r.red_flags_version) FROM public.anamnesis_responses r),
    (SELECT max(q.red_flags_version) FROM public.quick_protocol_sessions q),
    (SELECT max(c.red_flags_version) FROM public.red_flag_clearances c),
    (SELECT s.last_value FROM public.red_flags_version_seq s)));
END $$;

-- =============================================
-- e) The lock
-- =============================================
-- The newest clearance that is not revoked, was given in the current version and covers every active red flag.
-- Each clearance holds the whole set and its version, so old partial clearances do not add up.
CREATE OR REPLACE FUNCTION public.valid_red_flag_clearance(_assessment_id uuid, _quick_session_id uuid, _active text[], _version bigint)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT c.id
  FROM public.red_flag_clearances c
  WHERE ((_assessment_id IS NOT NULL AND c.assessment_id = _assessment_id)
      OR (_quick_session_id IS NOT NULL AND c.quick_session_id = _quick_session_id))
    AND c.red_flags_version = _version
    AND c.cleared_flags @> _active
    AND NOT EXISTS (SELECT 1 FROM public.red_flag_clearance_revocations r WHERE r.clearance_id = c.id)
  ORDER BY c.created_at DESC, c.id
  LIMIT 1
$$;

-- No active red flag, or a valid clearance. A null set (a caller bug) does not pass.
CREATE OR REPLACE FUNCTION public.red_flags_cleared(_assessment_id uuid, _quick_session_id uuid, _active text[], _version bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT _active IS NOT NULL
    AND (cardinality(_active) = 0
      OR public.valid_red_flag_clearance(_assessment_id, _quick_session_id, _active, _version) IS NOT NULL)
$$;

-- e.1) The save checks the lock after locking the assessment and then its anamnesis, before writing anything.
-- Same text as etapa 3d otherwise.
-- Runs as its owner, so RLS and guard_assessment_update (which only checks client roles) do not apply
-- inside it: every rule they enforced for this path is checked here explicitly.
-- Any error undoes every write, so no assessment is left half saved.
CREATE OR REPLACE FUNCTION public.save_assessment_protocol(
  _assessment_id uuid,
  _protocol jsonb,
  _findings jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _assessment record;
  _protocol_id uuid;
  _active text[];
  _version bigint;
BEGIN
  -- A forgotten argument must not become "no findings"
  IF jsonb_typeof(_protocol) IS DISTINCT FROM 'object' OR jsonb_typeof(_findings) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'protocol must be an object and findings a list' USING ERRCODE = '22023';
  END IF;

  IF _uid IS NULL OR NOT public.has_role(_uid, 'professional'::public.app_role) THEN
    RAISE EXCEPTION 'only a professional can save a protocol' USING ERRCODE = '42501';
  END IF;

  -- Serializes concurrent saves of the same assessment
  SELECT a.professional_id, a.status INTO _assessment
  FROM public.assessments a
  WHERE a.id = _assessment_id
  FOR UPDATE;

  -- Someone else's assessment gets the same answer as a missing one
  IF NOT FOUND OR _assessment.professional_id IS DISTINCT FROM _uid THEN
    RAISE EXCEPTION 'assessment not found or not yours' USING ERRCODE = '42501';
  END IF;

  -- A repeated save (second click, or a retry after a lost response) gets the saved protocol back
  IF _assessment.status = 'completed' THEN
    SELECT p.id INTO _protocol_id
    FROM public.protocols p
    WHERE p.assessment_id = _assessment_id;
    IF _protocol_id IS NULL THEN
      RAISE EXCEPTION 'completed assessment without a protocol' USING ERRCODE = '42501';
    END IF;
    RETURN _protocol_id;
  END IF;

  IF _assessment.status NOT IN ('draft', 'in_progress') THEN
    RAISE EXCEPTION 'only an open assessment can be completed' USING ERRCODE = '42501';
  END IF;

  -- Etapa 5a: the anamnesis row is the queue shared with its writers. A red flag marked before this lock is
  -- seen here (the lock returns the committed row); one marked after waits and then finds the assessment
  -- completed (guard_anamnesis_red_flags). Without an anamnesis there was no triage.
  SELECT public.active_red_flags(r.red_flags, r.has_red_flags), r.red_flags_version INTO _active, _version
  FROM public.anamnesis_responses r
  WHERE r.assessment_id = _assessment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'anamnesis_missing' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.red_flags_cleared(_assessment_id, NULL, _active, _version) THEN
    RAISE EXCEPTION 'red_flags_not_cleared' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.protocols (
    assessment_id, name, priority_level, frequency_per_week, duration_weeks, phase, exercises
  )
  VALUES (
    _assessment_id,
    _protocol->>'name',
    (_protocol->>'priority_level')::public.priority_level,
    (_protocol->>'frequency_per_week')::integer,
    (_protocol->>'duration_weeks')::integer,
    1,
    COALESCE(_protocol->'exercises', '[]'::jsonb)
  )
  RETURNING id INTO _protocol_id;

  INSERT INTO public.functional_findings (
    assessment_id, classification_tag, body_region, severity, hyperactive_muscles, hypoactive_muscles,
    priority_score, context_weight, biomechanical_importance
  )
  SELECT
    _assessment_id, f.classification_tag, f.body_region, f.severity, COALESCE(f.hyperactive_muscles, '[]'::jsonb),
    COALESCE(f.hypoactive_muscles, '[]'::jsonb), f.priority_score, f.context_weight, f.biomechanical_importance
  FROM jsonb_to_recordset(_findings) AS f(
    classification_tag text,
    body_region text,
    severity public.severity_level,
    hyperactive_muscles jsonb,
    hypoactive_muscles jsonb,
    priority_score numeric,
    context_weight integer,
    biomechanical_importance integer
  );

  -- The cached generation (ProtocolGenerator) is no longer needed once the protocol is saved
  DELETE FROM public.assessment_drafts
  WHERE assessment_id = _assessment_id AND step_type = 'protocol';

  -- What guard_assessment_update does for clients: the server sets the completion date
  UPDATE public.assessments
  SET status = 'completed', completed_at = now()
  WHERE id = _assessment_id;

  RETURN _protocol_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_assessment_protocol(uuid, jsonb, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_assessment_protocol(uuid, jsonb, jsonb) TO authenticated;

-- e.2) Only the owner of protocols writes it: save_assessment_protocol (same owner, checked above and below) and
-- the cascade of a deleted assessment, which PostgreSQL runs as the owner of protocols. service_role, a future
-- permissive policy or a GRANT do not reopen direct writes. Insert and update check the lock again.
-- SECURITY INVOKER on purpose: current_user must be whoever writes. It only calls the lock once that is the owner.
CREATE OR REPLACE FUNCTION public.guard_protocol_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  _active text[];
  _version bigint;
BEGIN
  IF current_user IS DISTINCT FROM (SELECT pg_catalog.pg_get_userbyid(c.relowner) FROM pg_catalog.pg_class c WHERE c.oid = TG_RELID) THEN
    RAISE EXCEPTION 'protocols are written only by save_assessment_protocol' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'TRUNCATE' THEN
    RETURN NULL;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  SELECT public.active_red_flags(r.red_flags, r.has_red_flags), r.red_flags_version INTO _active, _version
  FROM public.anamnesis_responses r
  WHERE r.assessment_id = NEW.assessment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'anamnesis_missing' USING ERRCODE = 'P0001';
  END IF;
  IF NOT public.red_flags_cleared(NEW.assessment_id, NULL, _active, _version) THEN
    RAISE EXCEPTION 'red_flags_not_cleared' USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_protocol_write ON public.protocols;
CREATE TRIGGER guard_protocol_write
BEFORE INSERT OR UPDATE OR DELETE ON public.protocols
FOR EACH ROW
EXECUTE FUNCTION public.guard_protocol_write();

-- TRUNCATE fires no row trigger: same owner rule per statement, and the default grant is taken away
DROP TRIGGER IF EXISTS guard_protocol_truncate ON public.protocols;
CREATE TRIGGER guard_protocol_truncate
BEFORE TRUNCATE ON public.protocols
FOR EACH STATEMENT
EXECUTE FUNCTION public.guard_protocol_write();

REVOKE TRUNCATE ON public.protocols FROM PUBLIC, anon, authenticated, service_role;

-- =============================================
-- f) Anamnesis: version, and no change once the assessment is closed
-- =============================================
-- Lock order: whoever needs the assessment and the anamnesis (save, clear, deleting the assessment with its
-- cascade) locks the assessment first. This trigger does not lock the assessment: the anamnesis row is already
-- locked here (update, delete) or not there yet (insert). It reads the assessment's state in a new command, which
-- sees what was committed, so after waiting for a save it finds the assessment completed.
CREATE OR REPLACE FUNCTION public.guard_anamnesis_red_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _status text;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    SELECT a.status INTO _status FROM public.assessments a WHERE a.id = OLD.assessment_id;
    -- The assessment is gone: this is its cascade
    IF NOT FOUND AND TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    IF _status IS NULL OR _status NOT IN ('draft', 'in_progress') THEN
      RAISE EXCEPTION 'the anamnesis changes only while its assessment is open' USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
  END IF;

  IF TG_OP = 'INSERT' OR NEW.assessment_id IS DISTINCT FROM OLD.assessment_id THEN
    SELECT a.status INTO _status FROM public.assessments a WHERE a.id = NEW.assessment_id;
    IF _status IS NULL OR _status NOT IN ('draft', 'in_progress') THEN
      RAISE EXCEPTION 'the anamnesis changes only while its assessment is open' USING ERRCODE = '42501';
    END IF;
    -- New here: no clearance of this assessment was given for these red flags
    NEW.red_flags_version := public.red_flags_next_version(NULL, public.active_red_flags(NEW.red_flags, NEW.has_red_flags), 0);
  ELSE
    NEW.red_flags_version := public.red_flags_next_version(
      public.active_red_flags(OLD.red_flags, OLD.has_red_flags),
      public.active_red_flags(NEW.red_flags, NEW.has_red_flags),
      OLD.red_flags_version);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_anamnesis_red_flags ON public.anamnesis_responses;
CREATE TRIGGER guard_anamnesis_red_flags
BEFORE INSERT OR UPDATE OR DELETE ON public.anamnesis_responses
FOR EACH ROW
EXECUTE FUNCTION public.guard_anamnesis_red_flags();

-- =============================================
-- g) Quick protocol: the version only (the rules come with 20261105120000)
-- =============================================
CREATE OR REPLACE FUNCTION public.quick_session_red_flags_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.red_flags_version := public.red_flags_next_version(NULL, public.active_red_flags(NEW.red_flags, NULL), 0);
  ELSE
    NEW.red_flags_version := public.red_flags_next_version(
      public.active_red_flags(OLD.red_flags, NULL), public.active_red_flags(NEW.red_flags, NULL), OLD.red_flags_version);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quick_session_red_flags_version ON public.quick_protocol_sessions;
CREATE TRIGGER quick_session_red_flags_version
BEFORE INSERT OR UPDATE ON public.quick_protocol_sessions
FOR EACH ROW
EXECUTE FUNCTION public.quick_session_red_flags_version();

-- =============================================
-- d) Clear and revoke, by the professional who owns the assessment or session
-- =============================================
CREATE OR REPLACE FUNCTION public.clear_assessment_red_flags(_assessment_id uuid, _justification text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _text text := btrim(_justification, E' \t\r\n');
  _assessment record;
  _active text[];
  _version bigint;
  _id uuid;
BEGIN
  IF _text IS NULL OR char_length(_text) NOT BETWEEN 20 AND 2000 THEN
    RAISE EXCEPTION 'the justification needs 20 to 2000 characters' USING ERRCODE = '22023';
  END IF;
  IF _uid IS NULL OR NOT public.has_role(_uid, 'professional'::public.app_role) THEN
    RAISE EXCEPTION 'assessment not found or not yours' USING ERRCODE = '42501';
  END IF;

  -- The assessment first, then its anamnesis, as save_assessment_protocol
  SELECT a.professional_id, a.status INTO _assessment
  FROM public.assessments a
  WHERE a.id = _assessment_id
  FOR UPDATE;
  IF NOT FOUND OR _assessment.professional_id IS DISTINCT FROM _uid OR _assessment.status NOT IN ('draft', 'in_progress') THEN
    RAISE EXCEPTION 'assessment not found or not yours' USING ERRCODE = '42501';
  END IF;

  SELECT public.active_red_flags(r.red_flags, r.has_red_flags), r.red_flags_version INTO _active, _version
  FROM public.anamnesis_responses r
  WHERE r.assessment_id = _assessment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'anamnesis_missing' USING ERRCODE = 'P0001';
  END IF;
  IF cardinality(_active) = 0 THEN
    RAISE EXCEPTION 'no active red flag to clear' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.red_flag_clearances (assessment_id, professional_id, justification, cleared_flags, red_flags_version)
  VALUES (_assessment_id, _uid, _text, _active, _version)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_quick_session_red_flags(_session_id uuid, _justification text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _text text := btrim(_justification, E' \t\r\n');
  _session record;
  _active text[];
  _id uuid;
BEGIN
  IF _text IS NULL OR char_length(_text) NOT BETWEEN 20 AND 2000 THEN
    RAISE EXCEPTION 'the justification needs 20 to 2000 characters' USING ERRCODE = '22023';
  END IF;
  IF _uid IS NULL OR NOT public.has_role(_uid, 'professional'::public.app_role) THEN
    RAISE EXCEPTION 'quick protocol session not found or not yours' USING ERRCODE = '42501';
  END IF;

  -- The session row is the lock for its completion, its red flags, clearing and revoking
  SELECT q.professional_id, q.status, q.red_flags, q.red_flags_version INTO _session
  FROM public.quick_protocol_sessions q
  WHERE q.id = _session_id
  FOR UPDATE;
  IF NOT FOUND OR _session.professional_id IS DISTINCT FROM _uid OR _session.status IS DISTINCT FROM 'in_progress' THEN
    RAISE EXCEPTION 'quick protocol session not found or not yours' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(_session.red_flags) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'triage_missing' USING ERRCODE = 'P0001';
  END IF;
  _active := public.active_red_flags(_session.red_flags, NULL);
  IF cardinality(_active) = 0 THEN
    RAISE EXCEPTION 'no active red flag to clear' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.red_flag_clearances (quick_session_id, professional_id, justification, cleared_flags, red_flags_version)
  VALUES (_session_id, _uid, _text, _active, _session.red_flags_version)
  RETURNING id INTO _id;
  RETURN _id;
END;
$$;

-- Only while the assessment or session is open: the lock is on its row, as for saving or completing
CREATE OR REPLACE FUNCTION public.revoke_red_flag_clearance(_clearance_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _text text := btrim(_reason, E' \t\r\n');
  _clearance record;
  _owner uuid;
  _open boolean;
BEGIN
  IF _text IS NULL OR char_length(_text) NOT BETWEEN 20 AND 2000 THEN
    RAISE EXCEPTION 'the reason needs 20 to 2000 characters' USING ERRCODE = '22023';
  END IF;
  IF _uid IS NULL OR NOT public.has_role(_uid, 'professional'::public.app_role) THEN
    RAISE EXCEPTION 'clearance not found or not yours' USING ERRCODE = '42501';
  END IF;

  SELECT c.assessment_id, c.quick_session_id INTO _clearance
  FROM public.red_flag_clearances c
  WHERE c.id = _clearance_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'clearance not found or not yours' USING ERRCODE = '42501';
  END IF;

  IF _clearance.assessment_id IS NOT NULL THEN
    SELECT a.professional_id, a.status IN ('draft', 'in_progress') INTO _owner, _open
    FROM public.assessments a
    WHERE a.id = _clearance.assessment_id
    FOR UPDATE;
  ELSE
    SELECT q.professional_id, q.status = 'in_progress' INTO _owner, _open
    FROM public.quick_protocol_sessions q
    WHERE q.id = _clearance.quick_session_id
    FOR UPDATE;
  END IF;
  IF _owner IS DISTINCT FROM _uid OR _open IS NOT TRUE THEN
    RAISE EXCEPTION 'clearance not found or not yours' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1 FROM public.red_flag_clearance_revocations r WHERE r.clearance_id = _clearance_id) THEN
    RAISE EXCEPTION 'clearance already revoked' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.red_flag_clearance_revocations (clearance_id, professional_id, reason)
  VALUES (_clearance_id, _uid, _text);
END;
$$;

-- e.3) What the screen and the generate-protocol Edge ask before generating. Only for the owning professional.
-- blocked: anamnesis_missing (triage_missing for a session), red_flags_not_cleared or null.
CREATE OR REPLACE FUNCTION public.assessment_red_flag_status(_assessment_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _active text[];
  _version bigint;
  _clearance record;
BEGIN
  SELECT a.professional_id INTO _owner FROM public.assessments a WHERE a.id = _assessment_id;
  IF _uid IS NULL OR _owner IS DISTINCT FROM _uid OR NOT public.has_role(_uid, 'professional'::public.app_role) THEN
    RAISE EXCEPTION 'assessment not found or not yours' USING ERRCODE = '42501';
  END IF;

  SELECT public.active_red_flags(r.red_flags, r.has_red_flags), r.red_flags_version INTO _active, _version
  FROM public.anamnesis_responses r
  WHERE r.assessment_id = _assessment_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('blocked', 'anamnesis_missing', 'active_flags', '[]'::jsonb, 'clearance', NULL);
  END IF;
  IF cardinality(_active) = 0 THEN
    RETURN jsonb_build_object('blocked', NULL, 'active_flags', '[]'::jsonb, 'clearance', NULL);
  END IF;

  SELECT c.id, c.justification, c.created_at INTO _clearance
  FROM public.red_flag_clearances c
  WHERE c.id = public.valid_red_flag_clearance(_assessment_id, NULL, _active, _version);
  RETURN jsonb_build_object(
    'blocked', CASE WHEN _clearance.id IS NULL THEN 'red_flags_not_cleared' END,
    'active_flags', to_jsonb(_active),
    'clearance', CASE WHEN _clearance.id IS NOT NULL THEN
      jsonb_build_object('id', _clearance.id, 'justification', _clearance.justification, 'created_at', _clearance.created_at) END);
END;
$$;

CREATE OR REPLACE FUNCTION public.quick_session_red_flag_status(_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _uid uuid := auth.uid();
  _session record;
  _active text[];
  _clearance record;
BEGIN
  SELECT q.professional_id, q.red_flags, q.red_flags_version INTO _session
  FROM public.quick_protocol_sessions q
  WHERE q.id = _session_id;
  IF NOT FOUND OR _uid IS NULL OR _session.professional_id IS DISTINCT FROM _uid
     OR NOT public.has_role(_uid, 'professional'::public.app_role) THEN
    RAISE EXCEPTION 'quick protocol session not found or not yours' USING ERRCODE = '42501';
  END IF;

  IF jsonb_typeof(_session.red_flags) IS DISTINCT FROM 'object' THEN
    RETURN jsonb_build_object('blocked', 'triage_missing', 'active_flags', '[]'::jsonb, 'clearance', NULL);
  END IF;
  _active := public.active_red_flags(_session.red_flags, NULL);
  IF cardinality(_active) = 0 THEN
    RETURN jsonb_build_object('blocked', NULL, 'active_flags', '[]'::jsonb, 'clearance', NULL);
  END IF;

  SELECT c.id, c.justification, c.created_at INTO _clearance
  FROM public.red_flag_clearances c
  WHERE c.id = public.valid_red_flag_clearance(NULL, _session_id, _active, _session.red_flags_version);
  RETURN jsonb_build_object(
    'blocked', CASE WHEN _clearance.id IS NULL THEN 'red_flags_not_cleared' END,
    'active_flags', to_jsonb(_active),
    'clearance', CASE WHEN _clearance.id IS NOT NULL THEN
      jsonb_build_object('id', _clearance.id, 'justification', _clearance.justification, 'created_at', _clearance.created_at) END);
END;
$$;

-- =============================================
-- Privileges
-- =============================================
-- Internal: the lock, its helpers and the trigger functions run only as the owner
REVOKE EXECUTE ON FUNCTION public.active_red_flags(jsonb, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.red_flags_next_version(text[], text[], bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.valid_red_flag_clearance(uuid, uuid, text[], bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.red_flags_cleared(uuid, uuid, text[], bigint) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.guard_protocol_write() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.guard_anamnesis_red_flags() FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.quick_session_red_flags_version() FROM PUBLIC, anon, authenticated, service_role;

-- Called by the screens (and the Edge, with the user's token)
REVOKE EXECUTE ON FUNCTION public.clear_assessment_red_flags(uuid, text) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.clear_quick_session_red_flags(uuid, text) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.revoke_red_flag_clearance(uuid, text) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.assessment_red_flag_status(uuid) FROM PUBLIC, anon, service_role;
REVOKE EXECUTE ON FUNCTION public.quick_session_red_flag_status(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.clear_assessment_red_flags(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clear_quick_session_red_flags(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_red_flag_clearance(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assessment_red_flag_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.quick_session_red_flag_status(uuid) TO authenticated;

-- Postcondition: protocols, save_assessment_protocol and every SECURITY DEFINER function of this migration
-- belong to the role that ran it, which no client role is or is a member of
DO $$
DECLARE
  _expected text[] := ARRAY[
    'active_red_flags', 'red_flags_next_version', 'valid_red_flag_clearance', 'red_flags_cleared',
    'save_assessment_protocol', 'guard_protocol_write', 'guard_anamnesis_red_flags', 'quick_session_red_flags_version',
    'clear_assessment_red_flags', 'clear_quick_session_red_flags', 'revoke_red_flag_clearance',
    'assessment_red_flag_status', 'quick_session_red_flag_status'];
  _bad text;
BEGIN
  SELECT string_agg(n, ', ' ORDER BY n) INTO _bad
  FROM unnest(_expected) AS n
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = n
      AND p.proowner = (SELECT c.relowner FROM pg_class c WHERE c.oid = 'public.protocols'::regclass)
      AND pg_get_userbyid(p.proowner) NOT IN ('anon', 'authenticated', 'service_role')
      AND NOT pg_has_role('anon', p.proowner, 'MEMBER')
      AND NOT pg_has_role('authenticated', p.proowner, 'MEMBER')
      AND NOT pg_has_role('service_role', p.proowner, 'MEMBER'));
  IF _bad IS NOT NULL THEN
    RAISE EXCEPTION 'etapa 5a: dono inesperado ou função faltando: %', _bad;
  END IF;
END $$;
