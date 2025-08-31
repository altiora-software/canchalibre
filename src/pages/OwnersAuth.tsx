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

const OwnersAuth = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sendingReset, setSendingReset] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    // si ya está logueado verificar que sea owner
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("role, is_admin")
        .eq("user_id", uid)
        .single();

        if (p && (p as any).role === "owner") {
          navigate("/admin", { replace: true }); // o tu dashboard de dueños
        } else {
        await supabase.auth.signOut();
      }
    };
    run();
  }, [navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const { data: p } = await supabase
        .from("profiles")
        .select("role, is_admin")
        .eq("user_id", data.user.id)
        .single();

      // Verifica que p exista y tenga la propiedad 'role' igual a 'owner'
      if (p && (p as any).role === "owner") {
        navigate("/admin", { replace: true }); // o tu dashboard de dueños
      } else {
        await supabase.auth.signOut();
        setError("Esta cuenta no tiene permisos de propietario.");
      }
    } catch (err: any) {
      setError(err?.message ?? "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    setSendingReset(true);
    setError("");

    try {
      const base =
        typeof window !== "undefined" && window.location?.origin
          ? window.location.origin
          : "https://canchalibre.vercel.app";

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${base}/owners/reset`, // página para setear nueva contraseña
      });
      if (error) throw error;
      alert("Te enviamos un email con el enlace para restablecer tu contraseña.");
    } catch (err: any) {
      setError(err?.message ?? "No se pudo enviar el email de recuperación.");
    } finally {
      setSendingReset(false);
    }
  };

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
              <span className="text-3xl font-bold text-foreground">Canchas Jujuy</span>
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
