import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateStudentRequest {
  email: string;
  fullName: string;
  mode: "invite" | "inperson";
  professionalId: string;
  phone?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header");
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Client with user's token to verify they're a professional
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for creating users
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the caller is a professional
    const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser();
    if (callerError || !caller) {
      console.error("Error getting caller:", callerError);
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is a professional
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();

    if (roleError || roleData?.role !== "professional") {
      console.error("Caller is not a professional:", roleError);
      return new Response(
        JSON.stringify({ error: "Apenas profissionais podem cadastrar alunos" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email, fullName, mode, professionalId, phone }: CreateStudentRequest = await req.json();
    console.log("Request:", { email, fullName, mode, professionalId });

    // Validate required fields
    if (!email || !fullName || !mode || !professionalId) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios faltando" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: "Email inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify professionalId matches caller
    if (professionalId !== caller.id) {
      return new Response(
        JSON.stringify({ error: "ID do profissional não confere" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", email.toLowerCase())
      .single();

    if (existingProfile) {
      // Check if already linked to this professional
      const { data: existingLink } = await supabaseAdmin
        .from("professional_students")
        .select("id")
        .eq("professional_id", professionalId)
        .eq("student_id", existingProfile.id)
        .single();

      if (existingLink) {
        return new Response(
          JSON.stringify({ error: "Este aluno já está vinculado a você" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Este email já está cadastrado no sistema" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a temporary password for the user
    const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";

    // Create the user based on mode
    let userData;
    if (mode === "invite") {
      // For invite mode, use inviteUserByEmail which sends the invitation email automatically
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        email.toLowerCase(),
        {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
          redirectTo: `${req.headers.get("origin") || Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app")}/auth`,
        }
      );

      if (error) {
        console.error("Error inviting user:", error);
        return new Response(
          JSON.stringify({ error: `Erro ao enviar convite: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userData = { user: data.user };
      console.log("User invited successfully:", userData.user?.id);

    } else {
      // For in-person mode, create user with confirmed email
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true, // Email is pre-confirmed for in-person
        user_metadata: {
          full_name: fullName,
          phone: phone || null,
        },
      });

      if (error) {
        console.error("Error creating user (inperson):", error);
        return new Response(
          JSON.stringify({ error: `Erro ao criar usuário: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      userData = data;
      console.log("User created (inperson mode):", userData.user?.id);
    }

    const newUserId = userData.user!.id;

    // The profile and role are created automatically by the database trigger
    // But we need to update the profile with the correct name and phone
    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        phone: phone || null,
      })
      .eq("id", newUserId);

    if (updateProfileError) {
      console.warn("Error updating profile:", updateProfileError);
    }

    // Link student to professional
    const { error: linkError } = await supabaseAdmin
      .from("professional_students")
      .insert({
        professional_id: professionalId,
        student_id: newUserId,
      });

    if (linkError) {
      console.error("Error linking student to professional:", linkError);
      return new Response(
        JSON.stringify({ error: "Erro ao vincular aluno ao profissional" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For in-person mode, also create an assessment
    let assessmentId = null;
    if (mode === "inperson") {
      const { data: assessment, error: assessmentError } = await supabaseAdmin
        .from("assessments")
        .insert({
          professional_id: professionalId,
          student_id: newUserId,
          status: "draft",
        })
        .select("id")
        .single();

      if (assessmentError) {
        console.error("Error creating assessment:", assessmentError);
        return new Response(
          JSON.stringify({ error: "Erro ao criar avaliação" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      assessmentId = assessment.id;
      console.log("Assessment created:", assessmentId);
    }

    // Return success response
    const response = {
      success: true,
      studentId: newUserId,
      studentName: fullName,
      studentEmail: email.toLowerCase(),
      mode,
      ...(assessmentId && { assessmentId }),
      message: mode === "invite" 
        ? "Convite enviado! O aluno receberá um email para definir sua senha."
        : "Aluno cadastrado com sucesso! Redirecionando para a avaliação...",
    };

    console.log("Success response:", response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
