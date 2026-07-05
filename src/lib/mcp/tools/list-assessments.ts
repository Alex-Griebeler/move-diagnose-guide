import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "list_assessments",
  title: "List assessments",
  description:
    "List functional assessments visible to the signed-in user. Optionally filter by student_id and status.",
  inputSchema: {
    student_id: z.string().uuid().optional().describe("Filter by student profile id."),
    status: z
      .enum(["not_started", "in_progress", "completed"])
      .optional()
      .describe("Filter by assessment status."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ student_id, status, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("assessments")
      .select("id, student_id, professional_id, status, started_at, completed_at, notes, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 50);
    if (student_id) q = q.eq("student_id", student_id);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { assessments: data ?? [] },
    };
  },
});
