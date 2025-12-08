
-- =============================================
-- FABRIK Movement & Performance Screen - Database Schema
-- =============================================

-- 1. ENUMS
-- =============================================

-- Roles do sistema
CREATE TYPE public.app_role AS ENUM ('professional', 'student');

-- Status da avaliação
CREATE TYPE public.assessment_status AS ENUM ('draft', 'in_progress', 'completed', 'archived');

-- Lateralidade
CREATE TYPE public.laterality AS ENUM ('right', 'left', 'ambidextrous');

-- Severidade de achados
CREATE TYPE public.severity_level AS ENUM ('none', 'mild', 'moderate', 'severe');

-- Tipo de teste
CREATE TYPE public.test_type AS ENUM ('global', 'segmental');

-- Classificação FABRIK
CREATE TYPE public.fabrik_phase AS ENUM ('mobility', 'inhibition', 'activation', 'stability', 'strength', 'integration');

-- Prioridade do protocolo
CREATE TYPE public.priority_level AS ENUM ('critical', 'high', 'medium', 'low', 'maintenance');

-- 2. PROFILES (extends auth.users)
-- =============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. USER ROLES (separate table for security)
-- =============================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- User roles policies
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- 4. PROFESSIONAL-STUDENT RELATIONSHIP
-- =============================================
CREATE TABLE public.professional_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (professional_id, student_id)
);

ALTER TABLE public.professional_students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view their students"
  ON public.professional_students FOR SELECT
  USING (auth.uid() = professional_id OR auth.uid() = student_id);

CREATE POLICY "Professionals can add students"
  ON public.professional_students FOR INSERT
  WITH CHECK (auth.uid() = professional_id AND public.has_role(auth.uid(), 'professional'));

CREATE POLICY "Professionals can remove students"
  ON public.professional_students FOR DELETE
  USING (auth.uid() = professional_id AND public.has_role(auth.uid(), 'professional'));

-- 5. ASSESSMENTS (main evaluation record)
-- =============================================
CREATE TABLE public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status assessment_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can manage their assessments"
  ON public.assessments FOR ALL
  USING (auth.uid() = professional_id);

CREATE POLICY "Students can view their assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = student_id);

-- 6. ANAMNESIS RESPONSES
-- =============================================
CREATE TABLE public.anamnesis_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  
  -- Block 1: Personal Data
  birth_date DATE,
  weight_kg NUMERIC(5,2),
  height_cm NUMERIC(5,2),
  laterality laterality,
  occupation TEXT,
  
  -- Block 2: Pain/Injury History (JSON for flexibility)
  pain_history JSONB DEFAULT '[]'::jsonb,
  
  -- Block 3: Surgeries and Red Flags
  surgeries JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '{}'::jsonb,
  has_red_flags BOOLEAN DEFAULT false,
  
  -- Block 4: Routine and Habits
  sedentary_hours_per_day NUMERIC(3,1),
  work_type TEXT,
  
  -- Block 5: Sleep and Recovery
  sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  sleep_hours NUMERIC(3,1),
  
  -- Block 6: Current Physical Activity
  activity_frequency INTEGER,
  activity_types JSONB DEFAULT '[]'::jsonb,
  activity_duration_minutes INTEGER,
  
  -- Block 7: Sports Demands
  sports JSONB DEFAULT '[]'::jsonb,
  
  -- Block 8: Goals
  objectives TEXT,
  time_horizon TEXT,
  
  -- Block 9: LGPD Consent
  lgpd_consent BOOLEAN DEFAULT false,
  lgpd_consent_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.anamnesis_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via assessment ownership"
  ON public.anamnesis_responses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
  );

-- 7. GLOBAL TEST RESULTS (OHS, SLS, Push-up)
-- =============================================
CREATE TABLE public.global_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL, -- 'ohs', 'sls', 'pushup'
  
  -- Compensations detected (structured JSON per view)
  anterior_view JSONB DEFAULT '{}'::jsonb,
  lateral_view JSONB DEFAULT '{}'::jsonb,
  posterior_view JSONB DEFAULT '{}'::jsonb,
  
  -- Side-specific for bilateral tests
  left_side JSONB DEFAULT '{}'::jsonb,
  right_side JSONB DEFAULT '{}'::jsonb,
  
  -- General observations
  notes TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via assessment ownership"
  ON public.global_test_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
  );

