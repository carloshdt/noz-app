import { renderHook, act } from '@testing-library/react-native';
import { usePublicar } from '../../hooks/usePublicar';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

function setupUpdateMock(error: any = null) {
  let eqCallCount = 0;
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockImplementation(() => {
      eqCallCount++;
      if (eqCallCount >= 2) {
        return Promise.resolve({ data: null, error });
      }
      return chain;
    }),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

describe('usePublicar', () => {
  beforeEach(() => jest.clearAllMocks());

  it('togglePublicar retorna true ao publicar com sucesso', async () => {
    setupUpdateMock();
    const { result } = renderHook(() => usePublicar());
    let ok = false;
    await act(async () => { ok = await result.current.togglePublicar('rec-1', false); });
    expect(ok).toBe(true);
  });

  it('togglePublicar retorna false se Supabase retornar erro', async () => {
    setupUpdateMock({ message: 'unauthorized' });
    const { result } = renderHook(() => usePublicar());
    let ok = true;
    await act(async () => { ok = await result.current.togglePublicar('rec-1', true); });
    expect(ok).toBe(false);
  });

  it('togglePublicar chama update em receitas com valor invertido', async () => {
    const chain = setupUpdateMock();
    const { result } = renderHook(() => usePublicar());
    await act(async () => { await result.current.togglePublicar('rec-1', false); });
    expect(supabase.from).toHaveBeenCalledWith('receitas');
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ publica: true }));
  });
});
