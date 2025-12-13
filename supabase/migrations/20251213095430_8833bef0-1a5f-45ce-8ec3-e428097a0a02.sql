-- Make the assessment-media bucket private to protect patient photos/videos
UPDATE storage.buckets 
SET public = false 
WHERE id = 'assessment-media';