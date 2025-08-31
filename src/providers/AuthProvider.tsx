import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuthCtx = {
  user: ReturnType<typeof supabase.auth.getUser> extends Promise<infer _> ? any : any;
  ready: boolean;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ user: null, ready: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      // hidratar con la sesión persistida (Supabase usa localStorage)
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setReady(true);

      // escuchar cambios (login, logout, token refresh)
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });
      unsub = () => sub?.subscription?.unsubscribe();
    })();

    return () => { try { unsub?.(); } catch {} };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, ready, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
