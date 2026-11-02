// Generation cache for ProtocolGenerator (F-15): the generated protocol is kept in assessment_drafts with
// the key of the request that produced it, so coming back to the step with the same tests and anamnesis
// does not pay for another generation. save_assessment_protocol deletes it when the assessment is completed.
import { parseGeneratedProtocol, type GeneratedProtocol } from '@/lib/protocolResponse';

export const PROTOCOL_DRAFT_STEP = 'protocol';

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(record).sort().map(k => [k, sortKeys(record[k])]));
  }
  return value;
};

// Object keys sorted, lists kept in the order they came: the same request always gives the same text
export const canonicalJson = (value: unknown): string => JSON.stringify(sortKeys(value)) ?? '';

// SHA-256 of the canonical request. Null where crypto.subtle is missing (outside HTTPS or localhost):
// then nothing is cached and every entry generates, as before.
export async function requestKey(body: unknown): Promise<string | null> {
  try {
    if (!globalThis.crypto?.subtle) return null;
    const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonicalJson(body)));
    return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

// The saved protocol, only if it came from this same request and still passes the response check
export function cachedProtocol(draftData: unknown, key: string | null): GeneratedProtocol | null {
  if (!key || !draftData || typeof draftData !== 'object' || Array.isArray(draftData)) return null;
  const draft = draftData as Record<string, unknown>;
  return draft.inputKey === key ? parseGeneratedProtocol(draft.protocol) : null;
}
