-- Make the assessment-media bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'assessment-media';

-- Create policy for authenticated users to read their own assessment media via signed URLs
CREATE POLICY "Users can read assessment media via signed URLs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'assessment-media' 
  AND auth.role() = 'authenticated'
);