import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './useAuth';

export type ItemMercadoAvulso = {
  id: string;
  nome: string;
};

type MercadoData = {
  itens: ItemMercadoAvulso[];
  historico: string[];
};

const vazio = (): MercadoData => ({ itens: [], historico: [] });

function gerarId(): string {
  return `mercado-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function limparNome(nome: string): string {
  return nome.trim().replace(/\s+/g, ' ');
}

function chaveNome(nome: string): string {
  return limparNome(nome).toLowerCase();
}

function aplicarNomeNoHistorico(historico: string[], nome: string): string[] {
  const limpo = limparNome(nome);
  const chave = chaveNome(limpo);
  return [limpo, ...historico.filter((item) => chaveNome(item) !== chave)].slice(0, 60);
}

export function useMercado() {
  const { user } = useAuth();
  const STORAGE_KEY = `@mercado_${user?.id ?? 'anon'}`;
  const [data, setData] = useState<MercadoData>(vazio());

  const salvar = useCallback(async (proximo: MercadoData) => {
    setData(proximo);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(proximo));
  }, [STORAGE_KEY]);

  const recarregarMercado = useCallback(async () => {
    const json = await AsyncStorage.getItem(STORAGE_KEY);
    if (!json) {
      const inicial = vazio();
      setData(inicial);
      return inicial;
    }

    try {
      const parsed = JSON.parse(json);
      const proximo: MercadoData = {
        itens: Array.isArray(parsed.itens) ? parsed.itens : [],
        historico: Array.isArray(parsed.historico) ? parsed.historico : [],
      };
      setData(proximo);
      return proximo;
    } catch {
      const inicial = vazio();
      setData(inicial);
      return inicial;
    }
  }, [STORAGE_KEY]);

  useEffect(() => {
    recarregarMercado();
  }, [recarregarMercado]);

  const adicionarItem = useCallback(async (nome: string) => {
    const limpo = limparNome(nome);
    if (!limpo) return;

    const chave = chaveNome(limpo);
    const jaExiste = data.itens.some((item) => chaveNome(item.nome) === chave);
    const proximo: MercadoData = {
      itens: jaExiste ? data.itens : [...data.itens, { id: gerarId(), nome: limpo }],
      historico: aplicarNomeNoHistorico(data.historico, limpo),
    };
    await salvar(proximo);
  }, [data, salvar]);

  const removerItem = useCallback(async (id: string) => {
    await salvar({ ...data, itens: data.itens.filter((item) => item.id !== id) });
  }, [data, salvar]);

  const sugestoes = useCallback((termo: string, ingredientes: string[] = []) => {
    const busca = chaveNome(termo);
    if (!busca) return [];

    const nomes = [...data.historico, ...ingredientes];
    const vistos = new Set<string>();
    return nomes
      .map(limparNome)
      .filter(Boolean)
      .filter((nome) => {
        const chave = chaveNome(nome);
        if (vistos.has(chave)) return false;
        vistos.add(chave);
        return chave.startsWith(busca);
      })
      .slice(0, 6);
  }, [data.historico]);

  return useMemo(() => ({
    itens: data.itens,
    historico: data.historico,
    adicionarItem,
    removerItem,
    sugestoes,
    recarregarMercado,
  }), [data.itens, data.historico, adicionarItem, removerItem, sugestoes, recarregarMercado]);
}

