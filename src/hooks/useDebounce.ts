// src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

/**
 * Hook customizado que "atrasa" a atualização de um valor.
 * Útil para evitar chamadas de API a cada tecla digitada em uma busca.
 * @param value O valor a ser "debounceado" (ex: o texto da busca).
 * @param delay O tempo em milissegundos para esperar antes de atualizar.
 * @returns O valor "debounceado" após o delay.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // Estado para armazenar o valor "debounceado".
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Configura um temporizador que só vai atualizar o estado
    // após o 'delay' especificado.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Função de limpeza do useEffect.
    // Ela é chamada sempre que o 'value' ou 'delay' mudam,
    // limpando o temporizador anterior e evitando que ele dispare.
    return () => {
      clearTimeout(handler);
    };
  },
  // O efeito só será re-executado se o 'value' ou o 'delay' mudarem.
  [value, delay]
  );

  return debouncedValue;
}