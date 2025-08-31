import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Procesando autenticación…");

  useEffect(() => {
    const urlError = searchParams.get("error_description") || searchParams.get("error");
    if (urlError) {
      setMsg(decodeURIComponent(urlError));
      const t = setTimeout(() => navigate("/auth", { replace: true }), 1200);
      return () => clearTimeout(t);
    }

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      const go = async (uid: string) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, is_admin")
          .eq("user_id", uid)              // tu esquema usa user_id
          .single();

        // Corregido: Verificamos si existe el campo 'role' en el perfil antes de acceder a él
        // Fixed: Check if 'role' field exists in profile before accessing it
        if (profile && "role" in profile && profile.role === "customer") {
          navigate("/", { replace: true });
        } else {
          // si por alguna razón no quedó como customer, bloqueamos el social login
          // if for some reason the user is not a customer, block social login
          await supabase.auth.signOut();
          setMsg("Esta vía de acceso es solo para clientes. Ingrese por el portal correspondiente.");
          setTimeout(() => navigate("/auth", { replace: true }), 1200);
        }
      };

      if (!session?.user) {
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
          if (s?.user) {
            go(s.user.id);
            sub.subscription.unsubscribe();
          }
        });
        return;
      }
      go(session.user.id);
    };

    run();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="text-center text-sm text-muted-foreground">{msg}</div>
    </div>
  );
}
