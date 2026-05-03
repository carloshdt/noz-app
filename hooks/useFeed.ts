import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { ReceitaFeed } from '../types';

const PAGE_SIZE = 10;

function calcularScore(criadaEm: string, totalImportacoes: number): number {
  const dias = (Date.now() - new Date(criadaEm).getTime()) / (1000 * 60 * 60 * 24);
  return 1 / (dias + 1) + totalImportacoes * 0.1;
}

export function useFeed() {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<ReceitaFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [temMais, setTemMais] = useState(true);

  const carregar = useCallback(
    async (reset: boolean) => {
      if (!user || loading) return;
      setLoading(true);

      const offset = reset ? 0 : cursor;

      const { data, error } = await supabase
        .from('receitas')
        .select(
          'id, nome, categorias, imagem, tempo_preparo, porcoes, dificuldade, criada_em, user_id, profiles!inner(id, nome, foto_url, total_importacoes)'
        )
        .eq('publica', true)
        .neq('user_id', user.id)
        .order('criada_em', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (!error && data) {
        const mapeadas: ReceitaFeed[] = (data as any[])
          .map((r) => ({
            id: r.id,
            user_id: r.user_id,
            nome: r.nome,
            categorias: Array.isArray(r.categorias) ? r.categorias : [],
            imagem: r.imagem ?? undefined,
            tempoPreparo: r.tempo_preparo,
            porcoes: r.porcoes,
            dificuldade: r.dificuldade,
            criadaEm: r.criada_em,
            criador: {
              id: r.profiles.id,
              nome: r.profiles.nome,
              foto_url: r.profiles.foto_url ?? undefined,
              total_importacoes: r.profiles.total_importacoes ?? 0,
            },
          }))
          .sort(
            (a, b) =>
              calcularScore(b.criadaEm, b.criador.total_importacoes) -
              calcularScore(a.criadaEm, a.criador.total_importacoes)
          );

        if (reset) {
          setReceitas(mapeadas);
        } else {
          setReceitas((prev) => [...prev, ...mapeadas]);
        }
        setCursor(offset + data.length);
        setTemMais(data.length === PAGE_SIZE);
      }

      setLoading(false);
    },
    [user, cursor, loading]
  );

  const recarregar = useCallback(() => carregar(true), [carregar]);
  const carregarMais = useCallback(() => carregar(false), [carregar]);

  return { receitas, loading, temMais, recarregar, carregarMais };
}
