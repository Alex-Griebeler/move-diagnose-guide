import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================================================
// TYPES
// ============================================================================

interface CreateStudentRequest {
  email: string;
  fullName: string;
  mode: "invite" | "inperson";
  professionalId: string;
  phone?: string;
}

interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: CreateStudentRequest;
}

interface StudentInfo {
  id: string;
  isExisting: boolean;
}

interface SuccessResponse {
  success: true;
  studentId: string;
  studentName: string;
  studentEmail: string;
  mode: "invite" | "inperson";
  existingUser: boolean;
  assessmentId?: string;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// HELPER: Create JSON Response
// ============================================================================

function jsonResponse(data: object, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function successResponse(data: SuccessResponse): Response {
  return jsonResponse(data, 200);
}

// ============================================================================
// STEP 1: Validate Request
// ============================================================================

async function validateRequest(req: Request): Promise<ValidationResult> {
  try {
    const body = await req.json();
    const { email, fullName, mode, professionalId, phone } = body;

    // Required fields
    if (!email || !fullName || !mode || !professionalId) {
      return { valid: false, error: "Campos obrigatórios faltando" };
    }

    // Email format
    if (!EMAIL_REGEX.test(email)) {
      return { valid: false, error: "Email inválido" };
    }

    // Mode validation
    if (mode !== "invite" && mode !== "inperson") {
      return { valid: false, error: "Modo inválido" };
    }

    return {
      valid: true,
      data: {
        email: email.toLowerCase().trim(),
        fullName: fullName.trim(),
        mode,
        professionalId,
        phone: phone?.trim() || undefined,
      },
    };
  } catch {
    return { valid: false, error: "Corpo da requisição inválido" };
  }
}

// ============================================================================
// STEP 2: Verify Caller is Professional
// ============================================================================

async function verifyProfessional(
  authHeader: string,
  professionalId: string,
  supabaseAdmin: SupabaseClient
): Promise<{ valid: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Get caller identity
  const { data: { user: caller }, error: callerError } = await supabaseUser.auth.getUser();
  if (callerError || !caller) {
    console.log("[VERIFY] Caller not authenticated");
    return { valid: false, error: "Não autorizado" };
  }

  // Verify caller matches professionalId
  if (caller.id !== professionalId) {
    console.log("[VERIFY] Caller ID mismatch:", { callerId: caller.id, professionalId });
    return { valid: false, error: "ID do profissional não confere" };
  }

  // Check if caller has professional role
  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", caller.id)
    .single();

  if (roleError || roleData?.role !== "professional") {
    console.log("[VERIFY] Caller is not a professional:", roleError?.message);
    return { valid: false, error: "Apenas profissionais podem cadastrar alunos" };
  }

  console.log("[VERIFY] Professional verified:", caller.id);
  return { valid: true };
}

// ============================================================================
// STEP 3: Find Existing Student
// ============================================================================

async function findExistingStudent(
  email: string,
  supabaseAdmin: SupabaseClient
): Promise<{ id: string } | null> {
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  console.log("[FIND]", { email, found: !!profile });
  return profile;
}

// ============================================================================
// STEP 4: Check if Already Linked
// ============================================================================

async function isAlreadyLinked(
  professionalId: string,
  studentId: string,
  supabaseAdmin: SupabaseClient
): Promise<boolean> {
  const { data: link } = await supabaseAdmin
    .from("professional_students")
    .select("id")
    .eq("professional_id", professionalId)
    .eq("student_id", studentId)
    .single();

  console.log("[LINK_CHECK]", { professionalId, studentId, linked: !!link });
  return !!link;
}

// ============================================================================
// STEP 5: Create New Student
// ============================================================================

async function createNewStudent(
  request: CreateStudentRequest,
  origin: string,
  supabaseAdmin: SupabaseClient
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const { email, fullName, phone, mode } = request;

  if (mode === "invite") {
    // Send invitation email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, phone: phone || null },
      redirectTo: `${origin}/auth`,
    });

    if (error) {
      console.error("[CREATE] Invite error:", error.message);
      return { success: false, error: `Erro ao enviar convite: ${error.message}` };
    }

    console.log("[CREATE] User invited:", data.user?.id);
    return { success: true, userId: data.user?.id };
  }

  // In-person mode: create user with confirmed email
  const tempPassword = crypto.randomUUID().slice(0, 12) + "Aa1!";

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName, phone: phone || null },
  });

  if (error) {
    console.error("[CREATE] CreateUser error:", error.message);
    return { success: false, error: `Erro ao criar usuário: ${error.message}` };
  }

  console.log("[CREATE] User created:", data.user?.id);
  return { success: true, userId: data.user?.id };
}

