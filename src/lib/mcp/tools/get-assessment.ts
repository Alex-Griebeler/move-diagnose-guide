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
  name: "get_assessment",
  title: "Get assessment details",
  description:
    "Fetch a functional assessment with its global test results, segmental test results, and findings.",
  inputSchema: {
    assessment_id: z.string().uuid().describe("Assessment id (UUID)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ assessment_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const [assessment, globals, segmentals, findings] = await Promise.all([
      supabase.from("assessments").select("*").eq("id", assessment_id).maybeSingle(),
      supabase.from("global_test_results").select("*").eq("assessment_id", assessment_id),
      supabase.from("segmental_test_results").select("*").eq("assessment_id", assessment_id),
      supabase.from("functional_findings").select("*").eq("assessment_id", assessment_id),
    ]);
    if (assessment.error) {
      return { content: [{ type: "text", text: assessment.error.message }], isError: true };
    }
    if (!assessment.data) {
      return { content: [{ type: "text", text: "Assessment not found." }], isError: true };
    }
    const payload = {
      assessment: assessment.data,
      global_test_results: globals.data ?? [],
      segmental_test_results: segmentals.data ?? [],
      functional_findings: findings.data ?? [],
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
