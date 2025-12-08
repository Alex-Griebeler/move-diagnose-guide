-- Allow professionals to search profiles by email (for adding students)
CREATE POLICY "Professionals can search profiles by email"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'professional'::app_role)
);