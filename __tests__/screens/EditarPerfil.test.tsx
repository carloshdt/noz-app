import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import EditarPerfil from '../../app/perfil/editar';

const mockUpdateProfile = jest.fn().mockResolvedValue(undefined);

jest.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { id: 'user-1', nome: 'Carlos', foto_url: null, criado_em: '2026-01-01' },
    loading: false,
    updateProfile: mockUpdateProfile,
  }),
}));

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'carlos@test.com' } }),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn() },
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
  MediaTypeOptions: { Images: 'Images' },
}));

describe('EditarPerfil', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exibe nome atual no campo editável', () => {
    const { getByDisplayValue } = render(<EditarPerfil />);
    expect(getByDisplayValue('Carlos')).toBeTruthy();
  });

  it('exibe email do usuário (somente leitura)', () => {
    const { getByText } = render(<EditarPerfil />);
    expect(getByText('carlos@test.com')).toBeTruthy();
  });

  it('Cancelar chama router.back()', () => {
    const { router } = require('expo-router');
    const { getByText } = render(<EditarPerfil />);
    fireEvent.press(getByText('Cancelar'));
    expect(router.back).toHaveBeenCalled();
  });

  it('Salvar chama updateProfile com o nome atualizado', async () => {
    const { getByDisplayValue, getByText } = render(<EditarPerfil />);
    const input = getByDisplayValue('Carlos');
    fireEvent.changeText(input, 'Carlos Atualizado');
    fireEvent.press(getByText('Salvar'));
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith('Carlos Atualizado', undefined);
    });
  });

  it('exibe texto explicativo abaixo do email', () => {
    const { getByText } = render(<EditarPerfil />);
    expect(getByText('Email não pode ser alterado')).toBeTruthy();
  });
});
