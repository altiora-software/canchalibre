// supabase/functions/owner-onboarding/index.ts
// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    // Autenticación del usuario que llama
    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace("Bearer ", "");
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const {
      ownerName,
      ownerPhone,
      complex, // opcional: { name, whatsapp, address, neighborhood?, notes?, latitude?, longitude? }
    } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")! // Service Role
    );

    // Obtener el user_id desde el JWT
    const { data: userInfo, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !userInfo?.user) {
      return new Response("Invalid token", { status: 401 });
    }
    const uid = userInfo.user.id;

    // 1) Promover a owner y actualizar datos del perfil
    const { error: promoteErr } = await supabase.rpc("promote_to_owner", {
      p_user: uid,
      p_full_name: ownerName ?? null,
      p_phone: (ownerPhone ?? "").replace(/\D/g, "") || null,
    });
    if (promoteErr) throw promoteErr;

    // 2) Si llegó info de complejo, crear el primero (si no tiene)
    if (complex) {
      // ¿ya tiene alguno?
      const { data: exists, error: exErr } = await supabase
        .from("sport_complexes")
        .select("id")
        .eq("owner_id", uid)
        .limit(1);
      if (exErr) throw exErr;

      if (!exists || exists.length === 0) {
        const row = {
          owner_id: uid,
          name: complex.name,
          address: complex.address,
          neighborhood: complex.neighborhood ?? null,
          description: complex.notes ?? null,
          whatsapp: (complex.whatsapp ?? "").replace(/\D/g, "") || null,
          phone: (complex.whatsapp ?? "").replace(/\D/g, "") || null,
          is_active: true,
          is_approved: false,
          payment_status: "trial",
          subscription_expires_at: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString(),
          latitude: complex.latitude ?? null,
          longitude: complex.longitude ?? null,
        };

        const { error: insErr } = await supabase
          .from("sport_complexes")
          .insert(row);
        if (insErr) throw insErr;
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e.message ?? String(e) }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
});
