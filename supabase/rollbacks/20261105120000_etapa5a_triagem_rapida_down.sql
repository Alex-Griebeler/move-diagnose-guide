-- Rollback of 20261105120000_etapa5a_triagem_rapida.sql: back to 20261104120000 alone, where the quick protocol
-- only keeps the red flag version. The new screens keep working; the old ones too. Nothing is deleted.
-- sandbox_exec does not get INSERT back on the clearance tables: that write was never meant to exist.
DROP TRIGGER IF EXISTS guard_quick_session_red_flags ON public.quick_protocol_sessions;
DROP FUNCTION IF EXISTS public.guard_quick_session_red_flags();

DROP TRIGGER IF EXISTS quick_session_red_flags_version ON public.quick_protocol_sessions;
CREATE TRIGGER quick_session_red_flags_version
BEFORE INSERT OR UPDATE ON public.quick_protocol_sessions
FOR EACH ROW
EXECUTE FUNCTION public.quick_session_red_flags_version();
