import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePublicar() {
  const { user } = useAuth();

  const togglePublicar = useCallback(
    async (receitaId: string, publicaAtual: boolean): Promise<boolean> => {
      if (!user) return false;

      const { error } = await supabase
        .from('receitas')
        .update({ publica: !publicaAtual, atualizada_em: new Date().toISOString() })
        .eq('id', receitaId)
        .eq('user_id', user.id);

      return !error;
    },
    [user]
  );

  return { togglePublicar };
}
