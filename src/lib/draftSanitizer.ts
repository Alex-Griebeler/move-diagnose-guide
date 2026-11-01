// Helper to validate URLs before persisting (filter out blob/data URLs)
export function sanitizeMediaUrls(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    // Filter out local/blob URLs that won't work across sessions
    if (obj.startsWith('blob:') || obj.startsWith('data:')) {
      return undefined;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeMediaUrls);
  }
  // Dates are kept as ISO strings (Object.entries of a Date is empty, so they used to become {})
  if (obj instanceof Date) {
    return isNaN(obj.getTime()) ? undefined : obj.toISOString();
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const sanitized = sanitizeMediaUrls(value);
      if (sanitized !== undefined) {
        result[key] = sanitized;
      }
    }
    return result;
  }
  return obj;
}

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Restores a date saved by sanitizeMediaUrls. Anything else (e.g. the {} left by older drafts) becomes undefined.
export function restoreDraftDate(value: unknown): Date | undefined {
  if (typeof value !== 'string' || !ISO_DATE_TIME.test(value)) return undefined;
  const date = new Date(value);
  // Rejects impossible days that Date would roll over (2020-02-30 -> 2020-03-01)
  if (isNaN(date.getTime()) || date.toISOString() !== value) return undefined;
  return date;
}
