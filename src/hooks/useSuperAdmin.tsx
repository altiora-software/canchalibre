import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SuperAdminContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // 🔄 Chequear sesión al montar
  useEffect(() => {
    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      console.log(data.session?.user?.app_metadata);
      if (error) {
        console.error("Error getting session", error);
      }
      if (data.session) {
        // validar que el rol del usuario sea admin
        const role = data.session.user.app_metadata?.role;
        if (role === "admin") {
          setIsAuthenticated(true);
        }
      }
      setLoading(false);
    };
    init();

    // 🔄 Suscripción a cambios de auth
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.app_metadata?.role === "admin") {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // 🔐 Login real con Supabase
  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Error al iniciar sesión:", error.message);
      return false;
    }

    if (data?.user?.app_metadata?.role === "admin") {
      setIsAuthenticated(true);
      return true;
    } else {
      // no es admin => cerramos sesión
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      return false;
    }
  };

  // 🚪 Logout real
  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  const value: SuperAdminContextType = {
    isAuthenticated,
    loading,
    login,
    logout,
  };

  return <SuperAdminContext.Provider value={value}>{children}</SuperAdminContext.Provider>;
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error("useSuperAdmin must be used within a SuperAdminProvider");
  }
  return context;
};
