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
  lower:  (v: string) => /[a-z]/.test(v),
  upper:  (v: string) => /[A-Z]/.test(v),
  number: (v: string) => /\d/.test(v),
  symbol: (v: string) => /[^A-Za-z0-9]/.test(v),
};

export default function OwnersReset() {
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showP1,   setShowP1]   = useState(false);
  const [showP2,   setShowP2]   = useState(false);

  const [checking,     setChecking]     = useState(true);
  const [sessionReady, setSessionReady] = useState(false);
  const [accessToken,  setAccessToken]  = useState<string | null>(null); // Fallback REST
  const [status,       setStatus]       = useState<"idle" | "ok" | "error">("idle");
  const [error,        setError]        = useState("");
  const [ok,           setOk]           = useState("");
  const [loading,      setLoading]      = useState(false);

  const navigate = useNavigate();

  // Procesa el retorno de Supabase Auth:
  // - Si hay access_token: habilita UI (y trata de crear sesión si viene refresh_token)
  // - Si hay code (PKCE): intenta exchange
  // - Si hay token&type=recovery: intenta verifyOtp
  const tryInitSession = async () => {
    setError("");
    setStatus("idle");
    console.log(TAG, "tryInitSession() start", {
      href: window.location.href,
      search: window.location.search,
      hash: window.location.hash,
    });

    try {
      // 1) Hash con access_token
      if (window.location.hash.includes("access_token")) {
        const hp = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const at = hp.get("access_token");
        const rt = hp.get("refresh_token");
        console.log(TAG, "hash tokens", { at: !!at, rt: !!rt });

        if (at) {
          // habilitar fallback REST inmediatamente
          setAccessToken(at);
          setStatus("ok");
        }

        if (at && rt) {
          // Intentá armar sesión por SDK, pero no bloquees si falla
          const { error } = await supabase.auth.setSession({ access_token: at, refresh_token: rt });
          if (error) console.warn(TAG, "setSession(hash) failed, using REST fallback", error);
        }

        // Ocultá tokens del hash
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      // 2) PKCE code
      else if (window.location.search.includes("code=")) {
        const sp = new URLSearchParams(window.location.search);
        const code = sp.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
      // 3) token&type=recovery
      else if (
        window.location.search.includes("token=") &&
        window.location.search.includes("type=recovery")
      ) {
        const sp = new URLSearchParams(window.location.search);
        const token = sp.get("token");
        if (token) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: token,
          } as any);
          if (error) console.warn(TAG, "verifyOtp(recovery) failed (will rely on REST link)", error);
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }

      // 4) ¿Quedó sesión del SDK?
      const current = await supabase.auth.getSession();
      console.log(TAG, "final getSession()", current);

      if (current.data.session) {
        setSessionReady(true);
        setStatus("ok");
        console.log(TAG, "SDK session READY ✅");
      } else if (accessToken || window.location.hash.includes("access_token")) {
        // Ya guardamos accessToken arriba → UI habilitada con REST
        setSessionReady(false);
        setStatus("ok");
        console.log(TAG, "No SDK session, but access_token present → REST fallback ✅");
      } else {
        throw new Error("El enlace no es válido o ya fue usado.");
      }
    } catch (e: any) {
      console.error(TAG, "init session error ❌", e);
      setSessionReady(false);
      setStatus("error");
      setError(e?.message || "No se pudo inicializar la sesión de recuperación.");
    } finally {
      setChecking(false); // ¡No te quedes en Validando…!
      console.log(TAG, "tryInitSession() end");
    }
  };

  // Montaje (con un par de reintentos cortos de lectura de sesión)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setChecking(true);
      await tryInitSession();

      if (!cancelled) {
        for (let i = 0; i < 3; i++) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setSessionReady(true);
            setStatus("ok");
            break;
          }
          await new Promise((r) => setTimeout(r, 300));
        }
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Checks visuales
  const checks = useMemo(() => {
    const c = {
      length: rules.length(password),
      lower:  rules.lower(password),
      upper:  rules.upper(password),
      number: rules.number(password),
      symbol: rules.symbol(password),
      match:  password.length > 0 && password === confirm,
    };
    console.log(TAG, "password checks", c);
    return c;
  }, [password, confirm]);

  // Habilita submit si hay (session SDK o access_token) y cumple reglas
  const canSubmit =
    (sessionReady || !!accessToken) &&
    checks.length && checks.lower && checks.upper && checks.number && checks.symbol && checks.match;

  // Guardar nueva contraseña
  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setOk("");
    setError("");
    console.log(TAG, "onSave()", { sessionReady, accessToken, canSubmit });

    if (!canSubmit) {
      setError("Revisá los requisitos de la contraseña.");
      return;
    }

    setLoading(true);
    try {
      if (sessionReady) {
        // Vía SDK
        console.log(TAG, "updateUser via SDK");
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
      } else if (accessToken) {
        // Fallback REST
        console.log(TAG, "update password via REST with access_token");
        const url = `${import.meta.env.VITE_SUPABASE_URL}/auth/v1/user`;
        const resp = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!,
          },
          body: JSON.stringify({ password }),
        });
        const body = await resp.text();
        console.log(TAG, "REST /auth/v1/user →", resp.status, body);
        if (!resp.ok) {
          throw new Error(`No se pudo actualizar la contraseña (REST): ${body || resp.status}`);
        }
      } else {
        throw new Error("No hay credenciales de recuperación válidas.");
      }

      setOk("Contraseña actualizada. Ya podés ingresar.");
      setTimeout(() => navigate("/owners/auth", { replace: true }), 1000);
    } catch (err: any) {
      console.error(TAG, "update password error ❌", err);
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
                    // ← ya NO bloqueamos por "checking"
                    disabled={loading || status === "error"}
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
                    disabled={loading || status === "error"} // ← igual que arriba
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
                <Row ok={rules.lower(password)}  label="Una letra minúscula" />
                <Row ok={rules.upper(password)}  label="Una letra mayúscula" />
                <Row ok={rules.number(password)} label="Un número" />
                <Row ok={rules.symbol(password)} label="Un símbolo" />
                <Row ok={password.length > 0 && password === confirm} label="Coincidencia en confirmación" />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="w-full"
                  // ← ya NO bloqueamos por "checking"
                  disabled={loading || !canSubmit}
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

              {/* Debug opcional */}
              <pre className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap">
{JSON.stringify({ checking, status, sessionReady, hasAccessToken: !!accessToken, canSubmit }, null, 2)}
              </pre>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
