-- Remove overly permissive storage policies that allow any authenticated user to access assessment media
-- Keep only the specific "Professionals can..." policies that verify ownership via assessment

DROP POLICY IF EXISTS "Users can upload to assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Users can view assessment media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own assessment media" ON storage.objects;

-- Add policy for students to view their own assessment media
CREATE POLICY "Students can view own assessment media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'assessment-media'
  AND EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.student_id = auth.uid()
    AND a.id::text = (storage.foldername(name))[1]
  )
);