-- =============================================
-- i) Row ids: the server picks them for clients
-- =============================================
-- Media folders are named after assessment and quick session ids, and storage
-- policies match the folder against both tables. A client-chosen id could reuse
-- another row's id and reach its folder, so clients never choose it; for them an
-- upsert on id is always a plain insert. Server-side callers (service_role,
-- which sees every row) may choose an id on insert or change it on update, but
-- never to one the other table uses; the advisory lock serializes concurrent
-- writes of the same id across both tables. Clients cannot change an id at all
-- (the update guards). Under RLS a client may not see the other table's row,
-- but its id is random.
CREATE OR REPLACE FUNCTION public.assign_server_row_id()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND current_user IN ('authenticated', 'anon') THEN
    NEW.id := gen_random_uuid();
  ELSIF TG_OP = 'UPDATE' AND NEW.id IS NOT DISTINCT FROM OLD.id THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.id::text, 0));

  IF (TG_TABLE_NAME = 'assessments'
      AND EXISTS (SELECT 1 FROM public.quick_protocol_sessions q WHERE q.id = NEW.id))
     OR (TG_TABLE_NAME = 'quick_protocol_sessions'
      AND EXISTS (SELECT 1 FROM public.assessments a WHERE a.id = NEW.id)) THEN
    RAISE EXCEPTION 'id already used by an assessment or quick protocol session'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_server_row_id() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS assign_server_row_id ON public.assessments;
CREATE TRIGGER assign_server_row_id
BEFORE INSERT OR UPDATE OF id ON public.assessments
FOR EACH ROW
EXECUTE FUNCTION public.assign_server_row_id();

DROP TRIGGER IF EXISTS assign_server_row_id ON public.quick_protocol_sessions;
CREATE TRIGGER assign_server_row_id
BEFORE INSERT OR UPDATE OF id ON public.quick_protocol_sessions
FOR EACH ROW
EXECUTE FUNCTION public.assign_server_row_id();

