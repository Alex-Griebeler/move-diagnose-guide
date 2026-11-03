// The message to show for a failed supabase.functions.invoke. On a 4xx/5xx the client only says "Edge Function
// returned a non-2xx status code"; the function's own message is in the response body, as { error }.
export async function functionErrorMessage(err: unknown, fallback: string): Promise<string> {
  const context = (err as { context?: unknown } | null)?.context;
  if (context instanceof Response) {
    try {
      const body: unknown = await context.clone().json();
      const message = (body as { error?: unknown } | null)?.error;
      if (typeof message === 'string' && message.trim()) return message;
    } catch {
      // Not JSON: the fallback below
    }
  }
  return fallback;
}
