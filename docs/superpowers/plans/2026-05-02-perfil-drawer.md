# Perfil com Drawer — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar drawer lateral com perfil do usuário, edição de nome/foto e logout ao app Noz.

**Architecture:** Um componente `Drawer` customizado absolutamente posicionado sobre as tabs, com animação slide da esquerda. O estado `drawerVisible` vive em `app/(tabs)/_layout.tsx`, que também habilita o header nativo com o ícone ☰. O hook `useProfile` busca e atualiza dados na tabela `profiles` do Supabase; fotos vão para o bucket `avatars` via Supabase Storage.

**Tech Stack:** React Native Animated, expo-image-picker, Supabase (PostgreSQL + Storage), NativeWind, expo-router, lucide-react-native.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---------|------|------------------|
| `app.json` | Modificar | Adicionar plugin expo-image-picker |
| `lib/__mocks__/supabase.ts` | Modificar | Estender mock com select/single/storage |
| `hooks/useProfile.ts` | Criar | Busca/atualiza perfil + upload de foto |
| `components/Drawer.tsx` | Criar | Drawer animado com menu do usuário |
| `app/(tabs)/_layout.tsx` | Modificar | Habilitar header nativo + integrar Drawer |
| `app/(tabs)/index.tsx` | Modificar | Corrigir SafeAreaView edges |
| `app/(tabs)/cardapio.tsx` | Modificar | Corrigir SafeAreaView edges |
| `app/(tabs)/compras.tsx` | Modificar | Corrigir SafeAreaView edges |
| `app/_layout.tsx` | Modificar | Registrar rota modal perfil/editar |
| `app/perfil/editar.tsx` | Criar | Modal de edição de nome e foto |
| `__tests__/hooks/useProfile.test.ts` | Criar | Testes do hook |
| `__tests__/components/Drawer.test.tsx` | Criar | Testes de renderização do drawer |
| `__tests__/screens/EditarPerfil.test.tsx` | Criar | Testes da tela de edição |

---

## Task 1: Instalar expo-image-picker e configurar permissões

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Instalar o pacote**

```bash
npx expo install expo-image-picker
```

Expected: Package added to `node_modules` and `package.json`.

- [ ] **Step 2: Adicionar plugin ao app.json**

Em `app.json`, substitua o array `plugins`:

```json
"plugins": [
  "expo-router",
  "expo-web-browser",
  [
    "expo-image-picker",
    {
      "photosPermission": "O app precisa acessar suas fotos para você escolher uma foto de perfil.",
      "cameraPermission": "O app precisa acessar sua câmera para você tirar uma foto de perfil."
    }
  ]
]
```

- [ ] **Step 3: Commit**

```bash
git add app.json package.json
git commit -m "chore: instalar expo-image-picker"
```

---

## Task 2: Configurar Supabase — tabela profiles + trigger + bucket avatars

**Files:** (sem código — configuração manual no Supabase)

- [ ] **Step 1: Executar SQL no Supabase**

Acesse o Supabase Dashboard → SQL Editor → New Query. Cole e execute:

```sql
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  foto_url text,
  criado_em timestamptz default now()
);

alter table profiles enable row level security;

create policy "Usuário lê próprio perfil" on profiles
  for select using (auth.uid() = id);

create policy "Usuário atualiza próprio perfil" on profiles
  for update using (auth.uid() = id);

create policy "Usuário insere próprio perfil" on profiles
  for insert with check (auth.uid() = id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

Expected: "Success. No rows returned."

- [ ] **Step 2: Inserir perfil do usuário de teste existente**

No SQL Editor, execute (substitua `SEU_USER_ID` pelo UUID do usuário já cadastrado — veja em Authentication → Users):

```sql
insert into profiles (id, nome)
select id, coalesce(raw_user_meta_data->>'nome', split_part(email, '@', 1))
from auth.users
where not exists (select 1 from profiles where profiles.id = auth.users.id);
```

Expected: "Success. N rows affected." (1 para cada usuário existente)

- [ ] **Step 3: Criar bucket avatars no Storage**

No Supabase Dashboard → Storage → New Bucket:
- Name: `avatars`
- Public bucket: **ativado** (toggle ON)
- Clique em "Save"

- [ ] **Step 4: Adicionar política de upload ao bucket**

No Supabase Dashboard → Storage → Policies → avatars → New Policy → For full customization:

```sql
-- Nome da política: "Usuário gerencia próprio avatar"
-- Allowed operations: INSERT, UPDATE, DELETE
-- Target roles: authenticated
-- Policy definition (USING):
(auth.uid()::text) = (storage.foldername(name))[1]
```

Expected: Policy salva e listada no painel.

---

## Task 3: Expandir mock do Supabase + hook useProfile (TDD)

**Files:**
- Modify: `lib/__mocks__/supabase.ts`
- Create: `hooks/useProfile.ts`
- Create: `__tests__/hooks/useProfile.test.ts`

- [ ] **Step 1: Atualizar o mock do Supabase**

Substitua o conteúdo completo de `lib/__mocks__/supabase.ts`:

```typescript
const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  upsert: jest.fn().mockReturnThis(),
};

