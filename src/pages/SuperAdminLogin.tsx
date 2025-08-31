import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";
import { Shield, Lock } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login, isAuthenticated } = useSuperAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/admin");
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
  
    try {
      // 1) Validación hardcodeada
      const success = await login(email, password);
      if (!success) {
        setError("Credenciales de Super Administrador inválidas");
        setLoading(false);
        return;
      }
  
      // 2) Autenticación real en Supabase (el usuario debe existir en Auth)
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authErr) throw authErr;
  
      // 3) Promocionar a admin (crea/actualiza profile y pone is_admin=true)
      const { error: rpcErr } = await  (supabase.rpc as any)("promote_current_user_to_admin");
      if (rpcErr) throw rpcErr;
  
      toast({
        title: "¡Acceso concedido!",
        description: "Bienvenido al panel de Super Administrador",
      });
      navigate("/admin");
    } catch (err: any) {
      setError(err.message || "Error interno del sistema");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Super Admin - Cancha Libre</title>
        <meta name="description" content="Panel de acceso exclusivo para Super Administradores" />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/10 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-destructive to-destructive/80 rounded-lg flex items-center justify-center shadow-lg">
                <Shield className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Super Admin</h1>
            <p className="text-muted-foreground">
              Acceso restringido - Solo personal autorizado
            </p>
          </div>

          <Card className="shadow-card-custom border-0 border-l-4 border-l-destructive">
            <CardHeader className="pb-6">
              <CardTitle className="text-center text-foreground flex items-center justify-center gap-2">
                <Lock className="w-5 h-5" />
                Autenticación Segura
              </CardTitle>
              <CardDescription className="text-center">
                Ingresa las credenciales de Super Administrador
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

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Super Admin</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="superadmin@canchajujuy.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña Master</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-destructive hover:bg-destructive/90" 
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Acceder al Panel"}
                </Button>
              </form>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  Este panel está protegido por credenciales hardcodeadas para máxima seguridad
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SuperAdminLogin;