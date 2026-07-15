'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface JwtUser {
  id: string;
  email: string;
  nombre: string;
  role: string;
}

interface AuthContextValue {
  user: JwtUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

function parseJwt(token: string): JwtUser | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as {
      sub: string;
      email: string;
      nombre: string;
      role: string;
    };
    return { id: payload.sub, email: payload.email, nombre: payload.nombre, role: payload.role };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<JwtUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaurar desde sessionStorage al montar (no localStorage — D2)
  useEffect(() => {
    const stored = sessionStorage.getItem('jwt');
    if (stored) {
      const parsed = parseJwt(stored);
      if (parsed) {
        setToken(stored);
        setUser(parsed);
      } else {
        sessionStorage.removeItem('jwt');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string) => {
    const parsed = parseJwt(newToken);
    if (!parsed) return;
    sessionStorage.setItem('jwt', newToken);
    setToken(newToken);
    setUser(parsed);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('jwt');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
