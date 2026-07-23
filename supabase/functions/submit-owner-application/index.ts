import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://canchalibre.vercel.app",
];
const MAX_BODY_BYTES = 24_000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_ROLES = new Set(["owner", "authorized_administrator", "company_representative"]);
const CONTACT_METHODS = new Set(["whatsapp", "phone", "email"]);
const OPERATION_TYPES = new Set(["court_rental", "club", "sports_school", "sports_center", "other"]);
const VERIFICATION_STATUSES = new Set(["licensed", "in_process", "not_available"]);

function allowedOrigins(): string[] {
  const configured = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
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
    "Access-Control-Allow-Headers": "content-type, x-client-info, apikey",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders(request) });
}

function normalizedText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length > 0 && normalized.length <= maxLength ? normalized : null;
}

function normalizedEmail(value: unknown): string | null {
  const email = normalizedText(value, 254)?.toLowerCase() ?? null;
  return email && EMAIL.test(email) ? email : null;
}

function normalizedPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

function finiteNumber(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function enumValue(value: unknown, allowed: Set<string>): string | null {
  return typeof value === "string" && allowed.has(value) ? value : null;
}

function sports(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 8) return null;
  const values = value.map((sport) => normalizedText(sport, 48));
  if (values.some((sport) => !sport)) return null;
  const unique = [...new Set(values as string[])];
  return unique.length === values.length ? unique : null;
}

function openingHours(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length < 1 || entries.length > 7) return null;
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  for (const [day, schedule] of entries) {
    if (!/^[a-z_]{3,16}$/i.test(day) || typeof schedule !== "object" || schedule === null || Array.isArray(schedule)) return null;
    const item = schedule as Record<string, unknown>;
    if (typeof item.closed !== "boolean") return null;
    if (!item.closed && (!time.test(String(item.open ?? "")) || !time.test(String(item.close ?? "")))) return null;
  }
  return value as Record<string, unknown>;
}

function parsePayload(body: unknown): Record<string, unknown> | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  // Honeypot: a browser user never fills it. Do not reveal that it was detected.
  if (input.website !== undefined && normalizedText(input.website, 200)) return null;

  const contact = input.contact;
  const complex = input.complex;
  const verification = input.verification;
  if (typeof contact !== "object" || contact === null || Array.isArray(contact) ||
    typeof complex !== "object" || complex === null || Array.isArray(complex) ||
    typeof verification !== "object" || verification === null || Array.isArray(verification)) return null;

  const responsible = contact as Record<string, unknown>;
  const venue = complex as Record<string, unknown>;
  const review = verification as Record<string, unknown>;
  const contactName = normalizedText(responsible.name, 120);
  const contactEmail = normalizedEmail(responsible.email);
  const contactPhone = normalizedPhone(responsible.phone);
  const contactRole = enumValue(responsible.role, CONTACT_ROLES);
  const preferredContact = enumValue(responsible.preferredContact, CONTACT_METHODS);
  const complexName = normalizedText(venue.name, 160);
  const address = normalizedText(venue.address, 240);
  const neighborhood = normalizedText(venue.neighborhood, 100);
  const city = normalizedText(venue.city, 100);
  const province = normalizedText(venue.province, 100);
  const publicPhone = normalizedPhone(venue.publicPhone);
  const offeredSports = sports(venue.sports);
  const courtCount = finiteNumber(venue.courtCount, 1, 200);
  const schedules = openingHours(venue.openingHours);
  const operationType = enumValue(venue.operationType, OPERATION_TYPES);
  const verificationStatus = enumValue(review.status, VERIFICATION_STATUSES);
  const consent = review.consent === true && review.authorizedRepresentative === true;
  const latitude = finiteNumber(venue.latitude, -90, 90);
  const longitude = finiteNumber(venue.longitude, -180, 180);

  if (!contactName || !contactEmail || !contactPhone || !contactRole || !preferredContact || !complexName || !address ||
    !neighborhood || !city || !province || !publicPhone || !offeredSports || !courtCount || !schedules || !operationType ||
    !verificationStatus || !consent || ((latitude === null) !== (longitude === null))) return null;

  return {
    p_contact_name: contactName,
    p_contact_email: contactEmail,
    p_contact_phone: contactPhone,
    p_contact_role: contactRole,
    p_preferred_contact: preferredContact,
    p_complex_name: complexName,
    p_address: address,
    p_neighborhood: neighborhood,
    p_city: city,
    p_province: province,
    p_latitude: latitude,
    p_longitude: longitude,
    p_public_phone: publicPhone,
    p_sports: offeredSports,
    p_court_count: Math.trunc(courtCount),
    p_opening_hours: schedules,
    p_operation_type: operationType,
    p_verification_status: verificationStatus,
    p_consent: true,
  };
}

Deno.serve(async (request) => {
  if (!hasAllowedOrigin(request)) return json(request, { ok: false, error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { ok: false, error: "Method not allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return json(request, { ok: false, error: "Request too large" }, 413);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(request, { ok: false, error: "Invalid request" }, 400);
  }
  const args = parsePayload(body);
  if (!args) return json(request, { ok: false, error: "Invalid application data" }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase Edge Function configuration");
    return json(request, { ok: false, error: "Service unavailable" }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data, error } = await supabase.rpc("submit_owner_application", args);
  if (error) {
    // The RPC is responsible for duplicate detection and rate limiting; never log applicant PII.
    console.error("Owner application submission failed", { code: error.code });
    const status = error.code === "23505" || error.code === "P0001" ? 409 : 500;
    return json(request, { ok: false, error: status === 409 ? "An application is already being reviewed" : "Could not submit application" }, status);
  }

  const applicationId = typeof data === "string" && UUID.test(data) ? data :
    typeof data === "object" && data !== null && UUID.test(String((data as Record<string, unknown>).id ?? ""))
      ? String((data as Record<string, unknown>).id)
      : null;
  if (!applicationId) {
    console.error("Owner application RPC returned an invalid response");
    return json(request, { ok: false, error: "Could not submit application" }, 500);
  }
  return json(request, { ok: true, applicationId, status: "submitted" }, 201);
});
