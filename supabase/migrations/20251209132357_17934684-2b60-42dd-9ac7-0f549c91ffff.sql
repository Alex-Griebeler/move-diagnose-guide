-- Make the assessment-media bucket public so files can be accessed
UPDATE storage.buckets 
SET public = true
WHERE id = 'assessment-media';