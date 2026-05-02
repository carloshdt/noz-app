import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardapioDia, ItemCompra, Receita } from '../types';
import { useAuth } from './useAuth';

const diasVazios = (): CardapioDia[] =>
  Array.from({ length: 7 }, (_, i) => ({ diaSemana: i as CardapioDia['diaSemana'], receitaId: null }));

export function useCardapio() {
  const { user } = useAuth();
  const STORAGE_KEY = user ? `@cardapio_${user.id}` : '@cardapio';
  const [cardapio, setCardapio] = useState<CardapioDia[]>(diasVazios());

  const recarregar = useCallback(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) setCardapio(JSON.parse(json));
      else setCardapio(diasVazios());
    });
  }, [STORAGE_KEY]);

  useEffect(() => {
    setCardapio(diasVazios());
    recarregar();
  }, [STORAGE_KEY]);

  const salvarEAtualizar = useCallback((lista: CardapioDia[]) => {
    setCardapio(lista);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }, []);

  const atribuir = useCallback(
    (diaSemana: number, receitaId: string | null, porcoes?: number) => {
      setCardapio((prev) => {
        const lista = prev.map((d) =>
          d.diaSemana === diaSemana ? { ...d, receitaId, porcoes } : d
        );
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
        return lista;
      });
    },
    []
  );

  const limpar = useCallback(() => {
    const vazio = diasVazios();
    salvarEAtualizar(vazio);
  }, [salvarEAtualizar]);

  const gerarListaCompras = useCallback(
    (todasReceitas: Receita[]): ItemCompra[] => {
      const mapa = new Map<string, ItemCompra>();
      cardapio.forEach(({ receitaId, porcoes }) => {
        if (!receitaId) return;
        const receita = todasReceitas.find((r) => r.id === receitaId);
        if (!receita) return;
        const fator = receita.porcoes > 0 ? (porcoes ?? receita.porcoes) / receita.porcoes : 1;
        receita.ingredientes.forEach(({ nome, quantidade, unidade }) => {
          const qtdEscalada = quantidade * fator;
          const chave = `${nome.toLowerCase()}|${unidade}`;
          if (mapa.has(chave)) {
            const item = mapa.get(chave)!;
            item.quantidade += qtdEscalada;
            if (!item.receitas.includes(receita.nome)) item.receitas.push(receita.nome);
          } else {
            mapa.set(chave, { nome, quantidade: qtdEscalada, unidade, receitas: [receita.nome] });
          }
        });
      });
      return Array.from(mapa.values());
    },
    [cardapio]
  );

  return { cardapio, atribuir, limpar, gerarListaCompras, recarregar };
}
