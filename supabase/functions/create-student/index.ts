import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decideSignup, successMessage, type ExistingAccount, type SignupOutcome } from "./signupDecision.ts";

// ============================================================================
// SECURE PASSWORD GENERATION
// ============================================================================
// Generates a cryptographically random 24-char password with guaranteed
// character-class coverage (upper, lower, digit, symbol) — no predictable suffix.
function generateSecureTempPassword(length = 24): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*()-_=+[]{}";
  const all = upper + lower + digits + symbols;
  const pick = (set: string) => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return set[buf[0] % set.length];
  };
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  for (let i = chars.length; i < length; i++) chars.push(pick(all));
  // Fisher-Yates shuffle with CSPRNG
  for (let i = chars.length - 1; i > 0; i--) {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    const j = buf[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

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

interface SuccessResponse {
  success: true;
  studentId: string;
  studentName: string;
  studentEmail: string;
  mode: "invite" | "inperson";
  existingUser: boolean;
  accessEmailSent: boolean;
  assessmentId?: string;
  message: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
): Promise<{ valid: boolean; error?: string; callerEmail?: string }> {
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
  return { valid: true, callerEmail: caller.email };
}

// ============================================================================
// STEP 3: Find Existing Account (with its role and whether it is linked)
// ============================================================================

// A failed read throws: before, it read as "no account" and the function tried to create one that already existed
async function findExistingAccount(
  email: string,
  professionalId: string,
  supabaseAdmin: SupabaseClient
): Promise<ExistingAccount | null> {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (profileError) throw new Error(`Erro ao procurar o aluno: ${profileError.message}`);
  if (!profile) {
    console.log("[FIND]", { found: false });
    return null;
  }

  const { data: roleData, error: roleError } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", profile.id)
    .maybeSingle();
  if (roleError) throw new Error(`Erro ao ler o papel da conta: ${roleError.message}`);

  const { data: link, error: linkError } = await supabaseAdmin
    .from("professional_students")
    .select("id")
    .eq("professional_id", professionalId)
    .eq("student_id", profile.id)
    .maybeSingle();
  if (linkError) throw new Error(`Erro ao conferir o vínculo: ${linkError.message}`);

  // Never signed in: no password of their own, so the invite sends them the e-mail to create one
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (authError || !authData?.user) throw new Error(`Erro ao ler a conta do aluno: ${authError?.message ?? "conta não encontrada"}`);

  const existing = {
    id: profile.id,
    role: roleData?.role ?? null,
    linked: !!link,
    hasSignedIn: !!authData.user.last_sign_in_at,
  };
  console.log("[FIND]", { found: true, studentId: existing.id, role: existing.role, linked: existing.linked, hasSignedIn: existing.hasSignedIn });
  return existing;
}

// ============================================================================
// STEP 4: Send the access e-mail (account that never signed in)
// ============================================================================

// The recovery e-mail: the link signs the student in and the app opens /definir-senha. inviteUserByEmail refuses an
// e-mail that already has an account
async function sendAccessEmail(email: string, supabaseAdmin: SupabaseClient): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email);
  if (error) {
    console.error("[ACCESS] Error:", error.message);
    return { success: false, error: error.message };
  }
  console.log("[ACCESS] Sent");
  return { success: true };
}

// ============================================================================
// STEP 5: Create New Student
// ============================================================================

