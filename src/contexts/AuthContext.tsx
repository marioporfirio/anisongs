"use client";

import { createContext, ReactNode } from "react";
import { useSession } from "next-auth/react";

interface AuthContextValue {
  session: ReturnType<typeof useSession>['data'];
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  return (
    <AuthContext.Provider value={{ session, loading: status === 'loading' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const { data: session, status } = useSession();
  return {
    session,
    loading: status === 'loading',
    user: session?.user ?? null,
  };
}
