-- Make assessment-media bucket public for video access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'assessment-media';