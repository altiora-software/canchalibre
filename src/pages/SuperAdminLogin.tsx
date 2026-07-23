import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Lock, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useToast } from "@/hooks/use-toast";

const SuperAdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { login, isAuthenticated } = useSuperAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) navigate("/admin");
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const authorized = await login(email, password);
      if (!authorized) {
        setError("No tenes permisos de administrador o las credenciales son invalidas.");
        return;
      }
      toast({ title: "Acceso concedido", description: "Bienvenido al panel de administracion." });
      navigate("/admin");
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <Helmet><title>Super Admin - Cancha Libre</title><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div className="min-h-screen bg-gradient-to-br from-destructive/5 via-background to-destructive/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 bg-gradient-to-br from-destructive to-destructive/80 rounded-lg flex items-center justify-center shadow-lg"><Shield className="w-7 h-7 text-white" /></div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Super Admin</h1>
          <p className="text-muted-foreground">Acceso restringido al personal autorizado</p>
        </div>
        <Card className="shadow-card-custom border-0 border-l-4 border-l-destructive">
          <CardHeader className="pb-6">
            <CardTitle className="text-center flex items-center justify-center gap-2"><Lock className="w-5 h-5" />Autenticacion segura</CardTitle>
            <CardDescription className="text-center">Inicia sesion con una cuenta administradora preasignada.</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert className="mb-6 border-destructive/20 bg-destructive/5"><AlertDescription className="text-destructive">{error}</AlertDescription></Alert>}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
              <div className="space-y-2"><Label htmlFor="password">Contrasena</Label><Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></div>
              <Button type="submit" className="w-full h-11 bg-destructive hover:bg-destructive/90" disabled={submitting}>{submitting ? "Verificando..." : "Acceder al panel"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  </>;
};

export default SuperAdminLogin;
