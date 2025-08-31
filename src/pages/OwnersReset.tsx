import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, X } from "lucide-react";

function parseParams() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (k: string) => search.get(k) || hash.get(k);
  return {
    access_token: get("access_token"),
    refresh_token: get("refresh_token"),
    token_type: get("token_type") || get("type"),
    code: get("code"),
  };
}

const rules = {
  length: (v: string) => v.length >= 8,
  lower: (v: string) => /[a-z]/.test(v),
  upper: (v: string) => /[A-Z]/.test(v),
  number: (v: string) => /\d/.test(v),
  symbol: (v: string) => /[^A-Za-z0-9]/.test(v),
};

const OwnersReset = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showP1, setShowP1] = useState(false);
  const [showP2, setShowP2] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();

  // Inicializa sesión desde el link
  useEffect(() => {
    (async () => {
      setCheckingSession(true);
      setError("");
      const { access_token, refresh_token, code } = parseParams();
      try {
        if (code && !access_token && !refresh_token) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
          window.history.replaceState({}, document.title, window.location.pathname);
        }
        const { data: { session } } = await supabase.auth.getSession();
        setSessionReady(!!session);
        if (!session) {
          setError("El enlace no es válido o ya fue usado. Solicitá uno nuevo.");
        }
      } catch (e: any) {
        setError(e?.message || "No se pudo inicializar la sesión de recuperación.");
        setSessionReady(false);
      } finally {
        setCheckingSession(false);
      }
    })();
  }, []);

  // Validación en vivo
  const checks = useMemo(() => ({
    length: rules.length(password),
    lower: rules.lower(password),
    upper: rules.upper(password),
    number: rules.number(password),
    symbol: rules.symbol(password),
    match: password.length > 0 && password === confirm,
  }), [password, confirm]);

  const isValid = sessionReady &&
    checks.length && checks.lower && checks.upper && checks.number && checks.symbol && checks.match;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setOk("");
    if (!sessionReady) {
      setError("La sesión de recuperación no está activa. Volvé a abrir el enlace del email.");
      return;
    }
    if (!isValid) {
      setError("Revisá los requisitos de la contraseña.");
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

  const Row = ({ ok, label }: { ok: boolean; label: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {ok ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-muted-foreground" />}
      <span className={ok ? "text-green-700" : "text-muted-foreground"}>{label}</span>
    </div>
  );

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
            {checkingSession && (
              <Alert className="mb-4">
                <AlertDescription>Validando enlace…</AlertDescription>
              </Alert>
            )}
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
                <div className="relative">
                  <Input
                    id="p1"
                    type={showP1 ? "text" : "password"}
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={!sessionReady || loading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                    onClick={() => setShowP1((s) => !s)}
                  >
                    {showP1 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="p2">Confirmar contraseña</Label>
                <div className="relative">
                  <Input
                    id="p2"
                    type={showP2 ? "text" : "password"}
                    value={confirm}
                    onChange={(e)=>setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={!sessionReady || loading}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                    onClick={() => setShowP2((s) => !s)}
                  >
                    {showP2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 bg-muted/20 rounded p-3">
                <Row ok={checks.length} label="Mínimo 8 caracteres" />
                <Row ok={checks.lower} label="Una letra minúscula" />
                <Row ok={checks.upper} label="Una letra mayúscula" />
                <Row ok={checks.number} label="Un número" />
                <Row ok={checks.symbol} label="Un símbolo" />
                <Row ok={checks.match} label="Coincidencia en confirmación" />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !isValid}>
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
