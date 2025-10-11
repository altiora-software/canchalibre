import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Asegura que el perfil exista y tenga role 'user' (sin tocar perfiles ya tipados)
  const ensureUserRole = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const sUser = session?.user;
    if (!sUser) return;

    const uid = sUser.id;
    const email = sUser.email ?? null;
    const metaName =
      sUser.user_metadata?.full_name ||
      sUser.user_metadata?.name ||
      "";

    // Traigo (si existe) el perfil
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("user_id, role, full_name")
      .eq("user_id", uid)
      .maybeSingle();

    if (profErr) {
      // No bloqueo el login por esto; solo muestro por consola
      console.debug("profiles fetch warn:", profErr.message);
      return;
    }

    // Si no existe: lo creo con role 'user'
    if (!prof) {
      const { error: insErr } = await supabase.from("profiles").insert({
        user_id: uid,
        email,
        full_name: metaName || null,
        role: "user",
      });
      if (insErr) console.debug("profiles insert warn:", insErr.message);
      return;
    }

    // Si existe pero sin rol (o null), lo seteo a 'user'
    if (!prof.role) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ role: "user", full_name: prof.full_name || metaName || null })
        .eq("user_id", uid);
      if (updErr) console.debug("profiles update warn:", updErr.message);
    }
  };

  const ensureProfileRoleOnce = async (role: "user") => {
    const { data: { session } } = await supabase.auth.getSession();
    const sUser = session?.user;
    if (!sUser) return;
  
    const uid = sUser.id;
    const email = sUser.email ?? null;
    const metaName = sUser.user_metadata?.full_name || sUser.user_metadata?.name || "";
  
    // Verifico si existe perfil
    const { data: prof, error: profErr } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", uid)
      .maybeSingle();
  
    if (profErr) console.debug("profiles fetch warn:", profErr.message);
  
    // Solo si NO existe, lo creo con el rol correspondiente
    if (!prof) {
      const { error: insErr } = await supabase.from("profiles").insert({
        user_id: uid,
        email,
        full_name: metaName || null,
        role,
      });
      if (insErr) console.debug("profiles insert warn:", insErr.message);
    }
  };
  

  // Al montar: si ya está logueado, aseguro el rol y redirijo
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await ensureProfileRoleOnce("user");
        await ensureUserRole();
        navigate("/");
      }
    })();
    
    // También cuando ocurre SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_IN") {
          await ensureUserRole();
          navigate("/");
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setSocialLoading(provider);
    setError("");

    try {
      const baseUrl =
        window.location.hostname === "localhost"
          ? window.location.origin
          : "https://canchalibre.vercel.app";

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${baseUrl}/auth`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) throw error;
      // el onAuthStateChange se encarga de lo demás
    } catch (err: any) {
      setError(err.message || "Ocurrió un error al iniciar sesión.");
      setSocialLoading(null);
    }
  };

  return (
    <>
      <Helmet>
        <title>Iniciar Sesión - Cancha Libre</title>
        <meta
          name="description"
          content="Accede a tu cuenta para explorar y reservar canchas."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-sport rounded-lg flex items-center justify-center shadow-lg">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-foreground">Cancha Libre</span>
            </div>
            <p className="text-muted-foreground text-lg">
              Encuentra y reserva canchas deportivas
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Acceso para clientes
            </p>
          </div>

          <Card className="shadow-card-custom border-0">
            <CardHeader className="pb-6 text-center">
              <CardTitle className="text-2xl text-foreground">¡Bienvenido!</CardTitle>
              <CardDescription className="text-base">
                Ingresa para explorar y reservar canchas deportivas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-6 border-destructive/20 bg-destructive/5">
                  <AlertDescription className="text-destructive">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center gap-3 h-12 text-base font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => handleSocialLogin("google")}
                  disabled={socialLoading === "google"}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {socialLoading === "google" ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Conectando...
                    </div>
                  ) : (
                    "Continuar con Google"
                  )}
                </Button>
              </div>

              <div className="mt-8 p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">🎾 Para clientes</h3>
                <p className="text-sm text-muted-foreground">
                  Explora canchas, compara precios y horarios, y contacta por WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default Auth;
