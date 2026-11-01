import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" };

// {assessment or quick session uuid}/{file name}. One folder level, no traversal.
const FILE_PATH_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9][A-Za-z0-9_.-]*$/;

const SIGNED_URL_TTL_SECONDS = 600;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    // User-scoped client: storage RLS (SELECT on storage.objects) decides access.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: jsonHeaders,
      });
    }

    const body = await req.json();
    const { filePath } = body;

    if (
      !filePath ||
      typeof filePath !== "string" ||
      filePath.includes("..") ||
      !FILE_PATH_PATTERN.test(filePath)
    ) {
      console.error("Invalid filePath rejected for user", user.id);
      return new Response(JSON.stringify({ error: "Missing or invalid filePath" }), {
        status: 400,
        headers: jsonHeaders,
      });
    }

    const { data, error } = await supabase.storage
      .from("assessment-media")
      .createSignedUrl(filePath, SIGNED_URL_TTL_SECONDS);

    if (error) {
      // Storage answers "not found" both for missing objects and for objects
      // the user may not read, so both map to 404 without revealing which.
      const isNotFound = error.message?.toLowerCase().includes("not found") ||
                         (error as any).statusCode === "404";
      const status = isNotFound ? 404 : 500;
      console.error("Signed URL not created for user", user.id, "status", status);
      const errorMessage = isNotFound ? "File not found" : "Failed to create signed URL";
      return new Response(JSON.stringify({ error: errorMessage, code: status }), {
        status,
        headers: jsonHeaders,
      });
    }

    return new Response(JSON.stringify({ signedUrl: data.signedUrl }), {
      status: 200,
      headers: jsonHeaders,
    });
  } catch (error) {
    console.error("Unexpected error in get-signed-url:", error instanceof Error ? error.name : "unknown");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: jsonHeaders,
    });
  }
});
