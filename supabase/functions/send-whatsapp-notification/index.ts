import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:8080",
  "http://localhost:5173",
  "https://canchalibre.vercel.app",
];

function getCorsHeaders(request: Request): HeadersInit {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const origin = request.headers.get("Origin");
  const permittedOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

  return {
    "Access-Control-Allow-Origin": origin && permittedOrigins.includes(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function json(request: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: getCorsHeaders(request) });
}

function hasAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const configuredOrigins = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return (configuredOrigins.length > 0 ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS).includes(origin);
}

function bearerToken(request: Request): string | null {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}

Deno.serve(async (request) => {
  if (!hasAllowedOrigin(request)) return json(request, { error: "Origin not allowed" }, 403);
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const token = bearerToken(request);
  if (!token) return json(request, { error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase Edge Function configuration");
    return json(request, { error: "Service unavailable" }, 503);
  }

  let payload: { reservationId?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json(request, { error: "Invalid JSON body" }, 400);
  }
  if (typeof payload.reservationId !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.reservationId)) {
    return json(request, { error: "reservationId must be a UUID" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return json(request, { error: "Unauthorized" }, 401);

  const { data: reservation, error: reservationError } = await supabase
    .from("reservations")
    .select("id, user_id, reservation_date, start_time, end_time, total_price, payment_method, court:sport_courts(name, sport), complex:sport_complexes(name, whatsapp, phone)")
    .eq("id", payload.reservationId)
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (reservationError) {
    console.error("Could not load reservation for notification", { reservationId: payload.reservationId, code: reservationError.code });
    return json(request, { error: "Could not process notification" }, 500);
  }
  if (!reservation) return json(request, { error: "Reservation not found" }, 404);

  const complex = Array.isArray(reservation.complex) ? reservation.complex[0] : reservation.complex;
  const court = Array.isArray(reservation.court) ? reservation.court[0] : reservation.court;
  const phone = normalizePhone(complex?.whatsapp) ?? normalizePhone(complex?.phone);
  if (!phone) return json(request, { error: "The complex has no valid WhatsApp number" }, 422);

  // Recipient and contents are derived server-side so callers cannot turn this endpoint into a messaging relay.
  const message = [
    "Nueva reserva en CanchaLibre",
    `Complejo: ${complex?.name ?? "Sin nombre"}`,
    `Cancha: ${court?.name ?? "Sin nombre"}${court?.sport ? ` (${court.sport})` : ""}`,
    `Fecha: ${reservation.reservation_date}`,
    `Horario: ${reservation.start_time} - ${reservation.end_time}`,
    `Total: $${reservation.total_price}`,
    `Pago: ${reservation.payment_method}`,
  ].join("\n");
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  console.info("WhatsApp notification prepared", { reservationId: reservation.id, userId: userData.user.id });
  return json(request, { success: true, whatsappUrl });
});
