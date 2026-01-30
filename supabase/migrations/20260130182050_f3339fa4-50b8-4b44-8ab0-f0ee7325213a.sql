-- Drop existing storage policies for assessment-media bucket
DROP POLICY IF EXISTS "Professionals can upload assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can update assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Professionals can delete assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their assessment media" ON storage.objects;

-- Create new policies that support both assessments AND quick_protocol_sessions

-- Upload policy: allow if user owns the assessment OR owns the quick protocol session
CREATE POLICY "Users can upload assessment media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'assessment-media' AND
  (
    -- Check if folder matches an assessment the user owns
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id::text = (storage.foldername(name))[1]
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
    OR
    -- Check if folder matches a quick_protocol_session the user owns
    EXISTS (
      SELECT 1 FROM public.quick_protocol_sessions qps
      WHERE qps.id::text = (storage.foldername(name))[1]
      AND (qps.professional_id = auth.uid() OR qps.student_id = auth.uid())
    )
  )
);

-- Update policy
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

-- Delete policy
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

-- Select policy: allow viewing media for owned assessments/sessions
CREATE POLICY "Users can view assessment media"
ON storage.objects FOR SELECT
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