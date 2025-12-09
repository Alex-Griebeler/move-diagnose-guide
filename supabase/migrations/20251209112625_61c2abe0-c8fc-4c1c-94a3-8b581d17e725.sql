-- Add RLS policies for storage bucket assessment-media
-- Allow authenticated users to upload to their assessment folders
CREATE POLICY "Users can upload to assessment media" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'assessment-media'
);

-- Allow users to view their own uploads and related assessment media
CREATE POLICY "Users can view assessment media" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (bucket_id = 'assessment-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own assessment media" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (bucket_id = 'assessment-media');