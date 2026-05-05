import { renderHook, act } from '@testing-library/react-native';
import { useComentarios } from '../../hooks/useComentarios';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'user@test.com' } }),
}));

import { supabase } from '../../lib/supabase';

const mockFrom = supabase.from as jest.Mock;

const comentarioRoot = {
  id: 'c1',
  recipe_id: 'r1',
  user_id: 'user-2',
  texto: 'Otima receita!',
  parent_id: null,
  created_at: '2026-05-04T10:00:00Z',
};

const comentarioReply = {
  id: 'c2',
  recipe_id: 'r1',
  user_id: 'user-1',
  texto: 'Obrigado!',
  parent_id: 'c1',
  created_at: '2026-05-04T11:00:00Z',
};

function setupLoadMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'comments') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [comentarioRoot, comentarioReply],
          error: null,
        }),
      };
    }
    if (table === 'comment_hearts') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [{ comment_id: 'c1', user_id: 'user-3' }],
          error: null,
        }),
      };
    }
    if (table === 'profiles') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({
          data: [
            { id: 'user-1', nome: 'Carlos', foto_url: null },
            { id: 'user-2', nome: 'Ana', foto_url: null },
          ],
          error: null,
        }),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'user-1', nome: 'Carlos', foto_url: null },
          error: null,
        }),
      };
    }
    return { select: jest.fn().mockReturnThis() };
  });
}

describe('useComentarios', () => {
  beforeEach(() => jest.clearAllMocks());

  it('carrega e monta arvore de comentarios', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));

    await act(async () => {
      await result.current.carregar();
    });

    expect(result.current.comentarios).toHaveLength(1);
    expect(result.current.comentarios[0].id).toBe('c1');
    expect(result.current.comentarios[0].replies).toHaveLength(1);
    expect(result.current.comentarios[0].replies![0].id).toBe('c2');
    expect(result.current.total).toBe(2);
  });

  it('conta coracoes corretamente', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));

    await act(async () => {
      await result.current.carregar();
    });

    expect(result.current.comentarios[0].total_coracoes).toBe(1);
    expect(result.current.comentarios[0].meu_coracao).toBe(false);
  });

  it('addComentario insere root na lista', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));
    await act(async () => {
      await result.current.carregar();
    });

    const novoInsert = {
      id: 'c3',
      recipe_id: 'r1',
      user_id: 'user-1',
      texto: 'Novo!',
      parent_id: null,
      created_at: '2026-05-04T12:00:00Z',
    };

    mockFrom.mockImplementation((table: string) => {
      if (table === 'comments') {
        return {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: novoInsert, error: null }),
        };
      }
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'user-1', nome: 'Carlos', foto_url: null },
            error: null,
          }),
        };
      }
      return { select: jest.fn().mockReturnThis() };
    });

    await act(async () => {
      await result.current.addComentario('Novo!');
    });

    expect(result.current.comentarios.some((c) => c.id === 'c3')).toBe(true);
  });

  it('deletarComentario remove da lista', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));
    await act(async () => {
      await result.current.carregar();
    });

    mockFrom.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await act(async () => {
      await result.current.deletarComentario('c1');
    });

    expect(result.current.comentarios.find((c) => c.id === 'c1')).toBeUndefined();
  });

  it('toggleCoracaoComentario atualiza estado otimisticamente', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));
    await act(async () => {
      await result.current.carregar();
    });

    mockFrom.mockReturnValue({
      upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await act(async () => {
      await result.current.toggleCoracaoComentario('c1');
    });

    expect(result.current.comentarios[0].meu_coracao).toBe(true);
    expect(result.current.comentarios[0].total_coracoes).toBe(2);
  });
});
