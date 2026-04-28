import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReceitas } from '../../hooks/useReceitas';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const receitaBase = {
  nome: 'Frango Grelhado',
  categoria: 'Carnes',
  tempoPreparo: 20,
  porcoes: 4,
  dificuldade: 'Fácil' as const,
  ingredientes: [{ nome: 'Frango', quantidade: 500, unidade: 'g' }],
  instrucoes: ['Grelhar o frango por 20 minutos'],
};

describe('useReceitas', () => {
  beforeEach(() => AsyncStorage.clear());

  it('começa com lista vazia', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    expect(result.current.receitas).toEqual([]);
  });

  it('adiciona receita e persiste', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => { result.current.adicionar(receitaBase); });
    expect(result.current.receitas).toHaveLength(1);
    expect(result.current.receitas[0].nome).toBe('Frango Grelhado');
    expect(result.current.receitas[0].id).toBeDefined();
    expect(result.current.receitas[0].criadaEm).toBeDefined();
  });

  it('remove receita por id', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => { result.current.adicionar(receitaBase); });
    const id = result.current.receitas[0].id;
    await act(async () => { result.current.remover(id); });
    expect(result.current.receitas).toHaveLength(0);
  });

  it('edita receita existente', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => { result.current.adicionar(receitaBase); });
    const id = result.current.receitas[0].id;
    await act(async () => { result.current.editar(id, { nome: 'Frango Assado' }); });
    expect(result.current.receitas[0].nome).toBe('Frango Assado');
  });

  it('busca receitas por nome', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => {
      result.current.adicionar(receitaBase);
      result.current.adicionar({ ...receitaBase, nome: 'Macarrão', categoria: 'Massas' });
    });
    const encontradas = result.current.buscar('frango');
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0].nome).toBe('Frango Grelhado');
  });
});
