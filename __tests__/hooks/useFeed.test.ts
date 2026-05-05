import { renderHook, act } from '@testing-library/react-native';
import { useFeed } from '../../hooks/useFeed';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const receitaRaw = {
  id: 'rec-1',
  nome: 'Macarrão ao Sugo',
  categorias: ['Massas'],
  imagem: null,
  tempo_preparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  criada_em: '2026-05-01T00:00:00Z',
  user_id: 'user-2',
};

function setupFeedMock(data: any[], error: any = null) {
  const receitasChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data, error }),
  };
  const profilesChain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({
      data: [{ id: 'user-2', nome: 'Maria', foto_url: null, total_importacoes: 5 }],
      error: null,
    }),
  };
  (supabase.from as jest.Mock).mockImplementation((table: string) =>
    table === 'profiles' ? profilesChain : receitasChain
  );
  return receitasChain;
}

describe('useFeed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('começa com lista vazia e loading false', () => {
    setupFeedMock([]);
    const { result } = renderHook(() => useFeed());
    expect(result.current.receitas).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('recarregar busca receitas públicas e mapeia criador', async () => {
    setupFeedMock([receitaRaw]);
    const { result } = renderHook(() => useFeed());

    await act(async () => { result.current.recarregar(); });

    expect(result.current.receitas).toHaveLength(1);
    const r = result.current.receitas[0];
    expect(r.nome).toBe('Macarrão ao Sugo');
    expect(r.tempoPreparo).toBe(30);
    expect(r.criador.nome).toBe('Maria');
    expect(r.criador.total_importacoes).toBe(5);
  });

  it('temMais é false quando retorna menos que 10 itens', async () => {
    setupFeedMock([receitaRaw]);
    const { result } = renderHook(() => useFeed());
    await act(async () => { result.current.recarregar(); });
    expect(result.current.temMais).toBe(false);
  });

  it('temMais é true quando retorna exatamente 10 itens', async () => {
    setupFeedMock(Array.from({ length: 10 }, (_, i) => ({ ...receitaRaw, id: `rec-${i}` })));
    const { result } = renderHook(() => useFeed());
    await act(async () => { result.current.recarregar(); });
    expect(result.current.temMais).toBe(true);
  });

  it('carregarMais acumula receitas sem duplicar', async () => {
    const chain = setupFeedMock(Array.from({ length: 10 }, (_, i) => ({ ...receitaRaw, id: `rec-${i}` })));
    const { result } = renderHook(() => useFeed());
    await act(async () => { result.current.recarregar(); });
    expect(result.current.receitas).toHaveLength(10);

    chain.range.mockResolvedValueOnce({
      data: [{ ...receitaRaw, id: 'rec-extra' }],
      error: null,
    });
    await act(async () => { result.current.carregarMais(); });
    expect(result.current.receitas).toHaveLength(11);
  });

  it('recarregar reseta a lista', async () => {
    const chain = setupFeedMock(Array.from({ length: 10 }, (_, i) => ({ ...receitaRaw, id: `rec-${i}` })));
    const { result } = renderHook(() => useFeed());
    await act(async () => { result.current.recarregar(); });

    chain.range.mockResolvedValueOnce({ data: [{ ...receitaRaw, id: 'novo-1' }], error: null });
    await act(async () => { result.current.recarregar(); });
    expect(result.current.receitas).toHaveLength(1);
    expect(result.current.receitas[0].id).toBe('novo-1');
  });
});
