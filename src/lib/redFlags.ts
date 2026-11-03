// Etapa 5a: the 8 red flags of the anamnesis and of the quick protocol triage, and the server's rules for
// clearing them. The keys are the ones saved in anamnesis_responses.red_flags and quick_protocol_sessions.red_flags.

export const RED_FLAG_ITEMS = [
  { key: 'unexplainedWeightLoss', label: 'Perda de peso inexplicada' },
  { key: 'nightPain', label: 'Dor noturna que não melhora' },
  { key: 'fever', label: 'Febre associada à dor' },
  { key: 'bladderBowelDysfunction', label: 'Disfunção bexiga/intestino' },
  { key: 'progressiveWeakness', label: 'Fraqueza progressiva' },
  { key: 'recentTrauma', label: 'Trauma recente significativo' },
  { key: 'cancerHistory', label: 'Histórico de câncer' },
  { key: 'osteoporosis', label: 'Osteoporose' },
] as const;

export type RedFlagKey = (typeof RED_FLAG_ITEMS)[number]['key'];
export type RedFlags = Record<RedFlagKey, boolean>;

export const NO_RED_FLAGS = Object.fromEntries(RED_FLAG_ITEMS.map(item => [item.key, false])) as RedFlags;

export const activeRedFlags = (flags: RedFlags): RedFlagKey[] => RED_FLAG_ITEMS.filter(item => flags[item.key]).map(item => item.key);

// active_red_flags() answers "unspecified" when has_red_flags is true and no key is; any other unknown key shows as is
export function redFlagLabel(key: string): string {
  if (key === 'unspecified') return 'Red flag sem detalhe';
  return RED_FLAG_ITEMS.find(item => item.key === key)?.label ?? key;
}

// The justification of a clearance and the reason of a revocation: the server trims space, tab, CR and LF
// and counts characters
export const JUSTIFICATION_MIN = 20;
export const JUSTIFICATION_MAX = 2000;
export function justificationOk(text: string): boolean {
  const length = [...text.replace(/^[ \t\r\n]+|[ \t\r\n]+$/g, '')].length;
  return length >= JUSTIFICATION_MIN && length <= JUSTIFICATION_MAX;
}

export type RedFlagBlock = 'anamnesis_missing' | 'triage_missing' | 'red_flags_not_cleared';
const BLOCKS: readonly string[] = ['anamnesis_missing', 'triage_missing', 'red_flags_not_cleared'];

export interface RedFlagStatus {
  blocked: RedFlagBlock | null;
  activeFlags: string[];
  clearance: { id: string; justification: string; createdAt: string } | null;
}

// The answer of assessment_red_flag_status and quick_session_red_flag_status; null when it cannot be read
export function parseRedFlagStatus(data: unknown): RedFlagStatus | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const { blocked, active_flags, clearance } = data as Record<string, unknown>;
  if (blocked !== null && !(typeof blocked === 'string' && BLOCKS.includes(blocked))) return null;
  if (!Array.isArray(active_flags) || !active_flags.every(f => typeof f === 'string')) return null;
  let parsedClearance: RedFlagStatus['clearance'] = null;
  if (clearance !== null && clearance !== undefined) {
    const c = clearance as Record<string, unknown>;
    if (typeof c !== 'object' || typeof c.id !== 'string' || typeof c.justification !== 'string' || typeof c.created_at !== 'string') return null;
    parsedClearance = { id: c.id, justification: c.justification, createdAt: c.created_at };
  }
  return { blocked: blocked as RedFlagBlock | null, activeFlags: active_flags as string[], clearance: parsedClearance };
}

// The red flag gate stopped a generation (the Edge answers 409) or a save (the database raises one of the blocks)
export function isRedFlagGateError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const { message, context } = err as { message?: unknown; context?: unknown };
  if (typeof message === 'string' && BLOCKS.includes(message)) return true;
  return !!context && typeof context === 'object' && (context as { status?: unknown }).status === 409;
}
