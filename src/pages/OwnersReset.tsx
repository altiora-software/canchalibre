import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

function parseParams() {
  // Lee tanto ?query como #hash
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (k: string) => search.get(k) || hash.get(k);

  return {
    access_token: get("access_token"),
    refresh_token: get("refresh_token"),
    token_type: get("token_type") || get("type"), // recovery / magiclink
    code: get("code"), // por si algún flujo viene con code
  };
}

const OwnersReset = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      setError("");
      // 1) si vienen tokens en la URL, setear sesión
      const { access_token, refresh_token } = parseParams();
      if (access_token && refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });
        if (error) {
          setError("No se pudo inicializar la sesión de recuperación.");
          return;
        }
        // Limpia el hash para no dejar tokens en pantalla
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 2) verificar que exista sesión
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("El enlace no es válido o ya fue usado. Solicitá uno nuevo.");
        setSessionReady(false);
        return;
      }
      setSessionReady(true);
    })();
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");

    if (!sessionReady) {
      setError("La sesión de recuperación no está activa. Volvé a abrir el enlace del email.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk("Contraseña actualizada. Ya podés ingresar.");
      setTimeout(() => navigate("/owners/auth", { replace: true }), 1200);
    } catch (err: any) {
      setError(err?.message ?? "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Restablecer contraseña - Propietarios</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen grid place-items-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Restablecer contraseña</CardTitle>
            <CardDescription>Ingresá tu nueva contraseña para tu cuenta de propietario.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4">
                <AlertDescription className="text-destructive">{error}</AlertDescription>
              </Alert>
            )}
            {ok && (
              <Alert className="mb-4">
                <AlertDescription className="text-green-600">{ok}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={onSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p1">Nueva contraseña</Label>
                <Input id="p1" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2">Confirmar contraseña</Label>
                <Input id="p2" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !sessionReady}>
                {loading ? "Guardando…" : "Guardar contraseña"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default OwnersReset;
