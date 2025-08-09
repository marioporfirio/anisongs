// src/hooks/useSupabase.ts
import { createBrowserClient } from "@supabase/ssr";
import { useState, useEffect } from "react";
import type { Session } from "@supabase/supabase-js";

export function useSupabase() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };
    getSession();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    
    return () => subscription.unsubscribe();
  }, [supabase]);
  
  return { supabase, session, loading };
}