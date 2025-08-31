// api/admin/create-owner-and-complex.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string; // <-- agrega esto en Vercel

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Opcional: valida que el que llama sea tu Super Admin (p.ej. header X-ADMIN-KEY o JWT interno)
  // ...

  const { owner, complex } = req.body as {
    owner: { email: string; full_name?: string };
    complex: {
      name: string; address: string; neighborhood?: string; phone?: string;
      description?: string; website?: string; whatsapp?: string;
    };
  };

  if (!owner?.email || !complex?.name || !complex?.address) {
    return res.status(400).json({ error: 'Campos requeridos faltantes' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    // 1) Crear (o conseguir) usuario Auth
    // Si ya existe, no falla: lo buscamos por email
    // Supabase no permite filtrar por email en listUsers, así que listamos y filtramos manualmente
    const { data: existingUsers, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (listErr) throw listErr;
    const existing = existingUsers?.users?.find((u: any) => u.email?.toLowerCase() === owner.email.toLowerCase());
    let userId: string | null = existing?.id ?? null;

    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: owner.email,
        email_confirm: true,        // marca email como verificado
      });
      if (createErr) throw createErr;
      userId = created.user.id;
    }

    // 2) Upsert profile con role=owner
    const { error: upErr } = await admin
      .from('profiles')
      .upsert({
        id: userId,         // por compatibilidad, si tu tabla tiene id=user_id
        user_id: userId,
        email: owner.email,
        full_name: owner.full_name ?? owner.email,
        role: 'owner',
        is_admin: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    if (upErr) throw upErr;

    // 3) Crear complejo
    const { data: sc, error: scErr } = await admin
      .from('sport_complexes')
      .insert([{
        owner_id: userId,               // FK a profiles/auth.users
        name: complex.name,
        address: complex.address,
        neighborhood: complex.neighborhood ?? null,
        phone: complex.phone ?? null,
        email: owner.email,
        description: complex.description ?? null,
        website: complex.website ?? null,
        whatsapp: complex.whatsapp ?? null,
        is_approved: true,              // o false si querés revisarlo antes
        is_active: true,
        payment_status: 'trial',        // opcional
        subscription_expires_at: new Date(Date.now() + 15*24*3600*1000).toISOString(),
      }])
      .select()
      .single();
    if (scErr) throw scErr;

    // 4) Generar link de recuperación para que defina contraseña
    // Podés enviarlo por email o devolverlo al panel para copiar/reenviar manualmente
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: owner.email,
      options: { redirectTo: `${process.env.PUBLIC_APP_URL ?? 'https://canchalibre.vercel.app'}/owners/reset` }
    });
    if (linkErr) throw linkErr;

    return res.status(200).json({ ok: true, user_id: userId, complex: sc, recovery_link: link?.properties?.action_link });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? 'Internal error' });
  }
}
