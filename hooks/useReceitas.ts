import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receita } from '../types';

const STORAGE_KEY = '@receitas';

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useReceitas() {
  const [receitas, setReceitas] = useState<Receita[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) setReceitas(JSON.parse(json));
    });
  }, []);

  const adicionar = useCallback(
    (dados: Omit<Receita, 'id' | 'criadaEm'>) => {
      const nova: Receita = { ...dados, id: gerarId(), criadaEm: new Date().toISOString() };
      setReceitas((prev) => {
        const lista = [...prev, nova];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
        return lista;
      });
    },
    []
  );

  const remover = useCallback((id: string) => {
    setReceitas((prev) => {
      const lista = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      return lista;
    });
  }, []);

  const editar = useCallback((id: string, dados: Partial<Receita>) => {
    setReceitas((prev) => {
      const lista = prev.map((r) => (r.id === id ? { ...r, ...dados } : r));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      return lista;
    });
  }, []);

  const buscar = useCallback(
    (termo: string): Receita[] => {
      const t = termo.toLowerCase();
      return receitas.filter(
        (r) => r.nome.toLowerCase().includes(t) || r.categoria.toLowerCase().includes(t)
      );
    },
    [receitas]
  );

  return { receitas, adicionar, remover, editar, buscar };
}
