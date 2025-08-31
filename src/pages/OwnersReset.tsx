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

const TAG = "[OwnersReset]";

// Reglas de complejidad
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

  // Procesa la URL actual y guarda la sesión (access_token en hash, PKCE code, etc.)
  const tryInitSession = async () => {
    setError("");
    setStatus("idle");
    console.log(TAG, "tryInitSession() start", {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
    });

    try {
      // Si la URL contiene indicadores de retorno de Auth, pedimos a Supabase que la procese.
      const looksLikeAuthReturn =
        window.location.hash.includes("access_token") ||
        window.location.search.includes("code=") ||
        window.location.search.includes("token=") ||
        window.location.search.includes("type=recovery");

      if (looksLikeAuthReturn) {
        const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
        console.log(TAG, "getSessionFromUrl()", { data, error });
        if (error) throw error;

        // Limpia la URL para ocultar tokens
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Confirmar que tenemos sesión
      const current = await supabase.auth.getSession();
      console.log(TAG, "final getSession()", current);

      if (!current.data.session) {
        throw new Error("El enlace no es válido o ya fue usado.");
      }

      setSessionReady(true);
      setStatus("ok");
      console.log(TAG, "Session READY ✅");
    } catch (e: any) {
      console.error(TAG, "init session error ❌", e);
      setSessionReady(false);
      setStatus("error");
      setError(e?.message || "No se pudo inicializar la sesión de recuperación.");
    } finally {
      console.log(TAG, "tryInitSession() end");
    }
  };

  // Montaje + reintentos cortos (por si el navegador demora en exponer la sesión)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      await tryInitSession();

      if (!cancelled && !sessionReady) {
        console.log(TAG, "no session yet → small retries");
        for (let i = 0; i < 4; i++) {
          await new Promise((r) => setTimeout(r, 500));
          const { data: { session } } = await supabase.auth.getSession();
          console.log(TAG, `retry #${i + 1} getSession():`, !!session);
          if (session) {
            setSessionReady(true);
            setStatus("ok");
            break;
          }
        }
      }

      if (!cancelled) setChecking(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cálculo de checks visuales
  const checks = useMemo(() => {
    const c = {
      length: rules.length(password),
      lower: rules.lower(password),
      upper: rules.upper(password),
      number: rules.number(password),
      symbol: rules.symbol(password),
      match: password.length > 0 && password === confirm,
    };
    console.log(TAG, "password checks", c);
    return c;
  }, [password, confirm]);

  const isValid =
    sessionReady &&
    checks.length &&
    checks.lower &&
    checks.upper &&
    checks.number &&
    checks.symbol &&
    checks.match;

  // Guardar nueva contraseña
  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk("");
    setError("");

    console.log(TAG, "onSave()", { sessionReady, isValid });

    if (!sessionReady) {
      setError("La sesión de recuperación no está activa. Abrí nuevamente el enlace del email.");
      return;
    }
    if (!isValid) {
      setError("Revisá los requisitos de la contraseña.");
      return;
    }

    setLoading(true);
    try {
      console.log(TAG, "updateUser({ password: *** })");
      const { data, error } = await supabase.auth.updateUser({ password });
      console.log(TAG, "updateUser result:", { data, error });
      if (error) throw error;

      setOk("Contraseña actualizada. Ya podés ingresar.");
      setTimeout(() => {
        console.log(TAG, "navigate → /owners/auth");
        navigate("/owners/auth", { replace: true });
      }, 1200);
    } catch (err: any) {
      console.error(TAG, "updateUser error ❌", err);
      setError(err?.message ?? "No se pudo actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  // Fila de requisito visual
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
              <Alert className="mb-4">
                <AlertDescription>Validando enlace…</AlertDescription>
              </Alert>
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
                      console.log(TAG, "Manual retry clicked");
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

              {/* Debug opcional (podés quitarlo) */}
              <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
{JSON.stringify({ checking, status, sessionReady, isValid }, null, 2)}
              </pre>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
