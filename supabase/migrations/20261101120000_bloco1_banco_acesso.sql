-- Bloco 1 (P0): banco e acesso.
-- Only the owning professional writes clinical data, and only while the
-- assessment is open (draft / in_progress). Completed assessments are
-- immutable for client roles. Rollback: supabase/rollbacks/20261101120000_bloco1_banco_acesso_down.sql

-- =============================================
-- 0) Preconditions: no id shared by an assessment and a quick session, and no
--    quick session linked to an open assessment
-- =============================================
-- Media folders are named after these ids (see i). Runs first, so nothing is
-- changed when it fails; either case must be resolved by hand before applying.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.quick_protocol_sessions q ON q.id = a.id
  ) THEN
    RAISE EXCEPTION 'bloco 1: id compartilhado entre assessments e quick_protocol_sessions; resolver antes de aplicar';
  END IF;
  -- Deleting an open assessment nulls the link of its sessions (FK ON DELETE SET NULL
  -- runs as owner, past RLS and the guards), so no session may be linked to one (see h).
  IF EXISTS (
    SELECT 1 FROM public.quick_protocol_sessions q
    JOIN public.assessments a ON a.id = q.assessment_id
    WHERE a.status IN ('draft', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'bloco 1: sessão rápida ligada a avaliação aberta; resolver antes de aplicar';
  END IF;
END $$;

-- =============================================
-- a) Authoring predicate
-- =============================================
CREATE OR REPLACE FUNCTION public.can_author_assessment(_assessment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = _assessment_id
      AND a.professional_id = auth.uid()
      AND a.status IN ('draft', 'in_progress')
  )
  AND public.has_role(auth.uid(), 'professional'::app_role)
$$;

REVOKE EXECUTE ON FUNCTION public.can_author_assessment(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_author_assessment(uuid) TO authenticated;

-- =============================================
-- b) Clinical child tables: read for participants, write for the author
-- =============================================

-- anamnesis_responses
DROP POLICY IF EXISTS "Access via assessment ownership" ON public.anamnesis_responses;

CREATE POLICY "Assessment participants can view anamnesis"
ON public.anamnesis_responses FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = anamnesis_responses.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
));

CREATE POLICY "Author can insert anamnesis while open"
ON public.anamnesis_responses FOR INSERT TO authenticated
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can update anamnesis while open"
ON public.anamnesis_responses FOR UPDATE TO authenticated
USING (public.can_author_assessment(assessment_id))
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can delete anamnesis while open"
ON public.anamnesis_responses FOR DELETE TO authenticated
USING (public.can_author_assessment(assessment_id));

-- functional_findings
DROP POLICY IF EXISTS "Access via assessment ownership" ON public.functional_findings;

CREATE POLICY "Assessment participants can view findings"
ON public.functional_findings FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = functional_findings.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
));

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

-- global_test_results
DROP POLICY IF EXISTS "Access via assessment ownership" ON public.global_test_results;

CREATE POLICY "Assessment participants can view global results"
ON public.global_test_results FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = global_test_results.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
));

CREATE POLICY "Author can insert global results while open"
ON public.global_test_results FOR INSERT TO authenticated
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can update global results while open"
ON public.global_test_results FOR UPDATE TO authenticated
USING (public.can_author_assessment(assessment_id))
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can delete global results while open"
ON public.global_test_results FOR DELETE TO authenticated
USING (public.can_author_assessment(assessment_id));

-- segmental_test_results
DROP POLICY IF EXISTS "Access via assessment ownership" ON public.segmental_test_results;

CREATE POLICY "Assessment participants can view segmental results"
ON public.segmental_test_results FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = segmental_test_results.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
));

CREATE POLICY "Author can insert segmental results while open"
ON public.segmental_test_results FOR INSERT TO authenticated
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can update segmental results while open"
ON public.segmental_test_results FOR UPDATE TO authenticated
USING (public.can_author_assessment(assessment_id))
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can delete segmental results while open"
ON public.segmental_test_results FOR DELETE TO authenticated
USING (public.can_author_assessment(assessment_id));

-- protocols
DROP POLICY IF EXISTS "Access via assessment ownership" ON public.protocols;

