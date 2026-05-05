import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMercado } from '../../hooks/useMercado';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));

describe('useMercado', () => {
  beforeEach(() => AsyncStorage.clear());

  it('adiciona item avulso e guarda no historico', async () => {
    const { result } = renderHook(() => useMercado());
    await act(async () => {});
    await act(async () => { await result.current.adicionarItem('Frango'); });

    expect(result.current.itens).toEqual([
      expect.objectContaining({ nome: 'Frango' }),
    ]);
    expect(result.current.historico).toEqual(['Frango']);
  });

  it('nao duplica item ativo com mesmo nome', async () => {
    const { result } = renderHook(() => useMercado());
    await act(async () => {});
    await act(async () => { await result.current.adicionarItem('Frango'); });
    await act(async () => { await result.current.adicionarItem(' frango '); });

    expect(result.current.itens).toHaveLength(1);
  });

  it('sugere itens do historico e ingredientes das receitas', async () => {
    const { result } = renderHook(() => useMercado());
    await act(async () => {});
    await act(async () => { await result.current.adicionarItem('Farinha'); });

    expect(result.current.sugestoes('f', ['Frango', 'Ovo'])).toEqual(['Farinha', 'Frango']);
  });

  it('remove item ativo sem apagar historico', async () => {
    const { result } = renderHook(() => useMercado());
    await act(async () => {});
    await act(async () => { await result.current.adicionarItem('Leite'); });
    const id = result.current.itens[0].id;
    await act(async () => { await result.current.removerItem(id); });

    expect(result.current.itens).toHaveLength(0);
    expect(result.current.sugestoes('l')).toEqual(['Leite']);
  });
});

