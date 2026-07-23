import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://canchalibre.vercel.app",
];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function allowedOrigins(): string[] {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((origin) => origin.trim()).filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ALLOWED_ORIGINS;
}

function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins().includes(origin);
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins().includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function bearerToken(request: Request): string | null {
  return request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
}

function approvedEmail(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  for (const key of ["contact_email", "email", "applicant_email"]) {
    if (typeof item[key] === "string" && item[key].length <= 254) return item[key].trim().toLowerCase();
  }
  return null;
}

function redirectUrl(): string | null {
  const siteUrl = Deno.env.get("SITE_URL");
  if (!siteUrl) return null;
  try {
    return new URL("/owners/auth", siteUrl).toString();
  } catch {
    return null;
  }
}

async function markInvitedAndActivate(
  service: ReturnType<typeof createClient>,
  applicationId: string,
  userId: string,
): Promise<{ error: unknown | null }> {
  const { error: invitedError } = await service.rpc("mark_owner_application_invited", {
    p_application_id: applicationId,
  });
  if (invitedError) return { error: invitedError };

  const { error: activationError } = await service.rpc("activate_owner_application", {
    p_application_id: applicationId,
    p_user_id: userId,
  });
  return { error: activationError };
}

Deno.serve(async (request) => {
  if (!hasAllowedOrigin(request)) return json(request, { ok: false, error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { ok: false, error: "Method not allowed" }, 405);

  const token = bearerToken(request);
  if (!token) return json(request, { ok: false, error: "Unauthorized" }, 401);

  let payload: { applicationId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(request, { ok: false, error: "Invalid request" }, 400);
  }
  if (!UUID.test(String(payload.applicationId ?? ""))) return json(request, { ok: false, error: "applicationId must be a UUID" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ownerRedirectUrl = redirectUrl();
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !ownerRedirectUrl) {
    console.error("Missing Edge Function configuration");
    return json(request, { ok: false, error: "Service unavailable" }, 503);
  }

  // This client deliberately carries the caller JWT: the approval RPC must authorize the real administrator.
  const adminSession = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: caller, error: callerError } = await adminSession.auth.getUser(token);
  if (callerError || !caller.user) return json(request, { ok: false, error: "Unauthorized" }, 401);

  const { data: isAdmin, error: roleError } = await adminSession.rpc("is_current_user_admin");
  if (roleError || isAdmin !== true) return json(request, { ok: false, error: "Forbidden" }, 403);

  // The RPC performs the state transition and determines the email from the approved application.
  const { data: approved, error: approvalError } = await adminSession.rpc("approve_owner_application", {
    p_application_id: payload.applicationId,
  });
  if (approvalError) {
    console.error("Owner application approval failed", { applicationId: payload.applicationId, code: approvalError.code });
    const status = approvalError.code === "P0002" ? 404 : approvalError.code === "42501" ? 403 : 409;
    return json(request, { ok: false, error: status === 404 ? "Application not found" : "Application cannot be approved" }, status);
  }
  const email = approvedEmail(approved);
  if (!email) {
    console.error("Approval RPC did not return a recipient email", { applicationId: payload.applicationId });
    return json(request, { ok: false, error: "Application could not be activated" }, 500);
  }

  const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: invitation, error: inviteError } = await service.auth.admin.inviteUserByEmail(email, {
    redirectTo: ownerRedirectUrl,
  });
  if (!inviteError) {
    const userId = invitation.user?.id;
    if (!userId) {
      console.error("Invitation did not create a user", { applicationId: payload.applicationId });
      return json(request, { ok: false, error: "Invitation could not be completed" }, 502);
    }
    const { error: activationError } = await markInvitedAndActivate(service, String(payload.applicationId), userId);
    if (activationError) {
      console.error("Owner role activation failed", { applicationId: payload.applicationId });
      return json(request, { ok: false, error: "Invitation was sent but access could not be enabled" }, 502);
    }
    console.info("Owner invitation sent", { applicationId: payload.applicationId, actorId: caller.user.id });
    return json(request, { ok: true, invitation: "sent" });
  }

  // Existing accounts cannot receive an admin invite. Requesting an OTP with shouldCreateUser=false
  // sends a login link only to an existing account and never exposes a credential or action link.
  const { error: otpError } = await adminSession.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo: ownerRedirectUrl },
  });
  if (otpError) {
    console.error("Owner activation email failed", { applicationId: payload.applicationId, inviteCode: inviteError.code, otpCode: otpError.code });
    return json(request, { ok: false, error: "Application was approved but activation email could not be sent" }, 502);
  }

  const { data: existingProfile, error: profileError } = await service
    .from("profiles")
    .select("user_id")
    .eq("email", email)
    .maybeSingle();
  if (profileError || !existingProfile?.user_id) {
    console.error("Existing owner profile was not found", { applicationId: payload.applicationId });
    return json(request, { ok: false, error: "Application was approved but access could not be enabled" }, 502);
  }
  const { error: activationError } = await markInvitedAndActivate(service, String(payload.applicationId), existingProfile.user_id);
  if (activationError) {
    console.error("Existing owner role activation failed", { applicationId: payload.applicationId });
    return json(request, { ok: false, error: "Application was approved but access could not be enabled" }, 502);
  }

  console.info("Existing owner account activation link requested", { applicationId: payload.applicationId, actorId: caller.user.id });
  return json(request, { ok: true, invitation: "existing_account_link_sent" });
});
