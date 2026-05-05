import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Receita } from '../types';

const CACHE_KEY = '@receitas_v3';

async function adicionarAoCache(receita: Receita) {
  const json = await AsyncStorage.getItem(CACHE_KEY);
  const atuais: Receita[] = json ? JSON.parse(json) : [];
  const semDuplicada = atuais.filter((r) => r.id !== receita.id);
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify([receita, ...semDuplicada]));
}

export function useSalvarReceita() {
  const { user } = useAuth();
  const [salvando, setSalvando] = useState(false);

  const salvar = useCallback(
    async (receitaId: string, criadorId: string): Promise<string | null> => {
      if (!user) return null;
      setSalvando(true);

      const { data: original, error: fetchError } = await supabase
        .from('receitas')
        .select('*, ingredientes(*)')
        .eq('id', receitaId)
        .single();

      if (fetchError || !original) {
        setSalvando(false);
        return null;
      }

      const agora = new Date().toISOString();

      const { error: overrideError } = await supabase
        .from('recipe_overrides')
        .insert({
          user_id: user.id,
          recipe_id: receitaId,
          fonte_atualizada_em: original.atualizada_em,
          criado_em: agora,
          atualizado_em: agora,
        });

      if (overrideError) {
        setSalvando(false);
        return null;
      }

      await adicionarAoCache({
        id: original.id,
        user_id: original.user_id,
        nome: original.nome,
        categorias: Array.isArray(original.categorias) ? original.categorias : [original.categoria ?? 'Carnes'],
        imagem: original.imagem,
        tempoPreparo: original.tempo_preparo,
        porcoes: original.porcoes,
        dificuldade: original.dificuldade,
        ingredientes: (original.ingredientes ?? []).map((i: any) => ({
          id: i.id,
          nome: i.nome,
          quantidade: parseFloat(i.quantidade),
          unidade: i.unidade,
        })),
        instrucoes: (original.instrucoes ?? []).map((inst: any) =>
          typeof inst === 'string' ? { texto: inst } : inst
        ),
        publica: original.publica,
        criadaEm: agora,
        atualizadaEm: agora,
        fonte_receita_id: original.id,
        fonte_atualizada_em: original.atualizada_em,
      });

      await supabase.rpc('incrementar_importacoes', { perfil_id: criadorId });

      setSalvando(false);
      return original.id;
    },
    [user]
  );

  const remover = useCallback(
    async (recipeId: string): Promise<void> => {
      if (!user) return;
      await supabase
        .from('recipe_overrides')
        .delete()
        .match({ user_id: user.id, recipe_id: recipeId });
    },
    [user]
  );

  return { salvar, remover, salvando };
}
