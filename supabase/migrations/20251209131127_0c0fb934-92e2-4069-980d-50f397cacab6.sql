-- Update storage bucket to allow larger files (150MB)
UPDATE storage.buckets 
SET file_size_limit = 157286400
WHERE id = 'assessment-media';