CREATE POLICY "Assessment participants can view protocols"
ON public.protocols FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = protocols.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
));

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

-- assessment_drafts (professional only, the student never sees drafts)
DROP POLICY IF EXISTS "Access via assessment ownership" ON public.assessment_drafts;

CREATE POLICY "Professional can view drafts"
ON public.assessment_drafts FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.assessments a
  WHERE a.id = assessment_drafts.assessment_id
    AND a.professional_id = auth.uid()
));

CREATE POLICY "Author can insert drafts while open"
ON public.assessment_drafts FOR INSERT TO authenticated
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can update drafts while open"
ON public.assessment_drafts FOR UPDATE TO authenticated
USING (public.can_author_assessment(assessment_id))
WITH CHECK (public.can_author_assessment(assessment_id));

CREATE POLICY "Author can delete drafts while open"
ON public.assessment_drafts FOR DELETE TO authenticated
USING (public.can_author_assessment(assessment_id));

-- =============================================
-- c) assessments: role on insert, owner/student fixed, completed is immutable and kept
-- =============================================
DROP POLICY IF EXISTS "Professionals can create assessments for linked students" ON public.assessments;

-- An assessment starts as a draft, so it reaches completed only through the screens' flow.
CREATE POLICY "Professionals can create assessments for linked students"
ON public.assessments FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional'::app_role)
  AND status = 'draft'
  AND EXISTS (
    SELECT 1 FROM public.professional_students
    WHERE professional_students.professional_id = auth.uid()
      AND professional_students.student_id = assessments.student_id
  )
);

-- A revoked professional keeps neither update nor delete on their old assessments.
DROP POLICY IF EXISTS "Professionals can update their assessments" ON public.assessments;
DROP POLICY IF EXISTS "Professionals can delete their assessments" ON public.assessments;

CREATE POLICY "Professionals can update their assessments"
ON public.assessments FOR UPDATE TO authenticated
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional'::app_role)
)
WITH CHECK (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional'::app_role)
);

-- Only draft and in-progress assessments can be deleted: deleting a completed one
-- would cascade to its protocol and to the student's progress logs.
CREATE POLICY "Professionals can delete their assessments"
ON public.assessments FOR DELETE TO authenticated
USING (
  auth.uid() = professional_id
  AND public.has_role(auth.uid(), 'professional'::app_role)
  AND status IN ('draft', 'in_progress')
);

-- Client roles only: service_role (create-student) and migrations are not restricted.
-- The server sets the dates. An open assessment is completed only through the screens'
-- flow (its protocol is saved first) and is never archived directly. A completed
-- assessment may only move to archived, with no other column changed.
CREATE OR REPLACE FUNCTION public.guard_assessment_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.created_at := now();
    NEW.completed_at := NULL;
    RETURN NEW;
  END IF;

  IF OLD.status IN ('draft', 'in_progress') THEN
    IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'assessment creation date cannot be changed'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status NOT IN ('draft', 'in_progress', 'completed') THEN
      RAISE EXCEPTION 'an open assessment can only be completed'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.status = 'completed' THEN
      IF NOT EXISTS (SELECT 1 FROM public.protocols p WHERE p.assessment_id = NEW.id) THEN
        RAISE EXCEPTION 'an assessment is completed only after its protocol is saved'
          USING ERRCODE = '42501';
      END IF;
      NEW.completed_at := now();
    ELSE
      NEW.completed_at := OLD.completed_at;
    END IF;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'assessment id, professional and student cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.status IN ('completed', 'archived') THEN
    IF (to_jsonb(NEW) - 'updated_at' - 'status') IS DISTINCT FROM (to_jsonb(OLD) - 'updated_at' - 'status')
       OR NOT (NEW.status = OLD.status OR (OLD.status = 'completed' AND NEW.status = 'archived')) THEN
      RAISE EXCEPTION 'completed assessments are immutable'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_assessment_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_assessment_update ON public.assessments;
CREATE TRIGGER guard_assessment_update
BEFORE INSERT OR UPDATE ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.guard_assessment_update();

-- =============================================
-- d) professional_students: links are created only by create-student (service role)
-- =============================================
DROP POLICY IF EXISTS "Professionals can add students" ON public.professional_students;