// ============================================================================
// STEP 6: Update Profile (for new users)
// ============================================================================

async function updateProfile(
  userId: string,
  fullName: string,
  phone: string | undefined,
  supabaseAdmin: SupabaseClient
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", userId);

  if (error) {
    console.warn("[PROFILE] Update warning:", error.message);
  } else {
    console.log("[PROFILE] Updated:", userId);
  }
}

// ============================================================================
// STEP 7: Link Student to Professional
// ============================================================================

async function linkStudentToProfessional(
  professionalId: string,
  studentId: string,
  supabaseAdmin: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("professional_students")
    .insert({ professional_id: professionalId, student_id: studentId });

  if (error) {
    console.error("[LINK] Error:", error.message);
    return { success: false, error: "Erro ao vincular aluno ao profissional" };
  }

  console.log("[LINK] Success:", { professionalId, studentId });
  return { success: true };
}

// ============================================================================
// STEP 8: Create Assessment (for in-person mode)
// ============================================================================

async function createAssessment(
  professionalId: string,
  studentId: string,
  supabaseAdmin: SupabaseClient
): Promise<{ assessmentId?: string; error?: string }> {
  const { data, error } = await supabaseAdmin
    .from("assessments")
    .insert({ professional_id: professionalId, student_id: studentId, status: "draft" })
    .select("id")
    .single();

  if (error) {
    console.error("[ASSESSMENT] Error:", error.message);
    return { error: "Erro ao criar avaliação" };
  }

  console.log("[ASSESSMENT] Created:", data.id);
  return { assessmentId: data.id };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Check authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log("[AUTH] No authorization header");
      return errorResponse("Não autorizado", 401);
    }

    // 2. Validate request body
    const validation = await validateRequest(req);
    if (!validation.valid || !validation.data) {
      console.log("[VALIDATE] Failed:", validation.error);
      return errorResponse(validation.error!, 400);
    }

    const request = validation.data;
    console.log("[REQUEST]", { email: request.email, mode: request.mode });

    // 3. Create admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Verify caller is a professional
    const professionalCheck = await verifyProfessional(authHeader, request.professionalId, supabaseAdmin);
    if (!professionalCheck.valid) {
      return errorResponse(professionalCheck.error!, professionalCheck.error === "Não autorizado" ? 401 : 403);
    }

    // 5. Check if student already exists
    const existingStudent = await findExistingStudent(request.email, supabaseAdmin);

    let student: StudentInfo;

    if (existingStudent) {
      // 5a. Check if already linked to this professional
      const linked = await isAlreadyLinked(request.professionalId, existingStudent.id, supabaseAdmin);
      if (linked) {
        return errorResponse("Este aluno já está vinculado a você", 409);
      }

      student = { id: existingStudent.id, isExisting: true };
    } else {
      // 5b. Create new student
      const origin = req.headers.get("origin") || `${supabaseUrl.replace(".supabase.co", ".lovable.app")}`;
      const createResult = await createNewStudent(request, origin, supabaseAdmin);
      
      if (!createResult.success || !createResult.userId) {
        return errorResponse(createResult.error!, 500);
      }

      // 5c. Update profile with full name and phone
      await updateProfile(createResult.userId, request.fullName, request.phone, supabaseAdmin);

      student = { id: createResult.userId, isExisting: false };
    }

    // 6. Link student to professional
    const linkResult = await linkStudentToProfessional(request.professionalId, student.id, supabaseAdmin);
    if (!linkResult.success) {
      return errorResponse(linkResult.error!, 500);
    }

    // 7. Create assessment for in-person mode
    let assessmentId: string | undefined;
    if (request.mode === "inperson") {
      const assessmentResult = await createAssessment(request.professionalId, student.id, supabaseAdmin);
      if (assessmentResult.error) {
        return errorResponse(assessmentResult.error, 500);
      }
      assessmentId = assessmentResult.assessmentId;
    }

    // 8. Build and return success response
    const message = student.isExisting
      ? "Aluno vinculado com sucesso!"
      : request.mode === "invite"
        ? "Convite enviado! O aluno receberá um email para definir sua senha."
        : "Aluno cadastrado com sucesso! Redirecionando para a avaliação...";

    const response: SuccessResponse = {
      success: true,
      studentId: student.id,
      studentName: request.fullName,
      studentEmail: request.email,
      mode: request.mode,
      existingUser: student.isExisting,
      ...(assessmentId && { assessmentId }),
      message,
    };

    console.log("[SUCCESS]", response);
    return successResponse(response);

  } catch (error) {
    console.error("[ERROR] Unexpected:", error);
    return errorResponse("Erro interno do servidor", 500);
  }
});
