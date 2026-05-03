import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

function gerarId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
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
      return insertError ? null : novoId;
    },
    [user]
  );

  const remover = useCallback(
    async (copyId: string): Promise<void> => {
      if (!user) return;
      await supabase.from('receitas').delete().eq('id', copyId).eq('user_id', user.id);
    },
    [user]
  );

  return { salvar, remover, salvando };
}
