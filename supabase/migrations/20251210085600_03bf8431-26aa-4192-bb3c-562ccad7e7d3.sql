-- Fix: Restrict professional access to only linked student profiles
-- This prevents professionals from accessing ALL user profiles

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Professionals can search profiles by email" ON public.profiles;

-- Create a properly scoped policy for professionals
-- They can only view profiles of students linked to them via professional_students
CREATE POLICY "Professionals can view linked student profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id  -- Users can always view their own profile
  OR EXISTS (
    SELECT 1 FROM public.professional_students ps
    WHERE ps.professional_id = auth.uid()
    AND ps.student_id = profiles.id
  )
);