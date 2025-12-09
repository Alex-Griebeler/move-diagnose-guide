-- Fix exercises RLS: restrict UPDATE/DELETE to owners only
DROP POLICY IF EXISTS "Professionals can manage exercises" ON public.exercises;

-- Allow any professional to SELECT exercises (read-only)
CREATE POLICY "Professionals can view exercises"
ON public.exercises
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'professional'));

-- Allow any professional to INSERT new exercises
CREATE POLICY "Professionals can create exercises"
ON public.exercises
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'professional')
  AND (created_by IS NULL OR created_by = auth.uid())
);

-- Allow professionals to UPDATE only their own exercises
CREATE POLICY "Professionals can update own exercises"
ON public.exercises
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'professional')
  AND (created_by = auth.uid() OR created_by IS NULL)
);

-- Allow professionals to DELETE only their own exercises
CREATE POLICY "Professionals can delete own exercises"
ON public.exercises
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'professional')
  AND (created_by = auth.uid() OR created_by IS NULL)
);