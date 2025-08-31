import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  id: string;
  user_id: string;
  role: string | null;
  is_admin: boolean;
  full_name?: string;
  email?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Función que valida el perfil según el flujo
  const loadProfile = async (uid: string | undefined) => {
    if (!uid) {
      setProfile(null);
      return;
    }

    const { data: p } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", uid)
      .single();

    if (!p) {
      setProfile(null);
      return;
    }

    // 🔒 Lógica de acceso
    const provider = session?.user?.app_metadata?.provider;

    // Si entró con Google/Facebook → solo "customer"
    if (provider && ["google", "facebook"].includes(provider)) {
      if (p.role !== "customer") {
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setProfile(null);
        return;
      }
    }

    setProfile({
      ...p,
      is_admin: p.role === 'admin'
    } as Profile);
  };

  useEffect(() => {
    // Listener de cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    // Revisar si ya hay sesión existente
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
