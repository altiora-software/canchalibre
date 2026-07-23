import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, MapPin, ShieldCheck } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

const OwnersAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const validateApprovedOwner = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user || !active) return;

      setLoading(true);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (!error && profile?.role === "owner") {
        navigate("/dashboard", { replace: true });
        return;
      }

      await supabase.auth.signOut();
      if (active) {
        setMessage("Esta cuenta todavía no tiene acceso al portal. Usá el enlace de invitación que te envió Cancha Libre o aguardá la aprobación de tu solicitud.");
        setLoading(false);
      }
    };

    void validateApprovedOwner();
    return () => { active = false; };
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/owners/auth`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (error) {
      setMessage("No pudimos iniciar el acceso. Intentá nuevamente.");
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-background to-sky-50 p-4 dark:from-emerald-950/20 dark:to-sky-950/20">
      <Helmet>
        <title>Acceso de propietarios | Cancha Libre</title>
        <meta name="description" content="Acceso exclusivo para propietarios aprobados por Cancha Libre." />
      </Helmet>

      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-md flex-col justify-center py-10">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <MapPin className="h-7 w-7" aria-hidden="true" />
            </div>
            <span className="text-3xl font-bold tracking-tight text-foreground">Cancha Libre</span>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Portal de propietarios</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Acceso aprobado</h1>
          <p className="mt-3 text-muted-foreground">Este portal está disponible sólo para responsables de complejos validados por Cancha Libre.</p>
        </div>

        <Card className="border-border/80 shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" aria-hidden="true" />
            </div>
            <CardTitle>¿Recibiste una invitación?</CardTitle>
            <CardDescription>Ingresá con el mismo email al que Cancha Libre envió tu aprobación.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {message && <Alert><AlertDescription>{message}</AlertDescription></Alert>}
            <Button className="h-12 w-full gap-3 text-base" onClick={signIn} disabled={loading}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              {loading ? "Validando acceso…" : "Ingresar con Google"}
            </Button>
            <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
              <p className="flex items-center gap-2 font-medium text-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> La aprobación no publica tu complejo</p>
              <p className="mt-2">Podrás cargarlo en borrador. Cancha Libre revisará el contenido antes de habilitarlo en el catálogo y las reservas.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 border-dashed bg-card/70">
          <CardContent className="flex items-start gap-3 p-5">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold text-foreground">¿Todavía no tenés una invitación?</p>
              <p className="mt-1 text-sm text-muted-foreground">Primero enviá la solicitud de tu complejo. La revisamos antes de habilitar cualquier cuenta.</p>
              <Button asChild variant="link" className="mt-1 h-auto px-0"><Link to="/owners/apply">Solicitar publicación de mi complejo</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default OwnersAuth;
