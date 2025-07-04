// src/components/RatingSystem.tsx
"use client";

// MODIFICAÇÃO: Importa createBrowserClient do @supabase/ssr
import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

interface RatingSystemProps {
  session: Session | null;
  animeSlug: string;
  themeSlug: string;
}

export default function RatingSystem({ session, animeSlug, themeSlug }: RatingSystemProps) {
  // MODIFICAÇÃO: Instancia o cliente com createBrowserClient
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [userScore, setUserScore] = useState<number | null>(null);

  const handleRating = async (score: number) => {
    if (!session) {
      alert("Você precisa estar logado para avaliar!");
      return;
    }

    const { error } = await supabase.from("ratings").upsert({
      user_id: session.user.id,
      anime_slug: animeSlug,
      theme_slug: themeSlug,
      score: score,
    });

    if (error) {
      console.error("Erro ao salvar avaliação:", error);
    } else {
      setUserScore(score);
    }
  };
  
  useEffect(() => {
    // ... lógica para buscar a nota inicial ...
  }, [session]);


  if (!session) {
    return <p className="text-xs text-gray-500">Faça login para avaliar.</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white mt-2">Sua Avaliação:</h4>
      <input 
        type="number" 
        min="0" max="10" step="0.5" 
        className="bg-gray-700 text-white p-1 rounded"
        defaultValue={userScore ?? ""}
        onBlur={(e) => handleRating(parseFloat(e.target.value))}
      />
    </div>
  );
}