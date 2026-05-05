import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Receita } from '../types';
import { uploadImagem, isLocalUri } from '../lib/uploadImagem';

const CACHE_KEY = '@receitas_v3';

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
      // Receitas próprias (criadas pelo usuário)
      const { data: proprias, error: errProprias } = await supabase
        .from('receitas')
        .select('*, ingredientes(*)')
        .eq('user_id', user.id)
        .order('criada_em', { ascending: false });

      if (errProprias) throw errProprias;

      // Overrides do usuário (receitas salvas de outros)
      const { data: overrides, error: errOverrides } = await supabase
        .from('recipe_overrides')
        .select(`
          *,
          receita:recipe_id (
            *,
            ingredientes (*)
          )
        `)
        .eq('user_id', user.id)
        .order('criado_em', { ascending: false });

      if (errOverrides) throw errOverrides;

      // Mapear receitas próprias
      const mapeadasProprias: Receita[] = (proprias ?? []).map((r) => ({
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
        fonte_receita_id: undefined,
        fonte_atualizada_em: undefined,
      }));

      // Mesclar overrides com originais
      const mapeadasSalvas: Receita[] = (overrides ?? []).map((o) => {
        const original = o.receita;
        const ingOverride = o.ingredientes as any[] | null;
        return {
          id: original.id,
          user_id: original.user_id,
          nome: o.nome ?? original.nome,
          categorias: o.categorias ?? (Array.isArray(original.categorias) ? original.categorias : [original.categoria ?? 'Carnes']),
          imagem: o.imagem ?? original.imagem,
          tempoPreparo: o.tempo_preparo ?? original.tempo_preparo,
          porcoes: o.porcoes ?? original.porcoes,
          dificuldade: o.dificuldade ?? original.dificuldade,
          ingredientes: (ingOverride ?? original.ingredientes ?? []).map((i: any) => ({
            id: i.id,
            nome: i.nome,
            quantidade: typeof i.quantidade === 'string' ? parseFloat(i.quantidade) : i.quantidade,
            unidade: i.unidade,
          })),
          instrucoes: (o.instrucoes ?? original.instrucoes ?? []).map((inst: any) =>
            typeof inst === 'string' ? { texto: inst } : inst
          ),
          publica: original.publica,
          criadaEm: o.criado_em,
          atualizadaEm: o.atualizado_em,
          fonte_receita_id: original.id,
          fonte_atualizada_em: o.fonte_atualizada_em ?? original.atualizada_em,
        };
      });

      const todasReceitas = [...mapeadasProprias, ...mapeadasSalvas];
      setReceitas(todasReceitas);
      await setCache(todasReceitas);
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
      const id = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
      const nova: Receita = {
        ...dados,
        id,
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
      const receita = receitas.find((r) => r.id === id);
      setReceitas((prev) => {
        const lista = prev.filter((r) => r.id !== id);
        setCache(lista);
        return lista;
      });

      if (!user) return;

      if (receita?.fonte_receita_id) {
        await supabase
          .from('recipe_overrides')
          .delete()
          .match({ user_id: user.id, recipe_id: id });
      } else {
        await supabase.from('receitas').delete().eq('id', id).eq('user_id', user.id);
      }
    },
    [user, receitas]
  );

  const editar = useCallback(
    async (id: string, dados: Partial<Receita>) => {
      const agora = new Date().toISOString();
      const lista = receitas.map((r) =>
        r.id === id ? { ...r, ...dados, atualizadaEm: agora } : r
      );
      setReceitas(lista);
      await setCache(lista);

      if (!user) return;

      const receita = receitas.find((r) => r.id === id);
      if (receita?.fonte_receita_id) {
        await supabase.from('recipe_overrides').upsert(
          {
            user_id: user.id,
            recipe_id: id,
            nome: dados.nome,
            categorias: dados.categorias,
            imagem: dados.imagem,
            tempo_preparo: dados.tempoPreparo,
            porcoes: dados.porcoes,
            dificuldade: dados.dificuldade,
            ingredientes: dados.ingredientes
              ? dados.ingredientes.map((i) => ({
                  nome: i.nome,
                  quantidade: String(i.quantidade),
                  unidade: i.unidade,
                }))
              : undefined,
            instrucoes: dados.instrucoes,
            atualizado_em: agora,
          },
          { onConflict: 'user_id,recipe_id' }
        );
      } else {
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
