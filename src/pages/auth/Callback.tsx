import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Procesando autenticación…");

  useEffect(() => {
    // 1) Si Supabase nos devolvió error en la URL, mostrarlo y volver al login
    const urlError = searchParams.get("error_description") || searchParams.get("error");
    if (urlError) {
      setMsg(decodeURIComponent(urlError));
      // redirigimos al login después de un segundo
      const t = setTimeout(() => navigate("/auth", { replace: true }), 1200);
      return () => clearTimeout(t);
    }

    // 2) Intentar leer la sesión inmediatamente
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // Si todavía no llegó, escuchamos el cambio de estado una sola vez
      if (!session) {
        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, s) => {
          if (s?.user) {
            await postLoginRedirect(s.user.id, navigate, setMsg);
            sub.subscription.unsubscribe();
          }
        });
        return;
      }

      await postLoginRedirect(session.user.id, navigate, setMsg);
    };

    run();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center space-y-2">
        <div className="animate-pulse text-sm text-muted-foreground">{msg}</div>
      </div>
    </div>
  );
}

async function postLoginRedirect(
  userId: string,
  navigate: (to: string, opts?: any) => void,
  setMsg: (m: string) => void
) {
  // chequeamos el profile para decidir a dónde mandarlo
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (error) {
    // si aún no existe el profile (p.ej. trigger demoró), reintentar una vez breve
    await new Promise(r => setTimeout(r, 400));
    const { data: p2 } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();
    if (p2?.is_admin) {
      navigate("/admin", { replace: true });
      return;
    }
    navigate("/dashboard", { replace: true });
    return;
  }

  setMsg("¡Bienvenido! Redirigiendo…");
  if (profile?.is_admin) navigate("/admin", { replace: true });
  else navigate("/dashboard", { replace: true }); // ajusta si querés otra ruta por defecto
}
