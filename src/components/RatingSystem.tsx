// src/components/RatingSystem.tsx
"use client";

import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";

interface RatingSystemProps {
  session: Session | null;
  animeSlug: string;
  themeSlug: string;
}

export default function RatingSystem({ session, animeSlug, themeSlug }: RatingSystemProps) {
  const supabase = createClientComponentClient();
  const [userScore, setUserScore] = useState<number | null>(null);

  // Função para salvar/atualizar a nota
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
  
  // (Opcional) Buscar a nota que o usuário já deu para esta música
  useEffect(() => {
    // ... lógica para buscar a nota inicial ...
  }, [session]);


  if (!session) {
    return <p className="text-xs text-gray-500">Faça login para avaliar.</p>;
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-white mt-2">Sua Avaliação:</h4>
      {/* Aqui você pode criar um componente mais bonito de estrelas ou slider */}
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