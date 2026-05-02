// src/components/RatingSystem.tsx
"use client";

import { useState } from "react";
import { saveRating } from "@/app/actions";

interface RatingSystemProps {
  isLoggedIn: boolean;
  animeSlug: string;
  themeSlug: string;
  initialScore?: number | null;
}

export default function RatingSystem({ isLoggedIn, animeSlug, themeSlug, initialScore }: RatingSystemProps) {
  const [userScore, setUserScore] = useState<number | null>(initialScore ?? null);

  const handleRating = async (score: number) => {
    if (!isLoggedIn) {
      alert("Você precisa estar logado para avaliar!");
      return;
    }

    const formData = new FormData();
    formData.set('animeSlug', animeSlug);
    formData.set('themeSlug', themeSlug);
    formData.set('score', String(score));

    try {
      await saveRating(formData);
      setUserScore(score);
    } catch (err) {
      console.error("Erro ao salvar avaliação:", err);
    }
  };

  if (!isLoggedIn) {
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
