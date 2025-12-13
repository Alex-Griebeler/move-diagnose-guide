import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = [
  'https://5253ca48-5fa8-4259-a6a1-d572744c9bc8.lovableproject.com',
  'https://id-preview--5253ca48-5fa8-4259-a6a1-d572744c9bc8.lovable.app',
  'https://fabrik.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')));
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

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

    const assessmentId = pathParts[0];
    console.log("Checking ownership for assessment:", assessmentId);

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
      .createSignedUrl(filePath, 900);

    if (error) {
      console.error("Error creating signed URL:", error);
      return new Response(JSON.stringify({ error: "Failed to create signed URL" }), {
        status: 500,
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
