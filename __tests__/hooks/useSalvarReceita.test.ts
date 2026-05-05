import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSalvarReceita } from '../../hooks/useSalvarReceita';
import { supabase } from '../../lib/supabase';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../lib/supabase');
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const receitaOriginalRaw = {
  id: 'rec-original',
  nome: 'Macarrão ao Sugo',
  categorias: ['Massas'],
  imagem: null,
  tempo_preparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  instrucoes: [{ texto: 'Cozinhar o macarrão' }],
  atualizada_em: '2026-05-01T00:00:00Z',
  ingredientes: [{ nome: 'Macarrão', quantidade: '200', unidade: 'g' }],
};

function setupSalvarMock(fetchData: any, insertError: any = null) {
  const fetchChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: fetchData, error: null }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  const insertChain = {
    insert: jest.fn().mockResolvedValue({ data: null, error: insertError }),
  };
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'ingredientes') return insertChain;
    return fetchChain;
  });
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });
  return { fetchChain, insertChain };
}

describe('useSalvarReceita', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('começa com salvando false', () => {
    const { result } = renderHook(() => useSalvarReceita());
    expect(result.current.salvando).toBe(false);
  });

  it('salvar retorna id da cópia ao salvar com sucesso', async () => {
    const { fetchChain } = setupSalvarMock(receitaOriginalRaw);
    fetchChain.insert = jest.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    let copyId: string | null = null;
    await act(async () => {
      copyId = await result.current.salvar('rec-original', 'user-2');
    });

    expect(copyId).toEqual(expect.any(String));
    expect(supabase.from).toHaveBeenCalledWith('receitas');
  });

  it('salvar copia ingredientes da receita original', async () => {
    const insertIngMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: receitaOriginalRaw, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: insertIngMock };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    await act(async () => { await result.current.salvar('rec-original', 'user-2'); });

    expect(insertIngMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ nome: 'Macarrão' })])
    );
  });

  it('salvar chama rpc incrementar_importacoes ao salvar com sucesso', async () => {
    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: receitaOriginalRaw, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    await act(async () => { await result.current.salvar('rec-original', 'user-2'); });

    expect(supabase.rpc).toHaveBeenCalledWith('incrementar_importacoes', { perfil_id: 'user-2' });
  });

  it('salvar retorna null se fetch da original falhar', async () => {
    const errorChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };
    (supabase.from as jest.Mock).mockReturnValue(errorChain);

    const { result } = renderHook(() => useSalvarReceita());
    let copyId: string | null = 'antes';
    await act(async () => { copyId = await result.current.salvar('rec-inexistente', 'user-2'); });
    expect(copyId).toBeNull();
  });

  it('salvar guarda a copia no cache local com ingredientes', async () => {
    setupSalvarMock(receitaOriginalRaw);

    const { result } = renderHook(() => useSalvarReceita());
    await act(async () => { await result.current.salvar('rec-original', 'user-2'); });

    const json = await AsyncStorage.getItem('@receitas_v2');
    const cache = JSON.parse(json ?? '[]');
    expect(cache).toHaveLength(1);
    expect(cache[0]).toEqual(expect.objectContaining({
      nome: 'Macarrão ao Sugo',
      fonte_receita_id: 'rec-original',
    }));
    expect(cache[0].ingredientes).toEqual(
      expect.arrayContaining([expect.objectContaining({ nome: 'Macarrão', quantidade: 200 })])
    );
  });

  it('salvar retorna null se insert da receita falhar', async () => {
    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: receitaOriginalRaw, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } }),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    let copyId: string | null = 'antes';
    await act(async () => { copyId = await result.current.salvar('rec-original', 'user-2'); });
    expect(copyId).toBeNull();
  });

  it('salvando é true durante operação e false ao terminar', async () => {
    let resolveFetch: (v: any) => void;
    const fetchPromise = new Promise<any>((resolve) => { resolveFetch = resolve; });
    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue(fetchPromise),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    expect(result.current.salvando).toBe(false);

    let salvarPromise: Promise<string | null>;
    act(() => { salvarPromise = result.current.salvar('rec-original', 'user-2'); });

    await act(async () => {
      resolveFetch!({ data: receitaOriginalRaw, error: null });
      await salvarPromise!;
    });

    expect(result.current.salvando).toBe(false);
  });
});
