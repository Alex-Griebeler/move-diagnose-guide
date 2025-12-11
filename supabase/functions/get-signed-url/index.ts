import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:8080",
  "https://lovable.dev",
  "https://www.lovable.dev",
  "https://gptengineer.app",
  "https://www.gptengineer.app",
  "https://xrtsioacrybmcexyhaia.supabase.co",
];

function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && (allowedOrigins.includes(origin) || origin.endsWith(".lovable.app"));
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  console.log("get-signed-url called, method:", req.method);
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { filePath } = await req.json();
    if (!filePath || typeof filePath !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract assessmentId from filePath (format: {assessmentId}/test_view_type.ext)
    const pathParts = filePath.split('/');
    if (pathParts.length < 2) {
      console.warn(`Invalid path format from user ${user.id}: ${filePath}`);
      return new Response(JSON.stringify({ error: "Invalid file path format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const assessmentId = pathParts[0];

    // Verify user has access to this assessment (must be professional_id or student_id)
    const { data: assessment, error: assessmentError } = await supabase
      .from('assessments')
      .select('id')
      .eq('id', assessmentId)
      .or(`professional_id.eq.${user.id},student_id.eq.${user.id}`)
      .maybeSingle();

    if (assessmentError) {
      console.error("Error checking assessment ownership:", assessmentError);
      return new Response(JSON.stringify({ error: "Failed to verify access" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!assessment) {
      console.warn(`Access denied: user ${user.id} attempted to access ${filePath}`);
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Access granted for assessment ${assessmentId}, user: ${user.id}`);

    // Use service role to generate signed URL
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseAdmin.storage
      .from("assessment-media")
      .createSignedUrl(filePath, 900); // 15 minutes expiration

    if (error) {
      console.error("Error creating signed URL:", error);
      return new Response(JSON.stringify({ error: "Failed to create signed URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
