import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCardapio } from '../../hooks/useCardapio';
import { Receita } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../lib/supabase');
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

const receita: Receita = {
  id: '1',
  nome: 'Frango',
  categoria: 'Carnes',
  tempoPreparo: 20,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [
    { nome: 'Frango', quantidade: 500, unidade: 'g' },
    { nome: 'Sal', quantidade: 1, unidade: 'pitada' },
  ],
  instrucoes: ['Grelhar'],
  criadaEm: '2026-01-01',
};

describe('useCardapio', () => {
  beforeEach(() => AsyncStorage.clear());

  it('começa com 7 dias todos nulos', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    expect(result.current.cardapio).toHaveLength(7);
    expect(result.current.cardapio.every((d) => d.receitaId === null)).toBe(true);
  });

  it('atribui receita a um dia', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.atribuir(1, '1'); });
    expect(result.current.cardapio[1].receitaId).toBe('1');
  });

  it('limpa o cardápio', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.atribuir(0, '1'); });
    await act(async () => { result.current.limpar(); });
    expect(result.current.cardapio.every((d) => d.receitaId === null)).toBe(true);
  });

  it('gera lista de compras agrupando ingredientes iguais', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => {
      result.current.atribuir(0, '1');
      result.current.atribuir(1, '1');
    });
    const lista = result.current.gerarListaCompras([receita, receita]);
    const frango = lista.find((i) => i.nome === 'Frango');
    expect(frango?.quantidade).toBe(1000);
  });
});
