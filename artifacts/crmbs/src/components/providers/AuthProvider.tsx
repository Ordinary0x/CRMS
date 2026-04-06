import React, { createContext, useContext, useEffect, useState } from 'react';
import { setAuthTokenGetter, getMe, UserProfile } from '@workspace/api-client-react';
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

const TOKEN_KEY = "crmbs_token";

interface AuthContextType {
  dbUser: UserProfile | null;
  role: string | null;
  loading: boolean;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [dbUser, setDbUser] = useState<UserProfile | null>(null);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      setLoading(true);
    }
    if (newToken) {
      localStorage.setItem(TOKEN_KEY, newToken);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  };

  const fetchUser = async (currentToken: string) => {
    try {
      const profile = await getMe();
      setDbUser(profile);
    } catch {
      setDbUser(null);
      setToken(null);
    }
  };

  const refreshUser = async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      await fetchUser(currentToken);
    }
  };

  useEffect(() => {
    setAuthTokenGetter(() => {
      return localStorage.getItem(TOKEN_KEY);
    });
  }, []);

  useEffect(() => {
    let active = true;

    if (!token) {
      setDbUser(null);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    fetchUser(token).finally(() => {
      if (active) {
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [token]);

  const logout = () => {
    signOut(auth).finally(() => {
      setToken(null);
      setDbUser(null);
      window.location.assign("/login");
    });
  };

  return (
    <AuthContext.Provider value={{
      dbUser,
      role: dbUser?.role || null,
      loading,
      token,
      setToken,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
