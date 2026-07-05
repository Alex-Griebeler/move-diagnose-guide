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
  name: "list_students",
  title: "List students",
  description:
    "List students (patients) associated with the signed-in professional. Returns id, full_name and email.",
  inputSchema: {
    limit: z.number().int().min(1).max(200).optional().describe("Max rows to return. Default 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: links, error: linksError } = await supabase
      .from("professional_students")
      .select("student_id")
      .eq("professional_id", ctx.getUserId())
      .limit(limit ?? 50);
    if (linksError) {
      return { content: [{ type: "text", text: linksError.message }], isError: true };
    }
    const ids = (links ?? []).map((r: { student_id: string }) => r.student_id);
    if (ids.length === 0) {
      return {
        content: [{ type: "text", text: "No students found." }],
        structuredContent: { students: [] },
      };
    }
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", ids);
    if (profilesError) {
      return { content: [{ type: "text", text: profilesError.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(profiles, null, 2) }],
      structuredContent: { students: profiles ?? [] },
    };
  },
});