-- =============================================
-- e) Storage: write only for the professional of an open assessment or session
-- =============================================
DROP POLICY IF EXISTS "Users can upload assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Users can update assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete assessment media" ON storage.objects;

CREATE POLICY "Author can upload media while open"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'assessment-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND public.can_author_assessment(a.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
        AND qps.professional_id = auth.uid()
        AND qps.status = 'in_progress'
        AND public.has_role(auth.uid(), 'professional'::app_role)
    )
  )
);

CREATE POLICY "Author can update media while open"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'assessment-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND public.can_author_assessment(a.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
        AND qps.professional_id = auth.uid()
        AND qps.status = 'in_progress'
        AND public.has_role(auth.uid(), 'professional'::app_role)
    )
  )
)
WITH CHECK (
  bucket_id = 'assessment-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND public.can_author_assessment(a.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
        AND qps.professional_id = auth.uid()
        AND qps.status = 'in_progress'
        AND public.has_role(auth.uid(), 'professional'::app_role)
    )
  )
);

CREATE POLICY "Author can delete media while open"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'assessment-media'
  AND (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
        AND public.can_author_assessment(a.id)
    )
    OR EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
        AND qps.professional_id = auth.uid()
        AND qps.status = 'in_progress'
        AND public.has_role(auth.uid(), 'professional'::app_role)
    )
  )
);

-- =============================================
-- f) exercises: curated rows (created_by IS NULL) change only by migration
-- =============================================
DROP POLICY IF EXISTS "Professionals can create exercises" ON public.exercises;
DROP POLICY IF EXISTS "Professionals can update own exercises" ON public.exercises;
DROP POLICY IF EXISTS "Professionals can delete own exercises" ON public.exercises;

CREATE POLICY "Professionals can create exercises"
ON public.exercises FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'professional'::app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "Professionals can update own exercises"
ON public.exercises FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'professional'::app_role)
  AND created_by = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'professional'::app_role)
  AND created_by = auth.uid()
);

CREATE POLICY "Professionals can delete own exercises"
ON public.exercises FOR DELETE TO authenticated
USING (
  public.has_role(auth.uid(), 'professional'::app_role)
  AND created_by = auth.uid()
);

-- =============================================
-- g) progress_logs: a student logs only against their own protocols
-- =============================================
DROP POLICY IF EXISTS "Students can log their progress" ON public.progress_logs;

CREATE POLICY "Students can log their progress"
ON public.progress_logs FOR ALL TO authenticated
USING (student_id = auth.uid())
WITH CHECK (
  student_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.protocols p
    JOIN public.assessments a ON a.id = p.assessment_id
    WHERE p.id = progress_logs.protocol_id
      AND a.student_id = auth.uid()
  )
);

-- =============================================
-- h) quick_protocol_sessions: professional with role and link; ids fixed; completed is locked
-- =============================================
DROP POLICY IF EXISTS "Professionals can manage their quick protocol sessions" ON public.quick_protocol_sessions;

CREATE POLICY "Professionals can view their quick protocol sessions"
ON public.quick_protocol_sessions FOR SELECT TO authenticated
USING (professional_id = auth.uid());

-- A session starts in progress. The linked assessment is the prior-assessment context
-- (the wizard reads its findings), so it must be completed or archived: those cannot be
-- deleted, and deleting an open one would null the link of a completed session.
CREATE POLICY "Professionals can create quick protocol sessions"
ON public.quick_protocol_sessions FOR INSERT TO authenticated
WITH CHECK (
  professional_id = auth.uid()
  AND public.has_role(auth.uid(), 'professional'::app_role)
  AND status = 'in_progress'
  AND EXISTS (
    SELECT 1 FROM public.professional_students ps
    WHERE ps.professional_id = auth.uid()
      AND ps.student_id = quick_protocol_sessions.student_id
  )
  AND (
    assessment_id IS NULL
    OR EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = quick_protocol_sessions.assessment_id
        AND a.professional_id = auth.uid()
        AND a.student_id = quick_protocol_sessions.student_id
        AND a.status IN ('completed', 'archived')
    )
  )
);

