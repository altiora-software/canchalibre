import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

/* =====================
   Modal: solo datos del propietario
   ===================== */
type OwnerSetupModalProps = {
  open: boolean;
  onClose: () => void;
  defaultEmail: string;
  defaultName?: string;
  onConfirm: (payload: { ownerName: string; ownerPhone: string }) => Promise<void>;
  loading?: boolean;
};

const OwnerSetupModal = ({
  open,
  onClose,
  defaultEmail,
  defaultName,
  onConfirm,
  loading,
}: OwnerSetupModalProps) => {
  const [ownerName, setOwnerName] = useState(defaultName || "");
  const [ownerPhone, setOwnerPhone] = useState("");

  useEffect(() => {
    setOwnerName(defaultName || "");
  }, [defaultName]);

  const disabled = !ownerName.trim() || !ownerPhone.trim();

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configurar tu cuenta de Propietario</DialogTitle>
          <DialogDescription>
            Completá tus datos para activar el perfil de propietario. Podrás cargar tu complejo después desde el
            Dashboard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid gap-3">
            <Label className="text-sm text-muted-foreground">Tu email</Label>
            <Input value={defaultEmail} disabled />
          </div>

          <div className="grid gap-3">
            <Label>Nombre y Apellido (Propietario)</Label>
            <Input
              placeholder="Ej: Juan Pérez"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
            />
          </div>

          <div className="grid gap-3">
            <Label>Teléfono del propietario</Label>
            <Input
              placeholder="Ej: 3884123456"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={!!loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ ownerName, ownerPhone })}
            disabled={disabled || !!loading}
          >
            {loading ? "Guardando…" : "Guardar y continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* =====================
   Página OwnersAuth
   ===================== */
const OwnersAuth = () => {
  const [socialLoading, setSocialLoading] = useState<"google" | "facebook" | null>(null);
  const [error, setError] = useState("");
  const [showSetup, setShowSetup] = useState(false);
  const [setupLoading, setSetupLoading] = useState(false);

  // datos del usuario logueado (para modal)
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingName, setPendingName] = useState("");

  const navigate = useNavigate();
  const { toast } = useToast();

  const ensureProfileRoleOnce = async (role: "user" | "owner") => {
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
  
  /**
   * Verifica el perfil actual:
   * - Si role !== 'owner' o faltan full_name / phone -> abrir modal
   * - Si ya es owner y tiene todo -> ir a /dashboard
   * NO cambia el rol desde el cliente.
   */
  
  
  const ensureOwnerAndMaybeSetup = async (sessionUser: {
    id: string;
    email?: string | null;
    user_metadata?: any;
  }) => {
    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("user_id, role, full_name, phone, email")
      .eq("user_id", sessionUser.id)
      .maybeSingle();

    if (pErr) {
      // si algo falla, mostramos modal para completar datos y que la función haga el resto
      setPendingEmail(sessionUser.email || "");
      const name =
        sessionUser.user_metadata?.full_name ||
        sessionUser.user_metadata?.name ||
        "";
      setPendingName(name);
      setShowSetup(true);
      return;
    }

    const fullName =
      profile?.full_name ||
      sessionUser.user_metadata?.full_name ||
      sessionUser.user_metadata?.name ||
      "";

    const needsModal =
      !profile ||
      profile.role !== "owner" ||
      !fullName ||
      !profile.phone;

    if (needsModal) {
      setPendingEmail(profile?.email || sessionUser.email || "");
      setPendingName(fullName || "");
      setShowSetup(true);
      return;
    }

    navigate("/dashboard");
  };

  // on mount y en sign-in
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          await ensureProfileRoleOnce("owner");
          await ensureOwnerAndMaybeSetup(session.user);
        } catch (e: any) {
          console.error("ensureOwner:", e?.message || e);
          toast({
            title: "No se pudo validar el perfil de propietario",
            description: "Intenta nuevamente.",
            variant: "destructive",
          });
        }
      }
    };
    init();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          try {
            await ensureOwnerAndMaybeSetup(session.user);
          } catch (e: any) {
            console.error("ensureOwner:", e?.message || e);
            toast({
              title: "No se pudo validar el perfil de propietario",
              description: "Intenta nuevamente.",
              variant: "destructive",
            });
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

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
          redirectTo: `${baseUrl}/owners/auth`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });

      if (error) throw error;
      // El onAuthStateChange hará el resto
    } catch (err: any) {
      setError(err.message);
      setSocialLoading(null);
    }
  };

  /* =====================
     Guardar modal: llama a la Edge Function para promover a owner
     ===================== */
     const handleConfirmSetup = async (payload: { ownerName: string; ownerPhone: string }) => {
      setSetupLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Sesión no disponible");
    
        const uid = session.user.id;
    
        // Actualizamos el perfil directamente
        const { error: updateErr } = await supabase
          .from("profiles")
          .update({
            full_name: payload.ownerName,
            phone: payload.ownerPhone.replace(/\D/g, ""),
            role: "owner", // promovemos directamente
          })
          .eq("user_id", uid);
    
        if (updateErr) throw updateErr;
    
        toast({
          title: "¡Listo!",
          description: "Tu cuenta de propietario quedó configurada.",
        });
        setShowSetup(false);
        navigate("/dashboard");
      } catch (e: any) {
        console.error("owner-update:", e?.message || e);
        toast({
          title: "No se pudo guardar la configuración",
          description: e?.message || "Intenta nuevamente.",
          variant: "destructive",
        });
      } finally {
        setSetupLoading(false);
      }
    };
    

  return (
    <>
      <Helmet>
        <title>Portal Propietarios - Cancha Libre</title>
        <meta
          name="description"
          content="Acceso exclusivo para propietarios de complejos deportivos. Gestiona tu negocio con Cancha Libre."
        />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-secondary/5 via-background to-primary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-sport rounded-lg flex items-center justify-center shadow-lg">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-foreground">Cancha Libre</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Portal de Propietarios</h1>
            <p className="text-muted-foreground text-lg">Gestiona tu complejo deportivo</p>
            <p className="text-sm text-muted-foreground mt-2">Acceso exclusivo para dueños de complejos</p>
          </div>

          <Card className="shadow-card-custom border-0">
            <CardHeader className="pb-6 text-center">
              <CardTitle className="text-2xl text-foreground">¡Bienvenido Propietario!</CardTitle>
              <CardDescription className="text-base">
                Ingresa con tu cuenta para acceder al panel de gestión
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className="mb-6 border-destructive/20 bg-destructive/5">
                  <AlertDescription className="text-destructive">{error}</AlertDescription>
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
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
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

              <div className="mt-8 p-4 bg-secondary/20 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">🏢 Portal Exclusivo</h3>
                <p className="text-sm text-muted-foreground">
                  Este es el acceso especial para propietarios. Primero completás tus datos; el complejo lo podrás crear
                  luego en el Dashboard.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal inicial solo para datos del propietario */}
      <OwnerSetupModal
        open={showSetup}
        onClose={() => setShowSetup(false)}
        defaultEmail={pendingEmail}
        defaultName={pendingName}
        onConfirm={handleConfirmSetup}
        loading={setupLoading}
      />
    </>
  );
};

export default OwnersAuth;
