import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const OwnersReset = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // cuando llega desde el link, Supabase ya trae una sesión temporal
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError("El enlace no es válido o ya fue usado. Solicitá uno nuevo.");
      }
    })();
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (password.length < 8) { setError("La contraseña debe tener al menos 8 caracteres."); return; }
    if (password !== confirm) { setError("Las contraseñas no coinciden."); return; }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setOk("Contraseña actualizada. Ya podés ingresar.");
      setTimeout(() => navigate("/owners/auth", { replace: true }), 1000);
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
            {error && <Alert className="mb-4"><AlertDescription className="text-destructive">{error}</AlertDescription></Alert>}
            {ok && <Alert className="mb-4"><AlertDescription className="text-green-600">{ok}</AlertDescription></Alert>}

            <form onSubmit={onSave} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p1">Nueva contraseña</Label>
                <Input id="p1" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p2">Confirmar contraseña</Label>
                <Input id="p2" type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
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
