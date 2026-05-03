import { renderHook, act } from '@testing-library/react-native';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');
jest.mock('expo-file-system/legacy', () => ({
  readAsStringAsync: jest.fn().mockResolvedValue('base64data'),
}));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'carlos@test.com', user_metadata: { nome: 'Carlos' } } }),
}));

const mockProfile = {
  id: 'user-1',
  nome: 'Carlos',
  foto_url: null,
  criado_em: '2026-01-01T00:00:00Z',
};

function setupFromMock(data: object | null, error: object | null = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
    update: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
}

describe('useProfile', () => {
  beforeEach(() => jest.clearAllMocks());

  it('carrega perfil ao montar', async () => {
    setupFromMock(mockProfile);
    const { result } = renderHook(() => useProfile());
    await act(async () => {});
    expect(result.current.profile).toEqual(mockProfile);
    expect(result.current.loading).toBe(false);
  });

  it('cria perfil se não existir (usuário legado)', async () => {
    const chain = setupFromMock(null);
    chain.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: mockProfile, error: null });

    const { result } = renderHook(() => useProfile());
    await act(async () => {});
    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(result.current.profile).toEqual(mockProfile);
  });

  it('updateProfile atualiza nome no Supabase', async () => {
    const chain = setupFromMock(mockProfile);
    const updatedProfile = { ...mockProfile, nome: 'Carlos Novo' };
    chain.single
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: updatedProfile, error: null });

    const { result } = renderHook(() => useProfile());
    await act(async () => {});
    await act(async () => {
      await result.current.updateProfile('Carlos Novo');
    });

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(result.current.profile?.nome).toBe('Carlos Novo');
  });

  it('updateProfile faz upload de foto e salva url', async () => {
    const chain = setupFromMock(mockProfile);
    const profileComFoto = { ...mockProfile, foto_url: 'https://storage.example.com/avatar.jpg' };
    chain.single
      .mockResolvedValueOnce({ data: mockProfile, error: null })
      .mockResolvedValueOnce({ data: profileComFoto, error: null });

    global.fetch = jest.fn().mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob()),
    });

    const { result } = renderHook(() => useProfile());
    await act(async () => {});
    await act(async () => {
      await result.current.updateProfile('Carlos', 'file:///path/to/foto.jpg');
    });

    expect(supabase.storage.from).toHaveBeenCalledWith('avatars');
    expect(result.current.profile?.foto_url).toBe('https://storage.example.com/avatar.jpg');
  });
});
