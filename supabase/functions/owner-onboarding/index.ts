import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://canchalibre.vercel.app",
];

function corsHeaders(request: Request): HeadersInit {
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const origin = request.headers.get("Origin");
  const allowedOrigins = configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
  return {
    "Access-Control-Allow-Origin": origin && allowedOrigins.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function response(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function allowedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  return (configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS).includes(origin);
}

function text(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function phone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

Deno.serve(async (request) => {
  if (!allowedOrigin(request)) return response(request, { ok: false, error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return response(request, { ok: false, error: "Method not allowed" }, 405);

  const match = (request.headers.get("Authorization") ?? "").match(/^Bearer\s+(.+)$/i);
  if (!match) return response(request, { ok: false, error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase Edge Function configuration");
    return response(request, { ok: false, error: "Service unavailable" }, 503);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response(request, { ok: false, error: "Invalid JSON body" }, 400);
  }

  const ownerName = body.ownerName === undefined ? null : text(body.ownerName, 120);
  const ownerPhone = body.ownerPhone === undefined ? null : phone(body.ownerPhone);
  if (body.ownerName !== undefined && !ownerName) return response(request, { ok: false, error: "Invalid owner name" }, 400);
  if (body.ownerPhone !== undefined && !ownerPhone) return response(request, { ok: false, error: "Invalid owner phone" }, 400);

  const complexInput = body.complex;
  if (complexInput !== undefined && (typeof complexInput !== "object" || complexInput === null || Array.isArray(complexInput))) {
    return response(request, { ok: false, error: "Invalid complex" }, 400);
  }
  const complex = complexInput as Record<string, unknown> | undefined;
  const complexName = complex ? text(complex.name, 160) : null;
  const address = complex ? text(complex.address, 240) : null;
  const neighborhood = complex?.neighborhood === undefined ? null : text(complex.neighborhood, 100);
  const description = complex?.notes === undefined ? null : text(complex.notes, 2_000);
  const whatsapp = complex?.whatsapp === undefined ? null : phone(complex.whatsapp);
  const latitude = complex?.latitude === undefined ? null : Number(complex.latitude);
  const longitude = complex?.longitude === undefined ? null : Number(complex.longitude);
  if (complex && (!complexName || !address || (complex.neighborhood !== undefined && !neighborhood) || (complex.notes !== undefined && !description) || (complex.whatsapp !== undefined && !whatsapp) || (latitude !== null && (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) || (longitude !== null && (!Number.isFinite(longitude) || longitude < -180 || longitude > 180)))) {
    return response(request, { ok: false, error: "Invalid complex data" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabase.auth.getUser(match[1]);
  if (userError || !userData.user) return response(request, { ok: false, error: "Unauthorized" }, 401);

  const { data: profile, error: profileError } = await supabase.rpc("promote_to_owner", {
    p_user: userData.user.id,
    p_full_name: ownerName,
    p_phone: ownerPhone,
  });
  if (profileError) {
    console.error("Could not promote owner", { userId: userData.user.id, code: profileError.code });
    return response(request, { ok: false, error: "Could not complete onboarding" }, 500);
  }
  if (!profile) return response(request, { ok: false, error: "Profile not found" }, 409);

  let complexId: string | null = null;
  if (complex && complexName && address) {
    const { data: existing, error: existingError } = await supabase.from("sport_complexes").select("id").eq("owner_id", profile.id).limit(1).maybeSingle();
    if (existingError) {
      console.error("Could not check existing complex", { profileId: profile.id, code: existingError.code });
      return response(request, { ok: false, error: "Could not complete onboarding" }, 500);
    }
    if (existing) {
      complexId = existing.id;
    } else {
      const { data: created, error: createError } = await supabase.from("sport_complexes").insert({
        owner_id: profile.id,
        name: complexName,
        address,
        neighborhood,
        description,
        whatsapp,
        phone: whatsapp,
        is_active: false,
        is_approved: false,
        payment_status: "pending",
        latitude,
        longitude,
      }).select("id").single();
      if (createError) {
        console.error("Could not create complex", { profileId: profile.id, code: createError.code });
        return response(request, { ok: false, error: "Could not complete onboarding" }, 500);
      }
      complexId = created.id;
    }
  }

  console.info("Owner onboarding completed", { userId: userData.user.id, complexId });
  return response(request, { ok: true, complexId });
});
