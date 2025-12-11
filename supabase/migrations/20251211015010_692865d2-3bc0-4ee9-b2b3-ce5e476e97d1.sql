-- Create table for quick protocol sessions (Mini Protocolo FABRIK)
CREATE TABLE public.quick_protocol_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL,
  professional_id UUID NOT NULL,
  assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  protocol_type TEXT NOT NULL DEFAULT 'knee_pain',
  status TEXT NOT NULL DEFAULT 'in_progress',
  test_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  primary_deficit TEXT,
  secondary_deficits JSONB DEFAULT '[]'::jsonb,
  intervention_applied JSONB,
  retest_result TEXT,
  retest_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quick_protocol_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Professionals can manage their quick protocol sessions"
ON public.quick_protocol_sessions
FOR ALL
USING (auth.uid() = professional_id);

CREATE POLICY "Students can view their quick protocol sessions"
ON public.quick_protocol_sessions
FOR SELECT
USING (auth.uid() = student_id);

-- Trigger for updated_at
CREATE TRIGGER update_quick_protocol_sessions_updated_at
BEFORE UPDATE ON public.quick_protocol_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster queries
CREATE INDEX idx_quick_protocol_sessions_professional ON public.quick_protocol_sessions(professional_id);
CREATE INDEX idx_quick_protocol_sessions_student ON public.quick_protocol_sessions(student_id);
CREATE INDEX idx_quick_protocol_sessions_status ON public.quick_protocol_sessions(status);