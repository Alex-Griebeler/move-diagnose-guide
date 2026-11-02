-- Etapa 3d (B-13, F-15): the findings keep the weights the priority engine computes, and the protocol,
-- its findings and the assessment's completion are saved in one transaction, through one function only.
-- Rollback: supabase/rollbacks/20261103120000_etapa3d_gravacao_protocolo_down.sql

-- Precondition: one protocol per assessment. Duplicates are not resolved here (deleting clinical rows is
-- the owner's call); if any exist, nothing is changed and the cause is named without exposing ids.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.protocols
    GROUP BY assessment_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'etapa 3d: avaliação com mais de um protocolo; resolver antes de aplicar';
  END IF;
END $$;

-- Precondition: no open assessment has a protocol or findings yet. The old screen saved the protocol before
-- completing the assessment; a failure in between left it open with its protocol, and save_assessment_protocol
-- would hit uq_protocols_assessment on every attempt. Findings written directly to an open assessment would end
-- up next to the ones the function saves. Completing or discarding them is the owner's call.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.status IN ('draft', 'in_progress')
      AND (EXISTS (SELECT 1 FROM public.protocols p WHERE p.assessment_id = a.id)
        OR EXISTS (SELECT 1 FROM public.functional_findings f WHERE f.assessment_id = a.id))
  ) THEN
    RAISE EXCEPTION 'etapa 3d: avaliação aberta que já tem protocolo ou achados; resolver antes de aplicar';
  END IF;
END $$;

-- B-13: the engine's base weight goes up to 4 and the sum of its context adjustments up to 6
-- (tests/domain/findingsContract.test.ts keeps the engine inside these bounds). Every existing row
-- fits, since both ranges only widen.
ALTER TABLE public.functional_findings
  DROP CONSTRAINT functional_findings_biomechanical_importance_check,
  ADD CONSTRAINT functional_findings_biomechanical_importance_check
    CHECK (biomechanical_importance >= 0 AND biomechanical_importance <= 4),
  DROP CONSTRAINT functional_findings_context_weight_check,
  ADD CONSTRAINT functional_findings_context_weight_check
    CHECK (context_weight >= 0 AND context_weight <= 6);

-- Only the protocol generator creates protocols, one per assessment. assessment_id is NOT NULL.
ALTER TABLE public.protocols
  ADD CONSTRAINT uq_protocols_assessment UNIQUE (assessment_id);

-- Clients no longer write protocols or findings directly: save_assessment_protocol is the only way in,
-- so a protocol never exists without its findings and its assessment's completion. Reading is unchanged.
DROP POLICY IF EXISTS "Author can insert protocols while open" ON public.protocols;
DROP POLICY IF EXISTS "Author can update protocols while open" ON public.protocols;
DROP POLICY IF EXISTS "Author can delete protocols while open" ON public.protocols;
DROP POLICY IF EXISTS "Author can insert findings while open" ON public.functional_findings;
DROP POLICY IF EXISTS "Author can update findings while open" ON public.functional_findings;
DROP POLICY IF EXISTS "Author can delete findings while open" ON public.functional_findings;

-- IF EXISTS would pass silently over a policy with another name: none that writes may remain
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND tablename IN ('protocols', 'functional_findings') AND cmd <> 'SELECT'
  ) THEN
    RAISE EXCEPTION 'etapa 3d: ainda há policy de escrita em protocols ou functional_findings; resolver antes de aplicar';
  END IF;
END $$;

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
