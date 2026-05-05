import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

type CoracaoEstado = { total: number; meu: boolean };

export function useCoracoes(receitaIds: string[]) {
  const [coracoes, setCoracoes] = useState<Map<string, CoracaoEstado>>(new Map());
  const { user } = useAuth();
  const userId = user?.id;

  const carregarCorações = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    const { data, error } = await supabase
      .from('recipe_hearts')
      .select('recipe_id, user_id')
      .in('recipe_id', ids);

    if (error || !data) return;

    const mapa = new Map<string, CoracaoEstado>();
    for (const row of data) {
      const atual = mapa.get(row.recipe_id) ?? { total: 0, meu: false };
      mapa.set(row.recipe_id, {
        total: atual.total + 1,
        meu: atual.meu || row.user_id === userId,
      });
    }
    setCoracoes(mapa);
  }, [userId]);

  const toggleCoracao = useCallback(async (recipeId: string) => {
    if (!userId) return;

    const atual = coracoes.get(recipeId) ?? { total: 0, meu: false };
    const novoMeu = !atual.meu;
    const novoTotal = novoMeu ? atual.total + 1 : Math.max(0, atual.total - 1);

    setCoracoes(prev => new Map(prev).set(recipeId, { total: novoTotal, meu: novoMeu }));

    let error: any;
    if (novoMeu) {
      const res = await supabase
        .from('recipe_hearts')
        .upsert(
          { recipe_id: recipeId, user_id: userId },
          { onConflict: 'recipe_id,user_id', ignoreDuplicates: true }
        );
      error = res.error;
    } else {
      const res = await supabase
        .from('recipe_hearts')
        .delete()
        .match({ recipe_id: recipeId, user_id: userId });
      error = res.error;
    }

    if (error) {
      console.warn('Erro ao alternar coracao da receita', error);
      setCoracoes(prev => new Map(prev).set(recipeId, atual));
    }
  }, [coracoes, userId]);

  return { coracoes, toggleCoracao, carregarCorações };
}
