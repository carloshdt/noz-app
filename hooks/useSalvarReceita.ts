import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useSalvarReceita() {
  const { user } = useAuth();
  const [salvando, setSalvando] = useState(false);

  const salvar = useCallback(
    async (receitaId: string, criadorId: string): Promise<boolean> => {
      if (!user) return false;
      setSalvando(true);

      const { data: original, error: fetchError } = await supabase
        .from('receitas')
        .select('*, ingredientes(*)')
        .eq('id', receitaId)
        .single();

      if (fetchError || !original) {
        setSalvando(false);
        return false;
      }

      const agora = new Date().toISOString();
      const novoId = gerarId();

      const { error: insertError } = await supabase.from('receitas').insert({
        id: novoId,
        user_id: user.id,
        nome: original.nome,
        categorias: original.categorias,
        imagem: original.imagem,
        tempo_preparo: original.tempo_preparo,
        porcoes: original.porcoes,
        dificuldade: original.dificuldade,
        instrucoes: original.instrucoes ?? [],
        publica: true,
        fonte_receita_id: receitaId,
        fonte_atualizada_em: original.atualizada_em,
        criada_em: agora,
        atualizada_em: agora,
      });

      if (!insertError && original.ingredientes?.length > 0) {
        await supabase.from('ingredientes').insert(
          original.ingredientes.map((i: any) => ({
            receita_id: novoId,
            nome: i.nome,
            quantidade: i.quantidade,
            unidade: i.unidade,
          }))
        );
      }

      if (!insertError) {
        await supabase.rpc('incrementar_importacoes', { perfil_id: criadorId });
      }

      setSalvando(false);
      return !insertError;
    },
    [user]
  );

  return { salvar, salvando };
}
