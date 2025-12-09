-- Create storage bucket for assessment media
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assessment-media',
  'assessment-media',
  false,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
);

-- RLS policies for assessment-media bucket
-- Professionals can upload media for their assessments
CREATE POLICY "Professionals can upload assessment media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'assessment-media'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.professional_id = auth.uid()
    AND a.id::text = (storage.foldername(name))[1]
  )
);

-- Professionals can view their assessment media
CREATE POLICY "Professionals can view assessment media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'assessment-media'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.professional_id = auth.uid()
    AND a.id::text = (storage.foldername(name))[1]
  )
);

-- Professionals can delete their assessment media
CREATE POLICY "Professionals can delete assessment media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'assessment-media'
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.professional_id = auth.uid()
    AND a.id::text = (storage.foldername(name))[1]
  )
);