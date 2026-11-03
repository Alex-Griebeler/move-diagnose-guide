import { supabase } from '@/integrations/supabase/client';
import type { ProtocolType } from '@/data/quickProtocolMappings';
import { createLogger } from '@/lib/logger';
import { activeRedFlags, type RedFlags } from '@/lib/redFlags';

const logger = createLogger('startQuickSession');

interface StartQuickSessionInput {
  // The session of an earlier try whose clearance failed: it is reused, with the side and triage of now
  sessionId: string | null;
  studentId: string;
  assessmentId: string | null;
  protocolType: ProtocolType;
  side: 'left' | 'right' | 'bilateral';
  redFlags: RedFlags;
  justification: string;
}

// Etapa 5a: the quick protocol session is created with its red flag triage, and a red flag is cleared right
// after, with the justification typed in the triage. Throws when the session cannot be created; cleared is
// false when the clearance failed, and the screen goes back to the card.
export async function startQuickSession(input: StartQuickSessionInput): Promise<{ sessionId: string; cleared: boolean }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let sessionId = input.sessionId;
  if (sessionId) {
    const { error } = await supabase
      .from('quick_protocol_sessions')
      .update({ affected_side: input.side, red_flags: input.redFlags })
      .eq('id', sessionId);
    if (error) throw error;
  } else {
    const { data: session, error } = await supabase
      .from('quick_protocol_sessions')
      .insert({
        student_id: input.studentId,
        professional_id: user.id,
        assessment_id: input.assessmentId,
        protocol_type: input.protocolType,
        status: 'in_progress',
        test_results: {},
        affected_side: input.side,
        red_flags: input.redFlags,
      })
      .select()
      .single();
    if (error) throw error;
    sessionId = session.id;
  }

  if (activeRedFlags(input.redFlags).length === 0) return { sessionId, cleared: true };
  const { error: clearError } = await supabase.rpc('clear_quick_session_red_flags', {
    _session_id: sessionId,
    _justification: input.justification,
  });
  if (clearError) {
    logger.error('Error clearing the red flags', clearError);
    return { sessionId, cleared: false };
  }
  return { sessionId, cleared: true };
}