async function createNewStudent(
  request: CreateStudentRequest,
  supabaseAdmin: SupabaseClient
): Promise<{ success: boolean; userId?: string; error?: string }> {
  const { email, fullName, phone, mode } = request;

  if (mode === "invite") {
    // Send invitation email
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, phone: phone || null },
    });

    if (error) {
      console.error("[CREATE] Invite error:", error.message);
      return { success: false, error: `Erro ao enviar convite: ${error.message}` };
    }

    console.log("[CREATE] User invited:", data.user?.id);
    return { success: true, userId: data.user?.id };
  }

  // In-person mode: create user with confirmed email
  const tempPassword = generateSecureTempPassword();

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

  // UNIQUE (professional_id, student_id): a concurrent request already linked them, which is what was asked
  if (error?.code === "23505") {
    console.log("[LINK] Already linked:", { professionalId, studentId });
    return { success: true };
  }
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
    const validation = await validateRequest(req.clone());
    if (!validation.valid || !validation.data) {
      console.log("[VALIDATE] Failed:", validation.error);
      return errorResponse(validation.error || "Requisição inválida", 400);
    }

    const request = validation.data;
    console.log("[REQUEST]", { email: request.email, mode: request.mode });

    // 3. Setup admin client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Verify caller is professional
    const profVerification = await verifyProfessional(authHeader, request.professionalId, supabaseAdmin);
    if (!profVerification.valid) {
      return errorResponse(profVerification.error || "Não autorizado", 403);
    }

    // 5. Check if the e-mail already has an account, and decide
    const existing = await findExistingAccount(request.email, request.professionalId, supabaseAdmin);
    const decision = decideSignup(
      request.email,
      request.mode,
      { id: request.professionalId, email: profVerification.callerEmail },
      existing,
    );

    if (decision.action === "reject") {
      console.log("[FLOW] Rejected:", decision.status);
      return errorResponse(decision.error, decision.status);
    }

    let studentId: string;
    let outcome: SignupOutcome;

    if (decision.action === "sendAccess") {
      // 6a. Student account that never signed in: link it if needed, then send the e-mail to create the password
      studentId = decision.studentId;
      outcome = "accessSent";
      console.log("[FLOW] Sending access to existing student:", { studentId, link: decision.link });

      if (decision.link) {
        const linkResult = await linkStudentToProfessional(request.professionalId, studentId, supabaseAdmin);
        if (!linkResult.success) {
          return errorResponse(linkResult.error || "Erro ao vincular", 500);
        }
      }

      const accessResult = await sendAccessEmail(request.email, supabaseAdmin);
      if (!accessResult.success) {
        // Linked already, so a new invite in a few minutes only resends the e-mail. The provider's text stays in the log
        return errorResponse(
          `${request.fullName} está vinculado a você, mas o e-mail de acesso não saiu. ` +
            "Envie o convite de novo daqui a alguns minutos.",
          502,
        );
      }
    } else if (decision.action === "link") {
      // 6b. The account exists, is a student's that already signed in and is not linked yet: link it
      studentId = decision.studentId;
      outcome = "linked";
      console.log("[FLOW] Linking existing student:", studentId);

      const linkResult = await linkStudentToProfessional(request.professionalId, studentId, supabaseAdmin);
      if (!linkResult.success) {
        return errorResponse(linkResult.error || "Erro ao vincular", 500);
      }
    } else {
      // 6c. Create new student
      console.log("[FLOW] Creating new student");
      const createResult = await createNewStudent(request, supabaseAdmin);
      
      if (!createResult.success || !createResult.userId) {
        return errorResponse(createResult.error || "Erro ao criar usuário", 500);
      }

      studentId = createResult.userId;
      outcome = "created";

      // Update profile with full name and phone
      await updateProfile(studentId, request.fullName, request.phone, supabaseAdmin);

      // Link new student to professional
      const linkResult = await linkStudentToProfessional(request.professionalId, studentId, supabaseAdmin);
      if (!linkResult.success) {
        return errorResponse(linkResult.error || "Erro ao vincular", 500);
      }
    }

    // 7. Create assessment if in-person mode
    let assessmentId: string | undefined;
    if (request.mode === "inperson") {
      const assessmentResult = await createAssessment(request.professionalId, studentId, supabaseAdmin);
      if (assessmentResult.error) {
        return errorResponse(assessmentResult.error, 500);
      }
      assessmentId = assessmentResult.assessmentId;
    }

    // 8. Build success message
    const message = successMessage(request.mode, outcome, request.fullName, request.email);

    console.log("[SUCCESS]", { studentId, mode: request.mode, outcome, assessmentId });

    return successResponse({
      success: true,
      studentId,
      studentName: request.fullName,
      studentEmail: request.email,
      mode: request.mode,
      existingUser: outcome !== "created",
      accessEmailSent: outcome === "accessSent",
      assessmentId,
      message,
    });

  } catch (error) {
    console.error("[ERROR]", error);
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    return errorResponse(message, 500);
  }
});
