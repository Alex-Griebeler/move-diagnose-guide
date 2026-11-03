-- Rollback of 20261104120000_etapa5a_red_flags.sql. Order: the 20261105120000 rollback first, then the app
-- (revert the PR and publish), then this. Keeps red_flag_clearances, red_flag_clearance_revocations, the red_flags
-- and red_flags_version columns (with their default, which the old screens rely on when inserting) and the version
-- sequence, so no clearance, revocation or triage is lost and a later reapply never repeats a version.
-- TRUNCATE on protocols stays revoked from the client roles: no path of the app uses it.
DO $$
BEGIN
  IF to_regprocedure('public.guard_quick_session_red_flags()') IS NOT NULL THEN
    RAISE EXCEPTION 'etapa 5a: reverter 20261105120000_etapa5a_triagem_rapida antes';
  END IF;
END $$;

DROP TRIGGER IF EXISTS guard_protocol_write ON public.protocols;
DROP TRIGGER IF EXISTS guard_protocol_truncate ON public.protocols;
DROP TRIGGER IF EXISTS guard_anamnesis_red_flags ON public.anamnesis_responses;
DROP TRIGGER IF EXISTS quick_session_red_flags_version ON public.quick_protocol_sessions;

-- save_assessment_protocol as etapa 3d left it (20261103120000_etapa3d_gravacao_protocolo.sql, verbatim)
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

DROP FUNCTION IF EXISTS public.guard_protocol_write();
DROP FUNCTION IF EXISTS public.guard_anamnesis_red_flags();
DROP FUNCTION IF EXISTS public.quick_session_red_flags_version();
DROP FUNCTION IF EXISTS public.clear_assessment_red_flags(uuid, text);
DROP FUNCTION IF EXISTS public.clear_quick_session_red_flags(uuid, text);
DROP FUNCTION IF EXISTS public.revoke_red_flag_clearance(uuid, text);
DROP FUNCTION IF EXISTS public.assessment_red_flag_status(uuid);
DROP FUNCTION IF EXISTS public.quick_session_red_flag_status(uuid);
DROP FUNCTION IF EXISTS public.red_flags_cleared(uuid, uuid, text[], bigint);
DROP FUNCTION IF EXISTS public.valid_red_flag_clearance(uuid, uuid, text[], bigint);
DROP FUNCTION IF EXISTS public.red_flags_next_version(text[], text[], bigint);
DROP FUNCTION IF EXISTS public.active_red_flags(jsonb, boolean);
