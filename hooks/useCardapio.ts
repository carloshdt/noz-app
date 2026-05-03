import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plano, PlanoReceita, DiaPorcao, ItemCompra, Receita } from '../types';
import { useAuth } from './useAuth';

const planoVazio = (): Plano => ({ periodo: 'semanal', receitas: [] });

function migrarFormatoAntigo(dados: any): Plano | null {
  if (!Array.isArray(dados)) return null;
  const mapa = new Map<string, DiaPorcao[]>();
  for (const d of dados) {
    if (d.receitaId) {
      const dias = mapa.get(d.receitaId) ?? [];
      dias.push({ dia: d.diaSemana, porcoes: 1 });
      mapa.set(d.receitaId, dias);
    }
  }
  const receitas: PlanoReceita[] = Array.from(mapa.entries()).map(([receitaId, dias]) => ({
    receitaId, batches: 1, dias,
  }));
  return { periodo: 'semanal', receitas };
}

export function useCardapio() {
  const { user } = useAuth();
  const STORAGE_KEY = `@plano_${user?.id ?? 'anon'}`;
  const [plano, setPlano] = useState<Plano>(planoVazio());

  const recarregar = useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (!json) { setPlano(planoVazio()); return; }
      const dados = JSON.parse(json);
      const migrado = migrarFormatoAntigo(dados);
      if (migrado) {
        setPlano(migrado);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migrado));
      } else {
        setPlano(dados as Plano);
      }
    });
  }, [STORAGE_KEY]);

  useEffect(() => {
    setPlano(planoVazio());
    recarregar();
  }, [STORAGE_KEY]);

  const adicionarReceita = useCallback((receitaId: string, batches: number, dias?: DiaPorcao[]) => {
    setPlano((prev) => {
      const existe = prev.receitas.find((r) => r.receitaId === receitaId);
      const receitas = existe
        ? prev.receitas.map((r) => r.receitaId === receitaId ? { ...r, batches, dias } : r)
        : [...prev.receitas, { receitaId, batches, dias }];
      const novo = { ...prev, receitas };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      return novo;
    });
  }, [STORAGE_KEY]);

  const atribuirDias = useCallback((receitaId: string, dias: DiaPorcao[]) => {
    setPlano((prev) => {
      const receitas = prev.receitas.map((r) =>
        r.receitaId === receitaId ? { ...r, dias } : r
      );
      const novo = { ...prev, receitas };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      return novo;
    });
  }, [STORAGE_KEY]);

  const removerReceita = useCallback((receitaId: string) => {
    setPlano((prev) => {
      const novo = { ...prev, receitas: prev.receitas.filter((r) => r.receitaId !== receitaId) };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      return novo;
    });
  }, [STORAGE_KEY]);

  const limpar = useCallback(() => {
    setPlano((prev) => {
      const novo = { ...prev, receitas: [] };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(novo));
      return novo;
    });
  }, [STORAGE_KEY]);

  const gerarListaCompras = useCallback((todasReceitas: Receita[]): ItemCompra[] => {
    const mapa = new Map<string, ItemCompra>();
    plano.receitas.forEach(({ receitaId, batches }) => {
      const receita = todasReceitas.find((r) => r.id === receitaId);
      if (!receita) return;
      receita.ingredientes.forEach(({ nome, quantidade, unidade }) => {
        const qtd = quantidade * batches;
        const chave = `${nome.toLowerCase()}|${unidade}`;
        if (mapa.has(chave)) {
          const item = mapa.get(chave)!;
          item.quantidade += qtd;
          if (!item.receitas.includes(receita.nome)) item.receitas.push(receita.nome);
        } else {
          mapa.set(chave, { nome, quantidade: qtd, unidade, receitas: [receita.nome] });
        }
      });
    });
    return Array.from(mapa.values());
  }, [plano]);

  return { plano, adicionarReceita, atribuirDias, removerReceita, limpar, gerarListaCompras, recarregar };
}
