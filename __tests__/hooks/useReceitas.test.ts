import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReceitas } from '../../hooks/useReceitas';
import { supabase } from '../../lib/supabase';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../lib/supabase');
let mockUser: any = null;
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: mockUser }) }));

const receitaBase = {
  nome: 'Frango Grelhado',
  categorias: ['Carnes'],
  tempoPreparo: 20,
  porcoes: 4,
  dificuldade: 'Fácil' as const,
  ingredientes: [{ nome: 'Frango', quantidade: 500, unidade: 'g' }],
  instrucoes: [{ texto: 'Grelhar o frango por 20 minutos' }],
};

describe('useReceitas', () => {
  beforeEach(() => {
    mockUser = null;
    jest.clearAllMocks();
    AsyncStorage.clear();
  });

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
    await act(async () => { result.current.adicionar(receitaBase); });
    await act(async () => { result.current.adicionar({ ...receitaBase, nome: 'Macarrão', categorias: ['Massas'] }); });
    const encontradas = result.current.buscar('frango');
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0].nome).toBe('Frango Grelhado');
  });

  it('recupera ingredientes da origem quando copia importada vem vazia', async () => {
    mockUser = { id: 'user-1' };
    const receitasChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({
        data: [{
          id: 'copy-1',
          user_id: 'user-1',
          nome: 'Macarrão importado',
          categorias: ['Massas'],
          imagem: null,
          tempo_preparo: 30,
          porcoes: 4,
          dificuldade: 'Fácil',
          ingredientes: [],
          instrucoes: [],
          publica: true,
          criada_em: '2026-05-01T00:00:00Z',
          atualizada_em: '2026-05-01T00:00:00Z',
          fonte_receita_id: 'orig-1',
          fonte_atualizada_em: '2026-05-01T00:00:00Z',
        }],
        error: null,
      }),
    };
    const ingredientesReadChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [{ id: 'ing-1', nome: 'Macarrão', quantidade: '200', unidade: 'g' }],
        error: null,
      }),
    };
    const ingredientesInsertChain = {
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    let ingredientesCalls = 0;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'receitas') return receitasChain;
      if (table === 'ingredientes') {
        ingredientesCalls += 1;
        return ingredientesCalls === 1 ? ingredientesReadChain : ingredientesInsertChain;
      }
      return {};
    });

    const { result } = renderHook(() => useReceitas());

    await waitFor(() => expect(result.current.receitas).toHaveLength(1));
    expect(result.current.receitas[0].ingredientes).toEqual([
      { id: 'ing-1', nome: 'Macarrão', quantidade: 200, unidade: 'g' },
    ]);
    expect(ingredientesInsertChain.insert).toHaveBeenCalledWith([
      { receita_id: 'copy-1', nome: 'Macarrão', quantidade: '200', unidade: 'g' },
    ]);
  });
});
