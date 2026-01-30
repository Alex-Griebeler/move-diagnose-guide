import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  console.log("get-signed-url called, method:", req.method, "url:", req.url);

  if (req.method === "OPTIONS") {
    console.log("Handling OPTIONS preflight");
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    console.log("Processing POST request...");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("Missing authorization header");
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

    console.log("User authenticated:", user.id);

    const body = await req.json();
    const { filePath } = body;
    
    console.log("Requested filePath:", filePath);

    if (!filePath || typeof filePath !== "string") {
      console.error("Missing or invalid filePath");
      return new Response(JSON.stringify({ error: "Missing or invalid filePath" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pathParts = filePath.split('/');
    if (pathParts.length < 2) {
      console.error("Invalid path format:", filePath);
      return new Response(JSON.stringify({ error: "Invalid file path format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const folderId = pathParts[0];
    console.log("Checking ownership for folder:", folderId);

    // Check if folder matches an assessment the user owns
    const { data: assessment } = await supabase
      .from('assessments')
      .select('id')
      .eq('id', folderId)
      .or(`professional_id.eq.${user.id},student_id.eq.${user.id}`)
      .maybeSingle();

    // Check if folder matches a quick_protocol_session the user owns
    const { data: quickSession } = await supabase
      .from('quick_protocol_sessions')
      .select('id')
      .eq('id', folderId)
      .or(`professional_id.eq.${user.id},student_id.eq.${user.id}`)
      .maybeSingle();

    const hasAccess = !!assessment || !!quickSession;
    console.log("Access check result:", { assessment: !!assessment, quickSession: !!quickSession, hasAccess });

    if (!hasAccess) {
      console.error("Access denied: user", user.id, "attempted to access", filePath);
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Access granted, generating signed URL...");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabaseAdmin.storage
      .from("assessment-media")
      .createSignedUrl(filePath, 3600); // 1 hora de validade

    if (error) {
      console.error("Error creating signed URL:", error);
      // Return 404 if file not found, 500 for other errors
      const isNotFound = error.message?.toLowerCase().includes('not found') || 
                         (error as any).statusCode === '404';
      const status = isNotFound ? 404 : 500;
      const errorMessage = isNotFound ? "File not found" : "Failed to create signed URL";
      return new Response(JSON.stringify({ error: errorMessage, code: status }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Signed URL created successfully");

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
