import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Check, X, RefreshCw } from "lucide-react";

function parseParams() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const get = (k: string) => search.get(k) || hash.get(k);
  return {
    access_token: get("access_token"),
    refresh_token: get("refresh_token"),
    code: get("code"),
    token: get("token"),
    type: (get("type") || get("token_type")) || undefined,
  };
}

const rules = {
  length: (v: string) => v.length >= 8,
  lower: (v: string) => /[a-z]/.test(v),
  upper: (v: string) => /[A-Z]/.test(v),
  number: (v: string) => /\d/.test(v),
  symbol: (v: string) => /[^A-Za-z0-9]/.test(v),
};

export default function OwnersReset() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showP1, setShowP1] = useState(false);
  const [showP2, setShowP2] = useState(false);

  const [checking, setChecking] = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Intenta establecer sesión a partir de lo que venga en la URL
  const tryInitSession = async () => {
    setError("");
    const { access_token, refresh_token, code, token, type } = parseParams();

    try {
      // 1) Hash tokens (#access_token/#refresh_token)
      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token });
        if (error) throw error;
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 2) PKCE (?code=...)
      else if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) throw error;
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 3) token hash (?token=...&type=recovery)
      else if (token && (type === "recovery" || type === "recovery_token")) {
        // Nota: algunos flows requieren email; si fuera tu caso, pedimos email y lo pasamos.
        const { data, error } = await supabase.auth.verifyOtp({
          type: "recovery",
          token_hash: token,
        } as any);
        if (error) throw error;
        if (!data.session) {
          // A veces devuelve user + tokens; intentar leer sesión
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No se pudo crear la sesión desde el token.");
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // 4) Si no vino nada, quizá Supabase ya dejó la sesión lista
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("El enlace no es válido o ya fue usado.");

      setSessionReady(true);
      setStatus("ok");
    } catch (e: any) {
      console.error("[OwnersReset] init session error:", e);
      setSessionReady(false);
      setStatus("error");
      setError(e?.message || "No se pudo inicializar la sesión de recuperación.");
    }
  };

  // Efecto inicial + reintentos cortos (por si el navegador demora en devolver los tokens)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      await tryInitSession();

      if (!cancelled && !sessionReady) {
        // pequeños reintentos de lectura de sesión (hasta ~2s)
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setSessionReady(true);
            setStatus("ok");
            break;
          }
        }
      }
      if (!cancelled) setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checks = useMemo(() => ({
    length: rules.length(password),
    lower: rules.lower(password),
    upper: rules.upper(password),
    number: rules.number(password),
    symbol: rules.symbol(password),
    match: password.length > 0 && password === confirm,
  }), [password, confirm]);

  const isValid =
    sessionReady &&
    checks.length &&
    checks.lower &&
    checks.upper &&
    checks.number &&
    checks.symbol &&
    checks.match;

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk("");
    setError("");
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
            {(checking || status === "idle") && (
              <Alert className="mb-4"><AlertDescription>Validando enlace…</AlertDescription></Alert>
            )}
            {status === "error" && (
              <Alert className="mb-4">
                <AlertDescription className="text-destructive">
                  {error || "El enlace no es válido o ya fue usado."}
                </AlertDescription>
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
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    disabled={checking || loading || status === "error"}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                    onClick={() => setShowP1((s) => !s)}
                    aria-label={showP1 ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                    onChange={(e) => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    disabled={checking || loading || status === "error"}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground"
                    onClick={() => setShowP2((s) => !s)}
                    aria-label={showP2 ? "Ocultar contraseña" : "Mostrar contraseña"}
                  >
                    {showP2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1 bg-muted/20 rounded p-3">
                <Row ok={rules.length(password)} label="Mínimo 8 caracteres" />
                <Row ok={rules.lower(password)} label="Una letra minúscula" />
                <Row ok={rules.upper(password)} label="Una letra mayúscula" />
                <Row ok={rules.number(password)} label="Un número" />
                <Row ok={rules.symbol(password)} label="Un símbolo" />
                <Row ok={password.length > 0 && password === confirm} label="Coincidencia en confirmación" />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || checking || !isValid}
                >
                  {loading ? "Guardando…" : "Guardar contraseña"}
                </Button>

                {status === "error" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={async () => {
                      setChecking(true);
                      await tryInitSession();
                      setChecking(false);
                    }}
                    title="Reintentar validar enlace"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
