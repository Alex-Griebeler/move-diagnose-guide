-- Rollback of supabase/migrations/20261102120000_etapa3c_unicidade_filhas.sql
-- Not a migration: run manually only if the step has to be reverted. The app code from the same
-- change saves with upsert on these keys, so revert it first (without the constraints, upsert fails with 42P10).
ALTER TABLE public.segmental_test_results DROP CONSTRAINT IF EXISTS uq_segmental_test_results_assessment_test;
ALTER TABLE public.anamnesis_responses DROP CONSTRAINT IF EXISTS uq_anamnesis_responses_assessment;
