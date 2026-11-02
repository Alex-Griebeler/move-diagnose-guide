-- Rollback of 20261103120000_etapa3d_gravacao_protocolo.sql. Revert the app first: the screens save
-- through save_assessment_protocol. Stops without deleting anything if a finding no longer fits
-- the old ranges (deleting clinical rows is the owner's call).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.functional_findings
    WHERE biomechanical_importance > 3 OR context_weight > 4
  ) THEN
    RAISE EXCEPTION 'etapa 3d: achado fora da faixa antiga; resolver antes do rollback';
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.save_assessment_protocol(uuid, jsonb, jsonb);

-- The bloco 1 write policies, as they were
CREATE POLICY "Author can insert findings while open"
ON public.functional_findings FOR INSERT TO authenticated
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can update findings while open"
ON public.functional_findings FOR UPDATE TO authenticated
USING (public.can_author_assessment(assessment_id))
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can delete findings while open"
ON public.functional_findings FOR DELETE TO authenticated
USING (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can insert protocols while open"
ON public.protocols FOR INSERT TO authenticated
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can update protocols while open"
ON public.protocols FOR UPDATE TO authenticated
USING (public.can_author_assessment(assessment_id))
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can delete protocols while open"
ON public.protocols FOR DELETE TO authenticated
USING (public.can_author_assessment(assessment_id));

ALTER TABLE public.protocols DROP CONSTRAINT IF EXISTS uq_protocols_assessment;

ALTER TABLE public.functional_findings
  DROP CONSTRAINT functional_findings_biomechanical_importance_check,
  ADD CONSTRAINT functional_findings_biomechanical_importance_check
    CHECK (biomechanical_importance >= 0 AND biomechanical_importance <= 3),
  DROP CONSTRAINT functional_findings_context_weight_check,
  ADD CONSTRAINT functional_findings_context_weight_check
    CHECK (context_weight >= 0 AND context_weight <= 4);
