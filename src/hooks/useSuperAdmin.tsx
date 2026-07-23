import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
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

  const refreshAuthorization = useCallback(async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    const { data: role, error: roleError } = await supabase.rpc("get_current_user_role");
    setIsAuthenticated(!roleError && role === "admin");
    setLoading(false);
  }, []);

  useEffect(() => {
    void refreshAuthorization();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void refreshAuthorization();
    });
    return () => listener.subscription.unsubscribe();
  }, [refreshAuthorization]);

  const login = async (email: string, password: string): Promise<boolean> => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;

    const { data: role, error: roleError } = await supabase.rpc("get_current_user_role");
    if (roleError || role !== "admin") {
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      return false;
    }

    setIsAuthenticated(true);
    return true;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
  };

  return <SuperAdminContext.Provider value={{ isAuthenticated, loading, login, logout }}>{children}</SuperAdminContext.Provider>;
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (!context) throw new Error("useSuperAdmin must be used within a SuperAdminProvider");
  return context;
};
