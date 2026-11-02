-- Etapa 3c (F-04): one anamnesis per assessment and one segmental result per test of an assessment.
-- The wizards save with upsert on these keys, so resending a step after "Voltar" updates the saved
-- row instead of adding another one. Rollback: supabase/rollbacks/20261102120000_etapa3c_unicidade_filhas_down.sql

-- Precondition: no duplicates. They are not resolved here (deleting clinical rows is the owner's call);
-- if any exist, nothing is changed and the cause is named without exposing ids.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.anamnesis_responses
    GROUP BY assessment_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'etapa 3c: avaliação com mais de uma anamnese; resolver antes de aplicar';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.segmental_test_results
    GROUP BY assessment_id, test_name HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'etapa 3c: teste segmentar repetido numa avaliação; resolver antes de aplicar';
  END IF;
END $$;

-- Both key columns are NOT NULL, so NULLs never escape the constraint
ALTER TABLE public.anamnesis_responses
  ADD CONSTRAINT uq_anamnesis_responses_assessment UNIQUE (assessment_id);

ALTER TABLE public.segmental_test_results
  ADD CONSTRAINT uq_segmental_test_results_assessment_test UNIQUE (assessment_id, test_name);
