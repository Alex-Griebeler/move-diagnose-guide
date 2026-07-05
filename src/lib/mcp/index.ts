import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoamiTool from "./tools/whoami";
import listStudentsTool from "./tools/list-students";
import listAssessmentsTool from "./tools/list-assessments";
import getAssessmentTool from "./tools/get-assessment";
import listProtocolsTool from "./tools/list-protocols";
import listProgressLogsTool from "./tools/list-progress-logs";

// OAuth issuer MUST be the direct Supabase host, built from the project ref
// (Vite inlines VITE_SUPABASE_PROJECT_ID at build time — import-safe).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "fabrik-mcp",
  title: "Fabrik — Functional Assessment",
  version: "0.1.0",
  instructions:
    "Tools to read a physiotherapist's Fabrik data: students, functional assessments, global/segmental test results, generated protocols, and exercise progress logs. All calls are scoped to the signed-in user via row-level security. Use `whoami` to confirm identity, `list_students` and `list_assessments` to browse, and `get_assessment` for full detail including test results and findings.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    whoamiTool,
    listStudentsTool,
    listAssessmentsTool,
    getAssessmentTool,
    listProtocolsTool,
    listProgressLogsTool,
  ],
});
