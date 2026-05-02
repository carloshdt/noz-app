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
  categorias: ['Carnes'],
  tempoPreparo: 20,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [
    { nome: 'Frango', quantidade: 500, unidade: 'g' },
    { nome: 'Ovo', quantidade: 2, unidade: 'un' },
  ],
  instrucoes: [{ texto: 'Grelhar' }],
  criadaEm: '2026-01-01',
};

describe('useCardapio', () => {
  beforeEach(() => AsyncStorage.clear());

  it('começa com plano vazio', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    expect(result.current.plano.receitas).toHaveLength(0);
  });

  it('adiciona receita com 1 batch', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.adicionarReceita('1', 1); });
    expect(result.current.plano.receitas).toHaveLength(1);
    expect(result.current.plano.receitas[0].batches).toBe(1);
  });

  it('adiciona receita com dias atribuídos', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.adicionarReceita('1', 1, [{ dia: 0, porcoes: 1 }, { dia: 2, porcoes: 2 }]); });
    expect(result.current.plano.receitas[0].dias).toEqual([{ dia: 0, porcoes: 1 }, { dia: 2, porcoes: 2 }]);
  });

  it('remove receita', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.adicionarReceita('1', 1); });
    await act(async () => { result.current.removerReceita('1'); });
    expect(result.current.plano.receitas).toHaveLength(0);
  });

  it('limpa plano', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.adicionarReceita('1', 2); });
    await act(async () => { result.current.limpar(); });
    expect(result.current.plano.receitas).toHaveLength(0);
  });

  it('gera lista sem frações usando batches', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.adicionarReceita('1', 2); });
    const lista = result.current.gerarListaCompras([receita]);
    const frango = lista.find((i) => i.nome === 'Frango');
    const ovo = lista.find((i) => i.nome === 'Ovo');
    expect(frango?.quantidade).toBe(1000);
    expect(ovo?.quantidade).toBe(4);
  });

  it('migra formato antigo CardapioDia[]', async () => {
    const antigo = [
      { diaSemana: 0, receitaId: '1', porcoes: 4 },
      { diaSemana: 2, receitaId: '1', porcoes: 4 },
      { diaSemana: 1, receitaId: null },
    ];
    await AsyncStorage.setItem('@plano_anon', JSON.stringify(antigo));
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    expect(result.current.plano.receitas).toHaveLength(1);
    expect(result.current.plano.receitas[0].dias).toEqual([{ dia: 0, porcoes: 1 }, { dia: 2, porcoes: 1 }]);
    expect(result.current.plano.receitas[0].batches).toBe(1);
  });
});
