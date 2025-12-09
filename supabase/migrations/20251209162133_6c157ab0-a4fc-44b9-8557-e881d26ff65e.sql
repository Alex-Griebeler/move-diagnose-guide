-- Create assessment_drafts table for storing partial progress
CREATE TABLE public.assessment_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  step_type TEXT NOT NULL, -- 'anamnesis', 'global_tests', 'segmental_tests'
  draft_data JSONB NOT NULL DEFAULT '{}',
  current_step INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, step_type)
);

-- Enable RLS
ALTER TABLE public.assessment_drafts ENABLE ROW LEVEL SECURITY;

-- Create policy for access via assessment ownership
CREATE POLICY "Access via assessment ownership"
ON public.assessment_drafts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = assessment_drafts.assessment_id
    AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX idx_assessment_drafts_assessment_id ON public.assessment_drafts(assessment_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_assessment_drafts_updated_at
BEFORE UPDATE ON public.assessment_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();