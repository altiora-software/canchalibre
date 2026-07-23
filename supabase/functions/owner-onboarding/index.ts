/**
 * Deprecated security boundary.
 *
 * Owner activation is now performed only after commercial approval through
 * invite-approved-owner. This endpoint deliberately never promotes a caller.
 */
const allowedOrigins = new Set([
  "http://localhost:8080",
  "http://localhost:5173",
  "https://canchalibre.vercel.app",
  ...(Deno.env.get("ALLOWED_ORIGINS") ?? "").split(",").map((origin) => origin.trim()).filter(Boolean),
]);

Deno.serve((request) => {
  const origin = request.headers.get("Origin");
  const headers = {
    "Access-Control-Allow-Origin": origin && allowedOrigins.has(origin) ? origin : "null",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  return new Response(JSON.stringify({ ok: false, error: "Owner onboarding requires commercial approval." }), { status: 410, headers });
});
