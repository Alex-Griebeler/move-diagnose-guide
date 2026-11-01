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