const mockStorageChain = {
  upload: jest.fn().mockResolvedValue({ error: null }),
  getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://storage.example.com/avatar.jpg' } }),
};

export const supabase = {
  auth: {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    signInWithOAuth: jest.fn(),
    setSession: jest.fn(),
    exchangeCodeForSession: jest.fn(),
  },
  from: jest.fn(() => ({ ...mockChain })),
  storage: {
    from: jest.fn(() => ({ ...mockStorageChain })),
  },
};
```

- [ ] **Step 2: Escrever os testes (vão falhar)**

Crie `__tests__/hooks/useProfile.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');
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

  it('retorna null quando sem usuário', async () => {
    jest.resetModules();
    jest.mock('../../hooks/useAuth', () => ({
      useAuth: () => ({ user: null }),
    }));
    const { useProfile: useProfileNoUser } = require('../../hooks/useProfile');
    const { result } = renderHook(() => useProfileNoUser());
    await act(async () => {});
    expect(result.current.profile).toBeNull();
    expect(result.current.loading).toBe(false);
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
```

- [ ] **Step 3: Rodar para confirmar que falham**

```bash
npx jest __tests__/hooks/useProfile.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../hooks/useProfile'"

- [ ] **Step 4: Implementar o hook**

Crie `hooks/useProfile.ts`:

```typescript
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Profile } from '../types';
import { useAuth } from './useAuth';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile(user);
  }, [user?.id]);

  const loadProfile = async (u: User | null) => {
    if (!u) { setProfile(null); setLoading(false); return; }
    setLoading(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .single();

    if (data) {
      setProfile(data as Profile);
    } else if (error?.code === 'PGRST116') {
      const nome = u.user_metadata?.nome ?? u.email?.split('@')[0] ?? 'Usuário';
      const { data: created } = await supabase
        .from('profiles')
        .insert({ id: u.id, nome })
        .select()
        .single();
      setProfile((created as Profile) ?? null);
    } else {
      setProfile(null);
    }
    setLoading(false);
  };

  const updateProfile = async (nome: string, fotoUri?: string) => {
    if (!user) return;
    let foto_url = profile?.foto_url;

    if (fotoUri) {
      const ext = fotoUri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const response = await fetch(fotoUri);
      const blob = await response.blob();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);
      foto_url = publicUrl;
    }

    const { data, error } = await supabase
      .from('profiles')
      .update({ nome, foto_url })
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data as Profile);
  };

  return { profile, loading, updateProfile, refreshProfile: () => loadProfile(user) };
}
```

- [ ] **Step 5: Rodar para confirmar que passam**

```bash
npx jest __tests__/hooks/useProfile.test.ts --no-coverage
```

Expected: PASS (4–5 tests passing, ignore o teste de "sem usuário" se resetModules causar problemas — pode simplificar para só verificar que profile=null quando user=null diretamente)

- [ ] **Step 6: Rodar todos os testes para garantir nada quebrou**

```bash
npx jest --no-coverage
```

Expected: All suites pass.

- [ ] **Step 7: Commit**

```bash
git add lib/__mocks__/supabase.ts hooks/useProfile.ts __tests__/hooks/useProfile.test.ts
git commit -m "feat: hook useProfile com carga e atualização via Supabase"
```

---

## Task 4: Componente Drawer (TDD)

**Files:**
- Create: `components/Drawer.tsx`
- Create: `__tests__/components/Drawer.test.tsx`

- [ ] **Step 1: Escrever os testes**

Crie `__tests__/components/Drawer.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Rodar para confirmar que falham**

```bash
npx jest __tests__/components/Drawer.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../../components/Drawer'"

- [ ] **Step 3: Implementar o componente**

Crie `components/Drawer.tsx`:

```typescript
import { View, Pressable, Animated, StyleSheet, Image } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { User } from '@supabase/supabase-js';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Profile } from '../types';
import { AppText } from './ui/AppText';
import { useAuth } from '../hooks/useAuth';

type Props = {
  visible: boolean;
  onClose: () => void;
  user: User;
  profile: Profile | null;
};

const DRAWER_WIDTH = 280;

export function Drawer({ visible, onClose, user, profile }: Props) {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const handleSignOut = async () => {
    onClose();
    await signOut();
    router.replace('/(auth)/login');
  };

  const nome = profile?.nome ?? user.email?.split('@')[0] ?? 'Usuário';
  const inicial = nome[0].toUpperCase();

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.container]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <Animated.View
        testID="drawer-overlay"
        style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.panel, { paddingTop: insets.top + 24, transform: [{ translateX }] }]}
      >
        <View style={styles.profileHeader}>
          {profile?.foto_url ? (
            <Image source={{ uri: profile.foto_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <AppText style={styles.avatarLetter}>{inicial}</AppText>
            </View>
          )}
          <AppText style={styles.nome}>{nome}</AppText>
          <AppText style={styles.email}>{user.email}</AppText>
        </View>

        <Pressable
          style={styles.menuItem}
          onPress={() => { onClose(); router.push('/perfil/editar'); }}
        >
          <AppText>✏️ Editar perfil</AppText>
        </Pressable>

        <Pressable disabled style={[styles.menuItem, styles.itemDisabled]}>
          <AppText style={styles.textMuted}>⚙️ Configurações</AppText>
        </Pressable>

        <Pressable disabled style={[styles.menuItem, styles.itemDisabled]}>
          <AppText style={styles.textMuted}>❓ Ajuda</AppText>
        </Pressable>

        <View style={styles.footer}>
          <Pressable style={styles.menuItem} onPress={handleSignOut}>
            <AppText style={styles.textLogout}>⬅ Sair</AppText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 999 },
  overlay: { backgroundColor: 'rgba(0,0,0,0.4)' },
  panel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  profileHeader: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  avatar: { width: 56, height: 56, borderRadius: 28, marginBottom: 12 },
  avatarFallback: {
    backgroundColor: '#F3EDE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 24,
    fontFamily: 'PlayfairDisplay_700Bold',
    color: '#8B4513',
  },
  nome: { fontFamily: 'Inter_700Bold', fontSize: 16, color: '#2C1810', marginBottom: 2 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#8C7B6B' },
  menuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F9F5F0',
  },
  itemDisabled: { opacity: 0.45 },
  textMuted: { color: '#8C7B6B' },
  textLogout: { color: '#EF4444' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
});
```

- [ ] **Step 4: Rodar para confirmar que passam**

```bash
npx jest __tests__/components/Drawer.test.tsx --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 5: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: All suites pass.

- [ ] **Step 6: Commit**

```bash
git add components/Drawer.tsx __tests__/components/Drawer.test.tsx
git commit -m "feat: componente Drawer com animação e menu do usuário"
```

---

## Task 5: Integrar Drawer nas tabs (header ☰ + SafeAreaView fix)

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Modify: `app/(tabs)/index.tsx` (linha 25)
- Modify: `app/(tabs)/cardapio.tsx` (linha 26)
- Modify: `app/(tabs)/compras.tsx` (linha 50)

- [ ] **Step 1: Substituir o conteúdo completo de `app/(tabs)/_layout.tsx`**

```typescript
import { View, Pressable } from 'react-native';
import { Tabs } from 'expo-router';
import { useState } from 'react';
import { Menu, UtensilsCrossed, CalendarDays, ShoppingCart } from 'lucide-react-native';
import { Drawer } from '../../components/Drawer';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export default function TabLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user } = useAuth();
  const { profile } = useProfile();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: true,
          headerStyle: { backgroundColor: '#FAF6F1' },
          headerShadowVisible: false,
          headerTitleStyle: {
            fontFamily: 'PlayfairDisplay_700Bold',
            fontSize: 20,
            color: '#2C1810',
          },
          headerLeft: () => (
            <Pressable
              onPress={() => setDrawerVisible(true)}
              style={{ paddingLeft: 16, paddingRight: 8 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Menu size={22} color="#2C1810" />
            </Pressable>
          ),
          tabBarActiveTintColor: '#8B4513',
          tabBarInactiveTintColor: '#8C7B6B',
          tabBarStyle: {
            backgroundColor: '#FAF6F1',
            borderTopColor: '#D4C4B0',
            paddingBottom: 8,
          },
          tabBarLabelStyle: {
            fontFamily: 'Inter_500Medium',
            fontSize: 12,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Receitas',
            tabBarIcon: ({ color }) => <UtensilsCrossed size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cardapio"
          options={{
            title: 'Cardápio',
            tabBarIcon: ({ color }) => <CalendarDays size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="compras"
          options={{
            title: 'Compras',
            tabBarIcon: ({ color }) => <ShoppingCart size={22} color={color} />,
          }}
        />
      </Tabs>

      {user && (
        <Drawer
          visible={drawerVisible}
          onClose={() => setDrawerVisible(false)}
          user={user}
          profile={profile}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: Corrigir SafeAreaView em `app/(tabs)/index.tsx`**

Na linha 25, troque:
```tsx
<SafeAreaView className="flex-1 bg-background">
```
por:
```tsx
<SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
```

- [ ] **Step 3: Corrigir SafeAreaView em `app/(tabs)/cardapio.tsx`**

Na linha 26, troque:
```tsx
<SafeAreaView className="flex-1 bg-background">
```
por:
```tsx
<SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
```

Há também um segundo `<SafeAreaView>` na linha 43 (estado vazio), aplique a mesma mudança:
```tsx
<SafeAreaView className="flex-1 bg-background items-center justify-center px-8" edges={['bottom', 'left', 'right']}>
```

- [ ] **Step 4: Corrigir SafeAreaView em `app/(tabs)/compras.tsx`**

Na linha 50, troque:
```tsx
<SafeAreaView className="flex-1 bg-background">
```
por:
```tsx
<SafeAreaView className="flex-1 bg-background" edges={['bottom', 'left', 'right']}>
```

Verifique se há outro `<SafeAreaView>` no estado vazio (linha ~42) e aplique o mesmo.

- [ ] **Step 5: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: All suites pass. (Os testes existentes de useReceitas e useCardapio não devem quebrar.)

- [ ] **Step 6: Commit**

```bash
git add app/(tabs)/_layout.tsx app/(tabs)/index.tsx app/(tabs)/cardapio.tsx app/(tabs)/compras.tsx
git commit -m "feat: habilitar header nativo com ☰ e integrar Drawer nas tabs"
```

---

## Task 6: Registrar rota perfil/editar no Stack raiz

**Files:**
- Modify: `app/_layout.tsx` (linha 33, após `receita/[id]/editar`)

- [ ] **Step 1: Adicionar Stack.Screen para perfil/editar**

Em `app/_layout.tsx`, dentro do `<Stack>`, após a linha com `receita/[id]/editar`, adicione:

```tsx
<Stack.Screen name="perfil/editar" options={{ presentation: 'modal', headerShown: false }} />
```

O bloco Stack deve ficar assim:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(auth)" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="receita/nova" options={{ presentation: 'modal' }} />
  <Stack.Screen name="receita/[id]/index" />
  <Stack.Screen name="receita/[id]/editar" options={{ presentation: 'modal' }} />
  <Stack.Screen name="perfil/editar" options={{ presentation: 'modal', headerShown: false }} />
</Stack>
```

- [ ] **Step 2: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: All suites pass.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: registrar rota modal perfil/editar no Stack"
```

---

## Task 7: Tela de edição de perfil (TDD)

**Files:**
- Create: `app/perfil/editar.tsx`
- Create: `__tests__/screens/EditarPerfil.test.tsx`

- [ ] **Step 1: Escrever os testes**

Crie `__tests__/screens/EditarPerfil.test.tsx`:

```typescript
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
```

- [ ] **Step 2: Rodar para confirmar que falham**

```bash
npx jest __tests__/screens/EditarPerfil.test.tsx --no-coverage
```

Expected: FAIL — "Cannot find module '../../app/perfil/editar'"

- [ ] **Step 3: Criar o diretório**

```bash
mkdir -p app/perfil
```

- [ ] **Step 4: Implementar a tela**

Crie `app/perfil/editar.tsx`:

```typescript
import { View, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProfile } from '../../hooks/useProfile';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';

export default function EditarPerfil() {
  const { profile, updateProfile } = useProfile();
  const { user } = useAuth();
  const [nome, setNome] = useState(profile?.nome ?? '');
  const [fotoUri, setFotoUri] = useState<string | undefined>(undefined);
  const [salvando, setSalvando] = useState(false);

  const handleEscolherFoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  };

  const handleSalvar = async () => {
    if (!nome.trim()) {
      Alert.alert('Atenção', 'O nome não pode ficar vazio.');
      return;
    }
    try {
      setSalvando(true);
      await updateProfile(nome.trim(), fotoUri);
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const avatarUri = fotoUri ?? profile?.foto_url;
  const inicial = (profile?.nome ?? user?.email ?? 'U')[0].toUpperCase();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom', 'left', 'right']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <Pressable onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <AppText className="text-muted text-[15px]">Cancelar</AppText>
        </Pressable>
        <AppText variant="heading" className="text-[17px]">Editar perfil</AppText>
        <Pressable
          onPress={handleSalvar}
          disabled={salvando}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {salvando ? (
            <ActivityIndicator size="small" color="#8B4513" />
          ) : (
            <AppText className="text-primary font-sans-medium text-[15px]">Salvar</AppText>
          )}
        </Pressable>
      </View>

      <View className="items-center pt-8 pb-6">
        <Pressable onPress={handleEscolherFoto}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <View className="w-20 h-20 rounded-full bg-surface items-center justify-center">
              <AppText className="font-serif text-[32px] text-primary">{inicial}</AppText>
            </View>
          )}
          <View className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary items-center justify-center">
            <AppText className="text-white text-[14px]">📷</AppText>
          </View>
        </Pressable>
        <AppText className="text-muted text-[13px] mt-2">Toque para alterar</AppText>
      </View>

      <View className="px-6 gap-5">
        <Input
          label="Nome"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Seu nome"
        />

        <View className="gap-1">
          <AppText variant="label">Email</AppText>
          <View className="bg-surface border border-border rounded-card px-4 py-3">
            <AppText className="text-muted text-[16px]">{user?.email}</AppText>
          </View>
          <AppText className="text-muted text-[12px]">Email não pode ser alterado</AppText>
        </View>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Rodar para confirmar que passam**

```bash
npx jest __tests__/screens/EditarPerfil.test.tsx --no-coverage
```

Expected: PASS (5 tests)

- [ ] **Step 6: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: All suites pass.

- [ ] **Step 7: Commit**

```bash
git add app/perfil/editar.tsx __tests__/screens/EditarPerfil.test.tsx
git commit -m "feat: tela de edição de perfil com nome e foto"
```

---

## Self-review checklist (para quem implementar)

Após todos os tasks, verifique manualmente no device/emulador:

- [ ] ☰ aparece no header de todas as 3 abas
- [ ] Toque no ☰ abre o drawer da esquerda com animação
- [ ] Drawer mostra inicial do nome (sem foto) ou foto do perfil
- [ ] Toque fora do drawer fecha com animação
- [ ] "Editar perfil" abre o modal correto
- [ ] Salvar nome atualiza no drawer após fechar
- [ ] Upload de foto funciona e aparece no drawer
- [ ] "Sair" desloga e vai para tela de login
- [ ] "Configurações" e "Ajuda" aparecem desabilitados (sem ação)
- [ ] Não há duplo padding no topo das telas (SafeAreaView com edges corretos)
