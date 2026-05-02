import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Drawer } from '../../components/Drawer';

jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ signOut: jest.fn().mockResolvedValue(undefined) }),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn() },
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockUser = { id: 'user-1', email: 'carlos@test.com' } as any;
const mockProfile = { id: 'user-1', nome: 'Carlos', foto_url: null, criado_em: '2026-01-01' };

describe('Drawer', () => {
  it('mostra nome e email do usuário', () => {
    const { getByText } = render(
      <Drawer visible={true} onClose={jest.fn()} user={mockUser} profile={mockProfile} />
    );
    expect(getByText('Carlos')).toBeTruthy();
    expect(getByText('carlos@test.com')).toBeTruthy();
  });

  it('mostra inicial do nome quando sem foto', () => {
    const { getByText } = render(
      <Drawer visible={true} onClose={jest.fn()} user={mockUser} profile={mockProfile} />
    );
    expect(getByText('C')).toBeTruthy();
  });

  it('chama onClose ao tocar no overlay', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <Drawer visible={true} onClose={onClose} user={mockUser} profile={mockProfile} />
    );
    fireEvent.press(getByTestId('drawer-overlay'));
    expect(onClose).toHaveBeenCalled();
  });

  it('mostra itens do menu', () => {
    const { getByText } = render(
      <Drawer visible={true} onClose={jest.fn()} user={mockUser} profile={mockProfile} />
    );
    expect(getByText('✏️ Editar perfil')).toBeTruthy();
    expect(getByText('⚙️ Configurações')).toBeTruthy();
    expect(getByText('❓ Ajuda')).toBeTruthy();
    expect(getByText('⬅ Sair')).toBeTruthy();
  });

  it('mostra fallback do email como nome quando profile é null', () => {
    const { getByText } = render(
      <Drawer visible={true} onClose={jest.fn()} user={mockUser} profile={null} />
    );
    expect(getByText('carlos')).toBeTruthy();
  });
});
