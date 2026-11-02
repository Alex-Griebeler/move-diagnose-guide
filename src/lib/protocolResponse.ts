// Shape check for what generate-protocol returns, before it reaches the screen or the database.
// What the screen can work around is normalized; what it cannot is rejected.

export interface Exercise {
  name: string;
  phase: string;
  bodyRegion: string;
  targetMuscles: string[];
  sets: number;
  reps: string;
  instructions: string;
  rationale: string;
  priority: number;
}

export interface GeneratedProtocol {
  protocolName: string;
  priorityLevel: PriorityLevel;
  frequencyPerWeek: number;
  durationWeeks: number;
  summary: string;
  exercises: Exercise[];
}

// The values of the database enum priority_level
export const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low', 'maintenance'] as const;
export type PriorityLevel = typeof PRIORITY_LEVELS[number];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const positiveInt = (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v > 0;

function parseExercise(raw: unknown): Exercise | null {
  if (!isRecord(raw) || typeof raw.name !== 'string' || !raw.name || typeof raw.phase !== 'string' || !raw.phase) return null;
  return {
    name: raw.name,
    phase: raw.phase,
    bodyRegion: text(raw.bodyRegion),
    targetMuscles: Array.isArray(raw.targetMuscles) ? raw.targetMuscles.filter((m): m is string => typeof m === 'string') : [],
    sets: typeof raw.sets === 'number' ? raw.sets : 0,
    reps: typeof raw.reps === 'number' ? String(raw.reps) : text(raw.reps),
    instructions: text(raw.instructions),
    rationale: text(raw.rationale),
    priority: typeof raw.priority === 'number' ? raw.priority : 0,
  };
}

// Returns null when the response cannot be shown or saved as it is
export function parseGeneratedProtocol(raw: unknown): GeneratedProtocol | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.protocolName !== 'string' || !raw.protocolName) return null;
  if (!PRIORITY_LEVELS.includes(raw.priorityLevel as PriorityLevel)) return null;
  if (!positiveInt(raw.frequencyPerWeek) || !positiveInt(raw.durationWeeks)) return null;
  if (!Array.isArray(raw.exercises) || raw.exercises.length === 0) return null;
  const exercises = raw.exercises.map(parseExercise);
  if (exercises.some(e => e === null)) return null;
  return {
    protocolName: raw.protocolName,
    priorityLevel: raw.priorityLevel as PriorityLevel,
    frequencyPerWeek: raw.frequencyPerWeek as number,
    durationWeeks: raw.durationWeeks as number,
    summary: text(raw.summary),
    exercises: exercises as Exercise[],
  };
}