-- The link and assessment were checked on insert and guard_quick_session_update
-- keeps them fixed, so unlinking a student does not block finishing a session.
-- Only an in-progress session can change, and only into in_progress or completed,
-- so a completed session is locked. A repeated finish matches no row and is not an error.
CREATE POLICY "Professionals can update their quick protocol sessions"
ON public.quick_protocol_sessions FOR UPDATE TO authenticated
USING (
  professional_id = auth.uid()
  AND public.has_role(auth.uid(), 'professional'::app_role)
  AND status = 'in_progress'
)
WITH CHECK (
  professional_id = auth.uid()
  AND public.has_role(auth.uid(), 'professional'::app_role)
  AND status IN ('in_progress', 'completed')
);

CREATE POLICY "Professionals can delete their quick protocol sessions"
ON public.quick_protocol_sessions FOR DELETE TO authenticated
USING (
  professional_id = auth.uid()
  AND public.has_role(auth.uid(), 'professional'::app_role)
  AND status = 'in_progress'
);

CREATE OR REPLACE FUNCTION public.guard_quick_session_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user NOT IN ('authenticated', 'anon') THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.professional_id IS DISTINCT FROM OLD.professional_id
     OR NEW.student_id IS DISTINCT FROM OLD.student_id
     OR NEW.assessment_id IS DISTINCT FROM OLD.assessment_id THEN
    RAISE EXCEPTION 'quick protocol session id, professional, student and assessment cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_quick_session_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_quick_session_update ON public.quick_protocol_sessions;
CREATE TRIGGER guard_quick_session_update
BEFORE UPDATE ON public.quick_protocol_sessions
FOR EACH ROW
EXECUTE FUNCTION public.guard_quick_session_update();

-- =============================================
-- i) Row ids: the server picks them for clients
-- =============================================
-- Media folders are named after assessment and quick session ids, and storage
-- policies match the folder against both tables. A client-chosen id could reuse
-- another row's id and reach its folder, so clients never choose it; for them an
-- upsert on id is always a plain insert. Server-side callers (service_role,
-- which sees every row) may choose an id on insert or change it on update, but
-- never to one the other table uses; the advisory lock serializes concurrent
-- writes of the same id across both tables. Clients cannot change an id at all
-- (the update guards). Under RLS a client may not see the other table's row,
-- but its id is random.
CREATE OR REPLACE FUNCTION public.assign_server_row_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND current_user IN ('authenticated', 'anon') THEN
    NEW.id := gen_random_uuid();
  ELSIF TG_OP = 'UPDATE' AND NEW.id IS NOT DISTINCT FROM OLD.id THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 0));

  IF (TG_TABLE_NAME = 'assessments'
      AND EXISTS (SELECT 1 FROM public.quick_protocol_sessions q WHERE q.id = NEW.id))
     OR (TG_TABLE_NAME = 'quick_protocol_sessions'
      AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = NEW.id)) THEN
    RAISE EXCEPTION 'id already used by an assessment or quick protocol session'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_server_row_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS assign_server_row_id ON public.assessments;
CREATE TRIGGER assign_server_row_id
BEFORE INSERT OR UPDATE OF id ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.assign_server_row_id();

DROP TRIGGER IF EXISTS assign_server_row_id ON public.quick_protocol_sessions;
CREATE TRIGGER assign_server_row_id
BEFORE INSERT OR UPDATE OF id ON public.quick_protocol_sessions
FOR EACH ROW
EXECUTE FUNCTION public.assign_server_row_id();

-- Same checks as section 0, now that both triggers and the new policies exist:
-- catches a shared id or an open link created by a client under the old policies
-- while this migration was running.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.assessments a
    JOIN public.quick_protocol_sessions q ON q.id = a.id
  ) THEN
    RAISE EXCEPTION 'bloco 1: id compartilhado entre assessments e quick_protocol_sessions; resolver antes de aplicar';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.quick_protocol_sessions q
    JOIN public.assessments a ON a.id = q.assessment_id
    WHERE a.status IN ('draft', 'in_progress')
  ) THEN
    RAISE EXCEPTION 'bloco 1: sessão rápida ligada a avaliação aberta; resolver antes de aplicar';
  END IF;
END $$;
