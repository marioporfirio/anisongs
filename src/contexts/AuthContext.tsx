// src/contexts/AuthContext.tsx
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useSupabase } from "@/hooks/useSupabase";

const AuthContext = createContext<ReturnType<typeof useSupabase> | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabaseData = useSupabase();
  
  return (
    <AuthContext.Provider value={supabaseData}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}