// Node globals for code that runs inside the generated Supabase Edge Function
// (the MCP handler). These files are also type-checked by the Vite tsconfig.
declare const process: {
  env: Record<string, string | undefined>;
};
