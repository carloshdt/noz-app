import { renderHook, act } from '@testing-library/react-native';
import { useCoracoes } from '../../hooks/useCoracoes';

jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
  },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as jest.Mock;

function setupMock(data: any[], error: any = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data, error }),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: null, error }),
    upsert: jest.fn().mockResolvedValue({ data: null, error }),
    match: jest.fn().mockResolvedValue({ data: null, error }),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('useCoracoes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('carrega corações em batch e monta Map', async () => {
    setupMock([
      { recipe_id: 'r1', user_id: 'user-1' },
      { recipe_id: 'r1', user_id: 'user-2' },
      { recipe_id: 'r2', user_id: 'user-3' },
    ]);

    const { result } = renderHook(() => useCoracoes(['r1', 'r2']));

    await act(async () => {
      await result.current.carregarCorações(['r1', 'r2']);
    });

    expect(result.current.coracoes.get('r1')).toEqual({ total: 2, meu: true });
    expect(result.current.coracoes.get('r2')).toEqual({ total: 1, meu: false });
  });

  it('retorna Map vazio quando sem corações', async () => {
    setupMock([]);
    const { result } = renderHook(() => useCoracoes(['r1']));

    await act(async () => {
      await result.current.carregarCorações(['r1']);
    });

    expect(result.current.coracoes.get('r1')).toBeUndefined();
  });

  it('toggleCoracao adiciona coração otimisticamente', async () => {
    setupMock([]);
    const { result } = renderHook(() => useCoracoes(['r1']));

    await act(async () => {
      await result.current.carregarCorações(['r1']);
    });

    setupMock([], null);
    await act(async () => {
      await result.current.toggleCoracao('r1');
    });

    const estado = result.current.coracoes.get('r1');
    expect(estado?.meu).toBe(true);
    expect(estado?.total).toBe(1);
  });

  it('toggleCoracao remove coração otimisticamente', async () => {
    setupMock([{ recipe_id: 'r1', user_id: 'user-1' }]);
    const { result } = renderHook(() => useCoracoes(['r1']));

    await act(async () => {
      await result.current.carregarCorações(['r1']);
    });

    setupMock([], null);
    await act(async () => {
      await result.current.toggleCoracao('r1');
    });

    const estado = result.current.coracoes.get('r1');
    expect(estado?.meu).toBe(false);
    expect(estado?.total).toBe(0);
  });

  it('reverte estado otimista em caso de erro', async () => {
    setupMock([{ recipe_id: 'r1', user_id: 'user-1' }]);
    const { result } = renderHook(() => useCoracoes(['r1']));

    await act(async () => {
      await result.current.carregarCorações(['r1']);
    });

    const chain = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
      match: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
    };
    mockFrom.mockReturnValue(chain);

    await act(async () => {
      await result.current.toggleCoracao('r1');
    });

    expect(result.current.coracoes.get('r1')).toEqual({ total: 1, meu: true });
  });
});
