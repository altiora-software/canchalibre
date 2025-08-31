import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const TAG = "[OwnersAuth]";

/**
 * Redirige al dashboard del propietario:
 * 1) Si hay owner:lastComplexId en localStorage, verifica que sea de este owner y navega ahí.
 * 2) Sino busca el primer complejo del owner y navega ahí.
 * 3) Si no tiene complejos, navega a /register-complex.
 */
async function goToOwnersComplex(navigate: (path: string, opts?: any) => void, uid: string) {
  try {
    // 1) Último complejo usado (validar propiedad)
    const last = localStorage.getItem("owner:lastComplexId");
    if (last) {
      const { data: owned, error: ownedErr } = await supabase
        .from("sport_complexes")
        .select("id, owner_id")
        .eq("id", last)
        .eq("owner_id", uid)
        .maybeSingle();

      if (!ownedErr && owned?.id) {
        console.log(TAG, "navigate → /owners/complex/" + owned.id, "(validated lastComplexId)");
        navigate(`/owners/complex/${owned.id}`, { replace: true });
        return;
      } else {
        console.log(TAG, "lastComplexId no es válido para este owner, lo ignoro");
        localStorage.removeItem("owner:lastComplexId");
      }
    }

    // 2) Buscar el primer complejo del owner
    const { data: complexes, error } = await supabase
      .from("sport_complexes")
      .select("id")
      .eq("owner_id", uid)
      .order("created_at", { ascending: true })
      .limit(1);

    if (!error && complexes?.[0]?.id) {
      const cid = complexes[0].id;
      console.log(TAG, "navigate → /owners/complex/" + cid, "(first complex of owner)");
      localStorage.setItem("owner:lastComplexId", cid);
      navigate(`/owners/complex/${cid}`, { replace: true });
      return;
    }

    // 3) No tiene complejos aún
    console.log(TAG, "navigate → /register-complex (owner without complexes)");
    navigate("/register-complex", { replace: true });
  } catch (e) {
    console.error(TAG, "goToOwnersComplex error", e);
    // fallback seguro
    navigate("/register-complex", { replace: true });
  }
}

const OwnersAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchProfileRole = async (uid: string) => {
    console.log(TAG, "fetchProfileRole() for user_id:", uid);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, role")
      .eq("user_id", uid)
      .maybeSingle();

    console.log(TAG, "profiles query →", { data, error });
    return { data, error };
  };

  // Auto-redirect si ya hay sesión
  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log(TAG, "initial getSession →", !!session);
      const uid = session?.user?.id;
      if (uid) {
        const { data, error } = await fetchProfileRole(uid);
        if (!error && data?.role === "owner") {
          await goToOwnersComplex(navigate, uid);
        }
      }

      // Escuchar cambios de auth (por si otra pestaña loguea)
      const { data: sub } = supabase.auth.onAuthStateChange(async (event, sess) => {
        console.log(TAG, "onAuthStateChange →", event, !!sess);
        const userId = sess?.user?.id;
        if (!userId) return;

        const { data, error } = await fetchProfileRole(userId);
        if (!error && data?.role === "owner") {
          await goToOwnersComplex(navigate, userId);
        }
      });

      unsub = () => sub?.subscription?.unsubscribe();
    })();

    return () => { try { unsub?.(); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Submit login (propietario)
  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log(TAG, "signInWithPassword()");
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log(TAG, "signInWithPassword →", { user: data?.user?.id, error });

      if (error) throw error;
      if (!data?.user?.id) throw new Error("No se obtuvo el usuario luego del login.");

      const uid = data.user.id;
      const { data: p, error: pErr } = await fetchProfileRole(uid);
      if (pErr) throw pErr;

      if (p?.role === "owner") {
        await goToOwnersComplex(navigate, uid);
      } else {
        await supabase.auth.signOut();
        setError("Esta cuenta no tiene permisos de propietario.");
      }
    } catch (err: any) {
      console.error(TAG, "login error:", err);
      setError(err?.message ?? "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  // Reset pass
  const sendReset = async () => {
    setSendingReset(true);
    setError("");

    try {
      const base =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "https://canchalibre.vercel.app";

      console.log(TAG, "resetPasswordForEmail → redirectTo:", `${base}/owners/reset`);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${base}/owners/reset`,
      });
      if (error) throw error;
      alert("Te enviamos un email con el enlace para restablecer tu contraseña.");
    } catch (err: any) {
      console.error(TAG, "reset error:", err);
      setError(err?.message ?? "No se pudo enviar el email de recuperación.");
    } finally {
      setSendingReset(false);
    }
  };

  // UI
  return (
    <>
      <Helmet>
        <title>Propietarios - Iniciar sesión</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-sport rounded-lg flex items-center justify-center shadow-lg">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-foreground">Cancha Libre</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Portal de Propietarios</h1>
            <p className="text-muted-foreground">Acceso exclusivo para dueños de complejos</p>
          </div>

          <Card className="shadow-card-custom border-0">
            <CardHeader className="pb-6 text-center">
              <CardTitle className="text-2xl text-foreground">Iniciar sesión</CardTitle>
              <CardDescription>Ingresá con el usuario que te creamos</CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-6 border-destructive/20 bg-destructive/5">
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>

                <Button type="submit" className="w-full h-11" disabled={loading}>
                  {loading ? "Ingresando…" : "Ingresar"}
                </Button>
              </form>

              <div className="flex items-center justify-between mt-4">
                <button
                  type="button"
                  className="text-sm text-primary hover:underline"
                  onClick={sendReset}
                  disabled={!email || sendingReset}
                >
                  {sendingReset ? "Enviando…" : "¿Olvidaste tu contraseña?"}
                </button>
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:underline"
                  onClick={() => navigate("/auth")}
                >
                  Soy cliente
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default OwnersAuth;
