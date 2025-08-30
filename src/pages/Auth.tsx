import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoleSelectionModal } from "@/components/RoleSelectionModal";

const Auth = () => {
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingSocialUser, setPendingSocialUser] = useState<{email: string, name: string} | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in and handle social login completion
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Check if this is a new social user without role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', session.user.id)
          .single();

        if (!profile?.role || profile.role === 'customer') {
          // Show role selection modal for new social users or users without proper role
          const userName = profile?.full_name || session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          setPendingSocialUser({
            email: session.user.email || '',
            name: userName
          });
          setShowRoleModal(true);
        } else {
          navigate("/");
        }
      }
    };

    checkUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        // Check if this is a social login and needs role selection
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', session.user.id)
          .single();

        if (!profile?.role) {
          const userName = session.user.user_metadata?.full_name || session.user.user_metadata?.name || '';
          setPendingSocialUser({
            email: session.user.email || '',
            name: userName
          });
          setShowRoleModal(true);
        } else {
          navigate("/");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    setError("");

    try {
      // Use the actual production URL
      const baseUrl = window.location.hostname === 'localhost' 
        ? window.location.origin 
        : 'https://canchalibre.lovable.app';

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${baseUrl}/auth`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });

      if (error) throw error;
      
      // Don't reset loading here - let the auth state change handle it
    } catch (error: any) {
      setError(error.message);
      setSocialLoading(null);
    }
  };


  return (
    <>
      <Helmet>
        <title>Iniciar Sesión - Canchas Jujuy</title>
        <meta name="description" content="Accede a tu cuenta en Canchas Jujuy para gestionar tu complejo deportivo o crear una nueva cuenta." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-sport rounded-lg flex items-center justify-center shadow-lg">
                <MapPin className="w-7 h-7 text-white" />
              </div>
              <span className="text-3xl font-bold text-foreground">Canchas Jujuy</span>
            </div>
            <p className="text-muted-foreground text-lg">
              Encuentra y reserva canchas deportivas
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Acceso para clientes que buscan canchas
            </p>
          </div>

          <Card className="shadow-card-custom border-0">
            <CardHeader className="pb-6 text-center">
              <CardTitle className="text-2xl text-foreground">¡Bienvenido Cliente!</CardTitle>
              <CardDescription className="text-base">
                Ingresa para explorar y reservar canchas deportivas
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

              <div className="space-y-4">
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full flex items-center gap-3 h-12 text-base font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => handleSocialLogin('google')}
                  disabled={socialLoading === 'google'}
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {socialLoading === 'google' ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Conectando...
                    </div>
                  ) : "Continuar con Google"}
                </Button>
                
                <Button 
                  type="button"
                  variant="outline" 
                  className="w-full flex items-center gap-3 h-12 text-base font-medium hover:bg-muted/50 transition-colors"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={socialLoading === 'facebook'}
                >
                  <svg className="w-6 h-6" fill="#1877F2" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {socialLoading === 'facebook' ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Conectando...
                    </div>
                  ) : "Continuar con Facebook"}
                </Button>
              </div>

              <div className="mt-8 p-4 bg-primary/10 rounded-lg">
                <h3 className="font-semibold text-foreground mb-2">🎾 Para Clientes</h3>
                <p className="text-sm text-muted-foreground">
                  Explora cientos de canchas deportivas, compara precios y horarios, 
                  y contacta directamente con los propietarios por WhatsApp.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="text-center mt-6 text-sm text-muted-foreground">
            ¿Tienes un complejo deportivo? {" "}
            <button 
              onClick={() => navigate("/owners/auth")}
              className="text-primary hover:underline font-medium"
            >
              Acceso para propietarios
            </button>
          </div>
        </div>

        {/* Role Selection Modal for Social Users */}
        {showRoleModal && pendingSocialUser && (
          <RoleSelectionModal
            isOpen={showRoleModal}
            onClose={() => {
              setShowRoleModal(false);
              setPendingSocialUser(null);
              navigate("/");
            }}
            userEmail={pendingSocialUser.email}
            userName={pendingSocialUser.name}
          />
        )}
      </div>
    </>
  );
};

export default Auth;