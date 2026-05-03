import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Receita } from '../types';
import { uploadImagem, isLocalUri } from '../lib/uploadImagem';

const CACHE_KEY = '@receitas_v2';

function gerarId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function normalizarReceita(r: any): Receita {
  return {
    ...r,
    categorias: Array.isArray(r.categorias) ? r.categorias : [r.categoria ?? 'Carnes'],
    instrucoes: (r.instrucoes ?? []).map((inst: any) =>
      typeof inst === 'string' ? { texto: inst } : inst
    ),
  };
}

async function getCache(): Promise<Receita[]> {
  const json = await AsyncStorage.getItem(CACHE_KEY);
  const lista = json ? JSON.parse(json) : [];
  return lista.map(normalizarReceita);
}

async function setCache(receitas: Receita[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(receitas));
}

export function useReceitas() {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<Receita[]>([]);

  const carregarReceitas = useCallback(async () => {
    const cache = await getCache();
    if (cache.length > 0) setReceitas(cache);

    if (!user) return;

    try {
      const { data: receitasData, error } = await supabase
        .from('receitas')
        .select('*, ingredientes(*)')
        .eq('user_id', user.id)
        .order('criada_em', { ascending: false });

      if (error) throw error;

      const cacheMap = new Map(cache.map((r) => [r.id, r]));

      const mapeadas: Receita[] = (receitasData ?? []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        nome: r.nome,
        categorias: Array.isArray(r.categorias) ? r.categorias : [r.categoria ?? 'Carnes'],
        imagem: r.imagem,
        tempoPreparo: r.tempo_preparo,
        porcoes: r.porcoes,
        dificuldade: r.dificuldade,
        ingredientes: (r.ingredientes ?? []).map((i: any) => ({
          id: i.id,
          nome: i.nome,
          quantidade: parseFloat(i.quantidade),
          unidade: i.unidade,
        })),
        instrucoes: (r.instrucoes ?? []).map((inst: any) =>
          typeof inst === 'string' ? { texto: inst } : inst
        ),
        publica: r.publica,
        criadaEm: r.criada_em,
        atualizadaEm: r.atualizada_em,
      }));

      // Merge Supabase data with in-memory/cache ingredients to handle race condition
      // where _syncReceita hasn't finished when carregarReceitas fires
      setReceitas((current) => {
        const currentMap = new Map(current.map((r) => [r.id, r]));
        const merged = mapeadas.map((r) => {
          if (r.ingredientes.length > 0) return r;
          const localIngredientes =
            currentMap.get(r.id)?.ingredientes ?? cacheMap.get(r.id)?.ingredientes ?? [];
          if (localIngredientes.length > 0) {
            _syncReceita({ ...r, ingredientes: localIngredientes }, user.id);
            return { ...r, ingredientes: localIngredientes };
          }
          return r;
        });
        setCache(merged);
        return merged;
      });

    } catch {
      // offline: use existing cache
    }
  }, [user]);

  useEffect(() => {
    carregarReceitas();
  }, [carregarReceitas]);

  const _syncReceita = async (receita: Receita, userId: string) => {
    try {
      let imagemUrl = receita.imagem;
      if (imagemUrl && isLocalUri(imagemUrl)) {
        imagemUrl = await uploadImagem(imagemUrl, 'receitas', `${userId}/${receita.id}.jpg`);
      }

      const instrucoesSyncadas = await Promise.all(
        receita.instrucoes.map(async (inst, i) => {
          if (inst.imagem && isLocalUri(inst.imagem)) {
            const url = await uploadImagem(inst.imagem, 'receitas', `${userId}/${receita.id}_step${i}.jpg`);
            return { ...inst, imagem: url };
          }
          return inst;
        })
      );

      await supabase.from('receitas').upsert({
        id: receita.id,
        user_id: userId,
        nome: receita.nome,
        categorias: receita.categorias,
        imagem: imagemUrl,
        tempo_preparo: receita.tempoPreparo,
        porcoes: receita.porcoes,
        dificuldade: receita.dificuldade,
        instrucoes: instrucoesSyncadas,
        publica: receita.publica ?? true,
        atualizada_em: receita.atualizadaEm ?? new Date().toISOString(),
      });

      const ingredientesPayload = receita.ingredientes.map((i) => ({
        receita_id: receita.id,
        nome: i.nome,
        quantidade: String(i.quantidade),
        unidade: i.unidade,
      }));

      await supabase.from('ingredientes').delete().eq('receita_id', receita.id);
      if (ingredientesPayload.length > 0) {
        await supabase.from('ingredientes').insert(ingredientesPayload);
      }
    } catch {
      // remains pending
    }
  };

  const adicionar = useCallback(
    async (dados: Omit<Receita, 'id' | 'criadaEm'>) => {
      const agora = new Date().toISOString();
      const nova: Receita = {
        ...dados,
        id: gerarId(),
        criadaEm: agora,
        atualizadaEm: agora,
        user_id: user?.id,
      };
      const lista = [nova, ...receitas];
      setReceitas(lista);
      await setCache(lista);
      if (user) _syncReceita(nova, user.id);
    },
    [user, receitas]
  );

  const remover = useCallback(
    async (id: string) => {
      setReceitas((prev) => {
        const lista = prev.filter((r) => r.id !== id);
        setCache(lista);
        return lista;
      });

      if (user) {
        await supabase.from('receitas').delete().eq('id', id).eq('user_id', user.id);
      }
    },
    [user]
  );

  const editar = useCallback(
    async (id: string, dados: Partial<Receita>) => {
      const agora = new Date().toISOString();
      const lista = receitas.map((r) =>
        r.id === id ? { ...r, ...dados, atualizadaEm: agora } : r
      );
      setReceitas(lista);
      await setCache(lista);
      if (user) {
        const atualizada = lista.find((r) => r.id === id);
        if (atualizada) _syncReceita(atualizada, user.id);
      }
    },
    [user, receitas]
  );

  const buscar = useCallback(
    (termo: string): Receita[] => {
      const t = termo.toLowerCase();
      return receitas.filter(
        (r) => r.nome.toLowerCase().includes(t) || r.categorias.join(' ').toLowerCase().includes(t)
      );
    },
    [receitas]
  );

  return { receitas, adicionar, remover, editar, buscar, carregarReceitas };
}
