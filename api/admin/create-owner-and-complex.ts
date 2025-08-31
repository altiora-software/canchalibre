import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE  = process.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL || 'https://canchalibre.vercel.app';

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  // Busca paginando. Escala chica → sobrado.
  const perPage = 200;
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find(u => (u.email || '').toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < perPage) break; // no hay más páginas
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const { owner, complex } = req.body as {
      owner: { email: string; full_name?: string };
      complex: {
        name: string; address: string; neighborhood?: string; phone?: string;
        website?: string; whatsapp?: string; description?: string;
      };
    };

    if (!owner?.email || !complex?.name || !complex?.address) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return res.status(500).json({ error: 'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) buscar por email
    let userId = await findUserIdByEmail(admin, owner.email);

    // 2) crear si no existe
    if (!userId) {
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: owner.email,
        email_confirm: true,
      });
      if (createErr) {
        // Si ya existía, reintenta la búsqueda
        if ((createErr.message || '').toLowerCase().includes('already') ||
            (createErr.message || '').toLowerCase().includes('registered')) {
          userId = await findUserIdByEmail(admin, owner.email);
        }
        if (!userId) throw createErr;
      } else {
        userId = created.user.id;
      }
    }

    // 3) upsert profile como owner
    const { error: upErr } = await admin
      .from('profiles')
      .upsert({
        id: userId, // si tu tabla usa id=user_id
        user_id: userId,
        email: owner.email,
        full_name: owner.full_name || owner.email,
        role: 'owner',
        is_admin: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });
    if (upErr) throw upErr;

    // 4) crear complejo
    const { data: sc, error: scErr } = await admin
      .from('sport_complexes')
      .insert([{
        owner_id: userId,
        name: complex.name,
        address: complex.address,
        neighborhood: complex.neighborhood ?? null,
        phone: complex.phone ?? null,
        email: owner.email,
        website: complex.website ?? null,
        whatsapp: complex.whatsapp ?? null,
        description: complex.description ?? null,
        is_approved: true,
        is_active: true,
        payment_status: 'trial',
        subscription_expires_at: new Date(Date.now() + 15*24*3600*1000).toISOString(),
      }])
      .select()
      .single();
    if (scErr) throw scErr;

    // 5) link de recuperación para que seteé password
    const { data: link, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: owner.email,
      options: { redirectTo: `${PUBLIC_APP_URL}/owners/reset` },
    });
    if (linkErr) throw linkErr;

    return res.status(200).json({
      ok: true,
      user_id: userId,
      complex: sc,
      recovery_link: link?.properties?.action_link || null,
    });
  } catch (e: any) {
    console.error('[create-owner-and-complex] ERROR', e);
    return res.status(500).json({ error: e?.message || 'Internal Server Error' });
  }
}
