-- Rollback of supabase/migrations/20261101120000_bloco1_banco_acesso.sql
-- Restores the policies, triggers and functions exactly as they were at d824c86.
-- Not a migration: run manually only if the block has to be reverted.

-- i) row ids
DROP TRIGGER IF EXISTS assign_server_row_id ON public.assessments;
DROP TRIGGER IF EXISTS assign_server_row_id ON public.quick_protocol_sessions;
DROP FUNCTION IF EXISTS public.assign_server_row_id();

-- h) quick_protocol_sessions
DROP TRIGGER IF EXISTS guard_quick_session_update ON public.quick_protocol_sessions;
DROP FUNCTION IF EXISTS public.guard_quick_session_update();
DROP POLICY IF EXISTS "Professionals can view their quick protocol sessions" ON public.quick_protocol_sessions;
DROP POLICY IF EXISTS "Professionals can create quick protocol sessions" ON public.quick_protocol_sessions;
DROP POLICY IF EXISTS "Professionals can update their quick protocol sessions" ON public.quick_protocol_sessions;
DROP POLICY IF EXISTS "Professionals can delete their quick protocol sessions" ON public.quick_protocol_sessions;

CREATE POLICY "Professionals can manage their quick protocol sessions"
ON public.quick_protocol_sessions
FOR ALL
USING (auth.uid() = professional_id);

-- g) progress_logs
DROP POLICY IF EXISTS "Students can log their progress" ON public.progress_logs;

CREATE POLICY "Students can log their progress"
ON public.progress_logs FOR ALL
USING (auth.uid() = student_id);

-- f) exercises
DROP POLICY IF EXISTS "Professionals can create exercises" ON public.exercises;
DROP POLICY IF EXISTS "Professionals can update own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Professionals can delete own exercises" ON public.exercises;

CREATE POLICY "Professionals can create exercises"
ON public.exercises FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'professional'::app_role)
  AND (created_by IS NULL OR created_by = auth.uid())
);

CREATE POLICY "Professionals can update own exercises"
ON public.exercises FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'professional'::app_role)
  AND (created_by = auth.uid() OR created_by IS NULL)
);

CREATE POLICY "Professionals can delete own exercises"
ON public.exercises FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'professional'::app_role)
  AND (created_by = auth.uid() OR created_by IS NULL)
);

-- e) storage.objects
DROP POLICY IF EXISTS "Author can upload media while open" ON storage.objects;
DROP POLICY IF EXISTS "Author can update media while open" ON storage.objects;
DROP POLICY IF EXISTS "Author can delete media while open" ON storage.objects;

CREATE POLICY "Users can upload assessment media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assessment-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
      AND (qps.professional_id = auth.uid() OR qps.student_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can update assessment media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'assessment-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
      AND (qps.professional_id = auth.uid() OR qps.student_id = auth.uid())
    )
  )
);

CREATE POLICY "Users can delete assessment media"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'assessment-media' AND
  (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
    OR
    EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
      AND (qps.professional_id = auth.uid() OR qps.student_id = auth.uid())
    )
  )
);

-- d) professional_students
CREATE POLICY "Professionals can add students"
ON public.professional_students FOR INSERT
WITH CHECK (auth.uid() = professional_id AND public.has_role(auth.uid(), 'professional'));

-- c) assessments
DROP TRIGGER IF EXISTS guard_assessment_update ON public.assessments;
DROP FUNCTION IF EXISTS public.guard_assessment_update();
DROP POLICY IF EXISTS "Professionals can create assessments for linked students" ON public.assessments;
DROP POLICY IF EXISTS "Professionals can update their assessments" ON public.assessments;
DROP POLICY IF EXISTS "Professionals can delete their assessments" ON public.assessments;

CREATE POLICY "Professionals can update their assessments"
ON public.assessments FOR UPDATE TO authenticated
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Professionals can delete their assessments"
ON public.assessments FOR DELETE TO authenticated
USING (auth.uid() = professional_id);

CREATE POLICY "Professionals can create assessments for linked students"
ON public.assessments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = professional_id
  AND EXISTS (
    SELECT 1 FROM public.professional_students
    WHERE professional_students.professional_id = auth.uid()
      AND professional_students.student_id = assessments.student_id
  )
);

-- b) clinical child tables
DROP POLICY IF EXISTS "Assessment participants can view anamnesis" ON public.anamnesis_responses;
DROP POLICY IF EXISTS "Author can insert anamnesis while open" ON public.anamnesis_responses;
DROP POLICY IF EXISTS "Author can update anamnesis while open" ON public.anamnesis_responses;
DROP POLICY IF EXISTS "Author can delete anamnesis while open" ON public.anamnesis_responses;
CREATE POLICY "Access via assessment ownership" ON public.anamnesis_responses FOR ALL
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())));

DROP POLICY IF EXISTS "Assessment participants can view findings" ON public.functional_findings;
DROP POLICY IF EXISTS "Author can insert findings while open" ON public.functional_findings;
DROP POLICY IF EXISTS "Author can update findings while open" ON public.functional_findings;
DROP POLICY IF EXISTS "Author can delete findings while open" ON public.functional_findings;
CREATE POLICY "Access via assessment ownership" ON public.functional_findings FOR ALL
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())));

DROP POLICY IF EXISTS "Assessment participants can view global results" ON public.global_test_results;
DROP POLICY IF EXISTS "Author can insert global results while open" ON public.global_test_results;
DROP POLICY IF EXISTS "Author can update global results while open" ON public.global_test_results;
DROP POLICY IF EXISTS "Author can delete global results while open" ON public.global_test_results;
CREATE POLICY "Access via assessment ownership" ON public.global_test_results FOR ALL
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())));

DROP POLICY IF EXISTS "Assessment participants can view segmental results" ON public.segmental_test_results;
DROP POLICY IF EXISTS "Author can insert segmental results while open" ON public.segmental_test_results;
DROP POLICY IF EXISTS "Author can update segmental results while open" ON public.segmental_test_results;
DROP POLICY IF EXISTS "Author can delete segmental results while open" ON public.segmental_test_results;
CREATE POLICY "Access via assessment ownership" ON public.segmental_test_results FOR ALL
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())));

DROP POLICY IF EXISTS "Assessment participants can view protocols" ON public.protocols;
DROP POLICY IF EXISTS "Author can insert protocols while open" ON public.protocols;
DROP POLICY IF EXISTS "Author can update protocols while open" ON public.protocols;
DROP POLICY IF EXISTS "Author can delete protocols while open" ON public.protocols;
CREATE POLICY "Access via assessment ownership" ON public.protocols FOR ALL
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())));

DROP POLICY IF EXISTS "Professional can view drafts" ON public.assessment_drafts;
DROP POLICY IF EXISTS "Author can insert drafts while open" ON public.assessment_drafts;
DROP POLICY IF EXISTS "Author can update drafts while open" ON public.assessment_drafts;
DROP POLICY IF EXISTS "Author can delete drafts while open" ON public.assessment_drafts;
CREATE POLICY "Access via assessment ownership" ON public.assessment_drafts FOR ALL
USING (EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = assessment_id AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())));

-- a) predicate
DROP FUNCTION IF EXISTS public.can_author_assessment(uuid);
