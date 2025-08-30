import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Hardcoded super admin credentials
const SUPER_ADMIN_CREDENTIALS = {
  email: 'superadmin@canchajujuy.com',
  password: 'SuperAdmin2024!'
};

interface SuperAdminContextType {
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if super admin is already logged in
    const savedAuth = localStorage.getItem('superadmin_auth');
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    if (email === SUPER_ADMIN_CREDENTIALS.email && password === SUPER_ADMIN_CREDENTIALS.password) {
      setIsAuthenticated(true);
      localStorage.setItem('superadmin_auth', 'authenticated');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('superadmin_auth');
  };

  const value = {
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
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};