-- 8. SEGMENTAL TEST RESULTS
-- =============================================
CREATE TABLE public.segmental_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  body_region TEXT NOT NULL, -- 'ankle', 'hip', 'lumbar', 'thoracic', 'shoulder'
  test_name TEXT NOT NULL,
  
  -- Results
  left_value NUMERIC(6,2),
  right_value NUMERIC(6,2),
  pass_fail_left BOOLEAN,
  pass_fail_right BOOLEAN,
  
  -- Reference values
  cutoff_value NUMERIC(6,2),
  unit TEXT, -- 'degrees', 'cm', 'seconds', etc.
  
  notes TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.segmental_test_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via assessment ownership"
  ON public.segmental_test_results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
  );

-- 9. FUNCTIONAL FINDINGS (generated from test analysis)
-- =============================================
CREATE TABLE public.functional_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  
  -- Classification tags (e.g., MOB_DF_ANKLE, HYPO_GMED)
  classification_tag TEXT NOT NULL,
  body_region TEXT NOT NULL,
  
  -- Severity and scores
  severity severity_level NOT NULL DEFAULT 'mild',
  biomechanical_importance INTEGER CHECK (biomechanical_importance >= 0 AND biomechanical_importance <= 3),
  context_weight INTEGER CHECK (context_weight >= 0 AND context_weight <= 4),
  priority_score NUMERIC(4,2),
  
  -- Related muscles
  hyperactive_muscles JSONB DEFAULT '[]'::jsonb,
  hypoactive_muscles JSONB DEFAULT '[]'::jsonb,
  
  -- Potential injuries
  associated_injuries JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.functional_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via assessment ownership"
  ON public.functional_findings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
  );

-- 10. EXERCISES LIBRARY
-- =============================================
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  fabrik_phase fabrik_phase NOT NULL,
  body_region TEXT NOT NULL,
  
  -- Video reference (external link)
  video_url TEXT,
  
  -- Targeting
  target_muscles JSONB DEFAULT '[]'::jsonb,
  target_classifications JSONB DEFAULT '[]'::jsonb,
  
  -- Progression criteria
  progression_criteria TEXT,
  
  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;

-- Exercises are readable by all authenticated users
CREATE POLICY "Authenticated users can read exercises"
  ON public.exercises FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Only professionals can create/update exercises
CREATE POLICY "Professionals can manage exercises"
  ON public.exercises FOR ALL
  USING (public.has_role(auth.uid(), 'professional'));

-- 11. PROTOCOLS (generated for each assessment)
-- =============================================
CREATE TABLE public.protocols (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  
  -- Protocol metadata
  name TEXT,
  priority_level priority_level NOT NULL DEFAULT 'medium',
  phase INTEGER DEFAULT 1,
  
  -- Exercises in sequence (ordered by FABRIK phase)
  exercises JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Scheduling
  frequency_per_week INTEGER DEFAULT 3,
  duration_weeks INTEGER DEFAULT 4,
  
  -- Progress tracking
  completion_percentage NUMERIC(5,2) DEFAULT 0,
  next_review_date DATE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Access via assessment ownership"
  ON public.protocols FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assessments a
      WHERE a.id = assessment_id
      AND (a.professional_id = auth.uid() OR a.student_id = auth.uid())
    )
  );

-- 12. PROGRESS LOGS (student tracking)
-- =============================================
CREATE TABLE public.progress_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol_id UUID NOT NULL REFERENCES public.protocols(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5)
);

ALTER TABLE public.progress_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can log their progress"
  ON public.progress_logs FOR ALL
  USING (auth.uid() = student_id);

CREATE POLICY "Professionals can view student progress"
  ON public.progress_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.protocols p
      JOIN public.assessments a ON a.id = p.assessment_id
      WHERE p.id = protocol_id AND a.professional_id = auth.uid()
    )
  );

-- 13. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_anamnesis_responses_updated_at
  BEFORE UPDATE ON public.anamnesis_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_global_test_results_updated_at
  BEFORE UPDATE ON public.global_test_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_segmental_test_results_updated_at
  BEFORE UPDATE ON public.segmental_test_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_protocols_updated_at
  BEFORE UPDATE ON public.protocols
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. FUNCTION TO CREATE PROFILE ON SIGNUP
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email
  );
  
  -- Default role is 'student', professionals are assigned manually
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
