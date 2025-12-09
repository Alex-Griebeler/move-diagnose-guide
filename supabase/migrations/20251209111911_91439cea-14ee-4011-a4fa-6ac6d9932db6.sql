-- Fix: Professionals can only create assessments for students linked to them
-- Drop existing policy
DROP POLICY IF EXISTS "Professionals can manage their assessments" ON public.assessments;

-- Create separate policies for better control
-- SELECT: Professionals can view their own assessments
CREATE POLICY "Professionals can view their assessments" 
ON public.assessments 
FOR SELECT 
TO authenticated
USING (auth.uid() = professional_id);

-- INSERT: Professionals can only create assessments for linked students
CREATE POLICY "Professionals can create assessments for linked students" 
ON public.assessments 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = professional_id 
  AND EXISTS (
    SELECT 1 FROM public.professional_students 
    WHERE professional_id = auth.uid() 
    AND student_id = assessments.student_id
  )
);

-- UPDATE: Professionals can update their own assessments
CREATE POLICY "Professionals can update their assessments" 
ON public.assessments 
FOR UPDATE 
TO authenticated
USING (auth.uid() = professional_id)
WITH CHECK (auth.uid() = professional_id);

-- DELETE: Professionals can delete their own assessments
CREATE POLICY "Professionals can delete their assessments" 
ON public.assessments 
FOR DELETE 
TO authenticated
USING (auth.uid() = professional_id);