// Access process.env inside the MCP tool handlers. The MCP entry is bundled
// into a Supabase Edge Function where `process` is provided at runtime; this
// helper isolates the `any` cast so tool files stay strict.
export function serverEnv(name: string): string | undefined {
  const proc = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  return proc?.env?.[name];
}

export function requireServerEnv(name: string): string {
  const v = serverEnv(name);
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}
