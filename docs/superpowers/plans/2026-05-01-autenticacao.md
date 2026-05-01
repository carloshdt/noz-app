# Autenticação — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar autenticação completa no Noz com Supabase (email/senha + Google + Apple), roteamento baseado em sessão e suporte offline via AsyncStorage.

**Architecture:** Supabase gerencia auth e banco de dados. AsyncStorage funciona como cache local para receitas — app funciona offline e sincroniza ao reconectar. Expo Router roteia entre grupo `(auth)` e `(tabs)` baseado na sessão ativa.

**Tech Stack:** `@supabase/supabase-js`, `expo-web-browser`, `expo-auth-session`, `expo-apple-authentication`, AsyncStorage (já instalado), Expo Router (já instalado)

---

## Mapa de Arquivos

**Criar:**
- `.env` — variáveis de ambiente Supabase
- `.env.example` — template público
- `lib/supabase.ts` — cliente Supabase
- `supabase/migrations/001_schema.sql` — schema do banco
- `types/index.ts` — atualizar com Profile, atualizar Receita
- `hooks/useAuth.ts` — hook + AuthContext + AuthProvider
- `hooks/__tests__/useAuth.test.ts` — testes do hook
- `app/(auth)/_layout.tsx` — stack das telas de auth
- `app/(auth)/login.tsx` — tela principal (social primeiro)
- `app/(auth)/login-email.tsx` — formulário email+senha
- `app/(auth)/cadastro.tsx` — formulário nome+email+senha
- `app/(auth)/esqueci-senha.tsx` — reset de senha
- `hooks/useReceitas.ts` — reescrever com Supabase + offline

**Modificar:**
- `app/_layout.tsx` — adicionar AuthProvider + roteamento por sessão
- `hooks/useCardapio.ts` — adicionar user_id nas operações
- `.gitignore` — adicionar .env e .superpowers

---

## Task 1: Instalar dependências

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar pacotes**

```bash
npx expo install @supabase/supabase-js expo-web-browser expo-auth-session expo-apple-authentication
```

Saída esperada: `added N packages`

- [ ] **Step 2: Verificar instalação**

```bash
cat package.json | grep -E "supabase|expo-web-browser|expo-auth-session|expo-apple"
```

Esperado: 4 linhas com os pacotes listados.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: instalar dependências de autenticação"
```

---

## Task 2: Configurar variáveis de ambiente e cliente Supabase

**Files:**
- Create: `.env`
- Create: `.env.example`
- Create: `lib/supabase.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Criar projeto no Supabase**

Acesse [supabase.com](https://supabase.com), crie um projeto e copie a URL e a anon key em **Settings → API**.

- [ ] **Step 2: Criar `.env`**

```
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

- [ ] **Step 3: Criar `.env.example`**

```
EXPO_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
```

- [ ] **Step 4: Adicionar ao `.gitignore`**

Abra `.gitignore` e adicione ao final:

```
.env
.superpowers/
```

- [ ] **Step 5: Criar `lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add lib/supabase.ts .env.example .gitignore
git commit -m "chore: configurar cliente Supabase e variáveis de ambiente"
```

---

## Task 3: Criar schema no banco de dados

**Files:**
- Create: `supabase/migrations/001_schema.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
-- supabase/migrations/001_schema.sql

-- Tabela de perfis (extensão de auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  foto_url text,
  criado_em timestamptz default now() not null
);

-- Criar perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tabela de receitas
create table public.receitas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  categoria text not null,
  imagem text,
  tempo_preparo int not null,
  porcoes int not null,
  dificuldade text not null,
  instrucoes text[] default '{}' not null,
  publica boolean default false not null,
  criada_em timestamptz default now() not null,
  atualizada_em timestamptz default now() not null
);

-- Tabela de ingredientes
create table public.ingredientes (
  id uuid default gen_random_uuid() primary key,
  receita_id uuid references public.receitas(id) on delete cascade not null,
  nome text not null,
  quantidade text not null,
  unidade text not null
);

-- RLS: profiles
alter table public.profiles enable row level security;

create policy "Usuário lê próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "Usuário atualiza próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- RLS: receitas
alter table public.receitas enable row level security;

create policy "Usuário lê próprias receitas e públicas" on public.receitas
  for select using (auth.uid() = user_id or publica = true);
create policy "Usuário cria próprias receitas" on public.receitas
  for insert with check (auth.uid() = user_id);
create policy "Usuário edita próprias receitas" on public.receitas
  for update using (auth.uid() = user_id);
create policy "Usuário remove próprias receitas" on public.receitas
  for delete using (auth.uid() = user_id);

-- RLS: ingredientes
alter table public.ingredientes enable row level security;

create policy "Ingredientes seguem acesso da receita" on public.ingredientes
  for select using (
    exists (
      select 1 from public.receitas
      where id = receita_id and (user_id = auth.uid() or publica = true)
    )
  );
create policy "Usuário gerencia ingredientes das próprias receitas" on public.ingredientes
  for all using (
    exists (
      select 1 from public.receitas
      where id = receita_id and user_id = auth.uid()
    )
  );
```

- [ ] **Step 2: Executar no Supabase**

No dashboard do Supabase: **SQL Editor → New query** → cole o conteúdo de `001_schema.sql` → **Run**.

Verificar: **Table Editor** deve mostrar tabelas `profiles`, `receitas`, `ingredientes`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/001_schema.sql
git commit -m "chore: adicionar schema inicial do banco de dados"
```

---

## Task 4: Atualizar types

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Atualizar `types/index.ts`**

```ts
export type Dificuldade = 'Fácil' | 'Médio' | 'Difícil';

export type Ingrediente = {
  id?: string;
  nome: string;
  quantidade: number;
  unidade: string;
};

export type Receita = {
  id: string;
  user_id?: string;
  nome: string;
  categoria: string;
  imagem?: string;
  tempoPreparo: number;
  porcoes: number;
  dificuldade: Dificuldade;
  ingredientes: Ingrediente[];
  instrucoes: string[];
  publica?: boolean;
  criadaEm: string;
  atualizadaEm?: string;
  _pendingSync?: boolean;
};

export type Profile = {
  id: string;
  nome: string;
  foto_url?: string;
  criado_em: string;
};

export type CardapioDia = {
  diaSemana: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  receitaId: string | null;
};

export type ItemCompra = {
  nome: string;
  quantidade: number;
  unidade: string;
  categoria: string;
};
```

- [ ] **Step 2: Verificar que o TypeScript compila sem erros**

```bash
npx tsc --noEmit
```

Esperado: sem erros (pode haver warnings de outros arquivos que usam campos antigos — serão corrigidos nas próximas tasks).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat: atualizar types com Profile e campos de sync"
```

---

## Task 5: Criar hook useAuth com testes

**Files:**
- Create: `hooks/useAuth.ts`
- Create: `hooks/__tests__/useAuth.test.ts`

- [ ] **Step 1: Criar mock do Supabase para testes**

Crie o arquivo `__mocks__/lib/supabase.ts`:

```ts
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
  },
  from: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  })),
};
```

- [ ] **Step 2: Escrever testes que falham**

Crie `hooks/__tests__/useAuth.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useAuth, AuthProvider } from '../useAuth';
import { supabase } from '../../lib/supabase';
import React from 'react';

jest.mock('../../lib/supabase');
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock('expo-auth-session', () => ({ makeRedirectUri: jest.fn(() => 'noz://') }));

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(AuthProvider, null, children);

describe('useAuth', () => {
  beforeEach(() => jest.clearAllMocks());

  it('começa com loading true e user null', () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it('signInWithEmail chama signInWithPassword', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signInWithEmail('test@test.com', '123456');
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@test.com',
      password: '123456',
    });
  });

  it('signOut chama supabase.auth.signOut', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.signOut();
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('resetPassword chama resetPasswordForEmail', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.resetPasswordForEmail as jest.Mock).mockResolvedValue({ error: null });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(async () => {
      await result.current.resetPassword('test@test.com');
    });
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('test@test.com');
  });
});
```

- [ ] **Step 3: Rodar testes e confirmar que falham**

```bash
npx jest hooks/__tests__/useAuth.test.ts --no-coverage
```

Esperado: FAIL — `useAuth` não existe ainda.

- [ ] **Step 4: Criar `hooks/useAuth.ts`**

```ts
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithEmail: (email: string, senha: string) => Promise<void>;
  signUp: (nome: string, email: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithOAuthProvider = async (provider: 'google' | 'apple') => {
    const redirectTo = makeRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) return;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type === 'success') {
      const parsed = Linking.parse(result.url);
      const access_token = parsed.queryParams?.access_token as string;
      const refresh_token = parsed.queryParams?.refresh_token as string;
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    }
  };

  const signInWithGoogle = () => signInWithOAuthProvider('google');
  const signInWithApple = () => signInWithOAuthProvider('apple');

  const signInWithEmail = async (email: string, senha: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) throw error;
  };

  const signUp = async (nome: string, email: string, senha: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user, loading,
      signInWithGoogle, signInWithApple,
      signInWithEmail, signUp, signOut, resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
```

- [ ] **Step 5: Rodar testes e confirmar que passam**

```bash
npx jest hooks/__tests__/useAuth.test.ts --no-coverage
```

Esperado: PASS — 4 testes passando.

- [ ] **Step 6: Commit**

```bash
git add hooks/useAuth.ts hooks/__tests__/useAuth.test.ts __mocks__/lib/supabase.ts
git commit -m "feat: criar hook useAuth com AuthProvider e testes"
```

---

## Task 6: Atualizar roteamento no _layout.tsx

**Files:**
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Reescrever `app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import '../global.css';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="(auth)" />
      ) : (
        <>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="receita/nova" options={{ presentation: 'modal' }} />
          <Stack.Screen name="receita/[id]/index" />
          <Stack.Screen name="receita/[id]/editar" options={{ presentation: 'modal' }} />
        </>
      )}
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros novos relacionados ao `_layout.tsx`.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: adicionar AuthProvider e roteamento por sessão"
```

---

## Task 7: Tela de Login principal

**Files:**
- Create: `app/(auth)/_layout.tsx`
- Create: `app/(auth)/login.tsx`

- [ ] **Step 1: Criar `app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Criar `app/(auth)/login.tsx`**

```tsx
import { View, Pressable, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handleGoogle = async () => {
    try {
      setLoading('google');
      await signInWithGoogle();
    } catch {
      Alert.alert('Erro', 'Não foi possível entrar com Google. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const handleApple = async () => {
    try {
      setLoading('apple');
      await signInWithApple();
    } catch {
      Alert.alert('Erro', 'Não foi possível entrar com Apple. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-8">
      <View className="items-center mb-12">
        <AppText className="text-5xl mb-2">🌰</AppText>
        <AppText variant="title" className="text-4xl">Noz</AppText>
        <AppText variant="muted" className="text-center mt-2">
          Suas receitas, do seu jeito
        </AppText>
      </View>

      <View className="w-full gap-3">
        <Pressable
          onPress={handleGoogle}
          disabled={loading !== null}
          className="flex-row items-center justify-center bg-white border border-border rounded-xl p-4 gap-3"
        >
          {loading === 'google' ? (
            <ActivityIndicator size="small" color="#8B4513" />
          ) : (
            <AppText className="text-base font-medium text-text">
              G  Entrar com Google
            </AppText>
          )}
        </Pressable>

        <Pressable
          onPress={handleApple}
          disabled={loading !== null}
          className="flex-row items-center justify-center bg-black rounded-xl p-4 gap-3"
        >
          {loading === 'apple' ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <AppText className="text-base font-medium text-white">
              🍎  Entrar com Apple
            </AppText>
          )}
        </Pressable>

        <View className="flex-row items-center gap-3 my-2">
          <View className="flex-1 h-px bg-border" />
          <AppText variant="muted" className="text-xs">ou use seu email</AppText>
          <View className="flex-1 h-px bg-border" />
        </View>

        <Pressable onPress={() => router.push('/(auth)/login-email')}>
          <AppText className="text-center text-primary font-medium">
            Entrar com email
          </AppText>
        </Pressable>

        <Pressable onPress={() => router.push('/(auth)/cadastro')} className="mt-2">
          <AppText className="text-center text-muted">
            Não tem conta?{' '}
            <AppText className="text-primary font-medium">Criar conta</AppText>
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 3: Testar no celular**

Rode `npx expo start` e escaneie o QR code. A tela de login deve aparecer ao abrir o app (sem sessão ativa).

- [ ] **Step 4: Commit**

```bash
git add app/\(auth\)/
git commit -m "feat: criar tela de login principal"
```

---

## Task 8: Tela Login com Email

**Files:**
- Create: `app/(auth)/login-email.tsx`

- [ ] **Step 1: Criar `app/(auth)/login-email.tsx`**

```tsx
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';

export default function LoginEmailScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha email e senha.');
      return;
    }
    try {
      setLoading(true);
      await signInWithEmail(email.trim(), senha);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Email ou senha incorretos.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-8">
      <Pressable onPress={() => router.back()} className="mb-8">
        <AppText className="text-primary">← Voltar</AppText>
      </Pressable>

      <AppText variant="title" className="mb-8">Entrar</AppText>

      <View className="gap-4">
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          placeholder="Senha"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        <Pressable onPress={() => router.push('/(auth)/esqueci-senha')} className="self-end">
          <AppText className="text-primary text-sm">Esqueci minha senha</AppText>
        </Pressable>

        <Button
          label={loading ? 'Entrando...' : 'Entrar'}
          onPress={handleLogin}
          disabled={loading}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/login-email.tsx
git commit -m "feat: criar tela de login com email"
```

---

## Task 9: Tela de Cadastro

**Files:**
- Create: `app/(auth)/cadastro.tsx`

- [ ] **Step 1: Criar `app/(auth)/cadastro.tsx`**

```tsx
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';

export default function CadastroScreen() {
  const { signUp } = useAuth();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastro = async () => {
    if (!nome.trim() || !email.trim() || !senha.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }
    if (senha.length < 6) {
      Alert.alert('Atenção', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    try {
      setLoading(true);
      await signUp(nome.trim(), email.trim(), senha);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-8">
      <Pressable onPress={() => router.back()} className="mb-8">
        <AppText className="text-primary">← Voltar</AppText>
      </Pressable>

      <AppText variant="title" className="mb-8">Criar conta</AppText>

      <View className="gap-4">
        <Input
          placeholder="Seu nome"
          value={nome}
          onChangeText={setNome}
          autoCapitalize="words"
        />
        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          placeholder="Senha (mínimo 6 caracteres)"
          value={senha}
          onChangeText={setSenha}
          secureTextEntry
        />

        <Button
          label={loading ? 'Criando conta...' : 'Criar conta'}
          onPress={handleCadastro}
          disabled={loading}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/cadastro.tsx
git commit -m "feat: criar tela de cadastro"
```

---

## Task 10: Tela Esqueci Senha

**Files:**
- Create: `app/(auth)/esqueci-senha.tsx`

- [ ] **Step 1: Criar `app/(auth)/esqueci-senha.tsx`**

```tsx
import { View, Alert } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AppText } from '../../components/ui/AppText';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pressable } from 'react-native';

export default function EsqueciSenhaScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Digite seu email.');
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email.trim());
      setEnviado(true);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível enviar o email.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background px-6 pt-8">
      <Pressable onPress={() => router.back()} className="mb-8">
        <AppText className="text-primary">← Voltar</AppText>
      </Pressable>

      <AppText variant="title" className="mb-4">Esqueci minha senha</AppText>

      {enviado ? (
        <View className="gap-4">
          <AppText variant="muted">
            Email enviado para <AppText className="font-medium">{email}</AppText>.
            Verifique sua caixa de entrada e siga as instruções.
          </AppText>
          <Button label="Voltar ao login" onPress={() => router.replace('/(auth)/login')} fullWidth />
        </View>
      ) : (
        <View className="gap-4">
          <AppText variant="muted">
            Digite seu email e enviaremos um link para redefinir sua senha.
          </AppText>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Button
            label={loading ? 'Enviando...' : 'Enviar link'}
            onPress={handleReset}
            disabled={loading}
            fullWidth
          />
        </View>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/\(auth\)/esqueci-senha.tsx
git commit -m "feat: criar tela de esqueci senha"
```

---

## Task 11: Migrar useReceitas para Supabase + offline

**Files:**
- Modify: `hooks/useReceitas.ts`

- [ ] **Step 1: Reescrever `hooks/useReceitas.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Receita } from '../types';

const CACHE_KEY = '@receitas_v2';

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

async function getCache(): Promise<Receita[]> {
  const json = await AsyncStorage.getItem(CACHE_KEY);
  return json ? JSON.parse(json) : [];
}

async function setCache(receitas: Receita[]) {
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(receitas));
}

export function useReceitas() {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<Receita[]>([]);

  const carregarReceitas = useCallback(async () => {
    const cache = await getCache();
    if (cache.length > 0) setReceitas(cache);

    if (!user) return;

    try {
      const { data: receitasData, error } = await supabase
        .from('receitas')
        .select('*, ingredientes(*)')
        .eq('user_id', user.id)
        .order('criada_em', { ascending: false });

      if (error) throw error;

      const mapeadas: Receita[] = (receitasData ?? []).map((r) => ({
        id: r.id,
        user_id: r.user_id,
        nome: r.nome,
        categoria: r.categoria,
        imagem: r.imagem,
        tempoPreparo: r.tempo_preparo,
        porcoes: r.porcoes,
        dificuldade: r.dificuldade,
        ingredientes: (r.ingredientes ?? []).map((i: any) => ({
          id: i.id,
          nome: i.nome,
          quantidade: parseFloat(i.quantidade),
          unidade: i.unidade,
        })),
        instrucoes: r.instrucoes ?? [],
        publica: r.publica,
        criadaEm: r.criada_em,
        atualizadaEm: r.atualizada_em,
      }));

      setReceitas(mapeadas);
      await setCache(mapeadas);

      // Sincronizar receitas pendentes
      const pendentes = cache.filter((r) => r._pendingSync);
      for (const r of pendentes) {
        await _syncReceita(r, user.id);
      }
    } catch {
      // offline: usa cache já carregado
    }
  }, [user]);

  useEffect(() => {
    carregarReceitas();
  }, [carregarReceitas]);

  const _syncReceita = async (receita: Receita, userId: string) => {
    try {
      await supabase.from('receitas').upsert({
        id: receita.id,
        user_id: userId,
        nome: receita.nome,
        categoria: receita.categoria,
        imagem: receita.imagem,
        tempo_preparo: receita.tempoPreparo,
        porcoes: receita.porcoes,
        dificuldade: receita.dificuldade,
        instrucoes: receita.instrucoes,
        publica: receita.publica ?? false,
        atualizada_em: receita.atualizadaEm ?? new Date().toISOString(),
      });

      const ingredientesPayload = receita.ingredientes.map((i) => ({
        receita_id: receita.id,
        nome: i.nome,
        quantidade: String(i.quantidade),
        unidade: i.unidade,
      }));

      await supabase.from('ingredientes').delete().eq('receita_id', receita.id);
      if (ingredientesPayload.length > 0) {
        await supabase.from('ingredientes').insert(ingredientesPayload);
      }
    } catch {
      // permanece como pendente
    }
  };

  const adicionar = useCallback(
    async (dados: Omit<Receita, 'id' | 'criadaEm'>) => {
      const agora = new Date().toISOString();
      const nova: Receita = {
        ...dados,
        id: gerarId(),
        criadaEm: agora,
        atualizadaEm: agora,
        user_id: user?.id,
        _pendingSync: true,
      };

      setReceitas((prev) => {
        const lista = [nova, ...prev];
        setCache(lista);
        return lista;
      });

      if (user) await _syncReceita(nova, user.id);
    },
    [user]
  );

  const remover = useCallback(
    async (id: string) => {
      setReceitas((prev) => {
        const lista = prev.filter((r) => r.id !== id);
        setCache(lista);
        return lista;
      });

      if (user) {
        await supabase.from('receitas').delete().eq('id', id).eq('user_id', user.id);
      }
    },
    [user]
  );

  const editar = useCallback(
    async (id: string, dados: Partial<Receita>) => {
      const agora = new Date().toISOString();
      setReceitas((prev) => {
        const lista = prev.map((r) =>
          r.id === id ? { ...r, ...dados, atualizadaEm: agora } : r
        );
        setCache(lista);
        return lista;
      });

      if (user) {
        const atualizada = receitas.find((r) => r.id === id);
        if (atualizada) await _syncReceita({ ...atualizada, ...dados, atualizadaEm: agora }, user.id);
      }
    },
    [user, receitas]
  );

  const buscar = useCallback(
    (termo: string): Receita[] => {
      const t = termo.toLowerCase();
      return receitas.filter(
        (r) => r.nome.toLowerCase().includes(t) || r.categoria.toLowerCase().includes(t)
      );
    },
    [receitas]
  );

  return { receitas, adicionar, remover, editar, buscar };
}
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Testar no celular**

Rode `npx expo start`. Faça login, crie uma receita. Verifique no Supabase Dashboard (Table Editor → receitas) se apareceu.

- [ ] **Step 4: Commit**

```bash
git add hooks/useReceitas.ts
git commit -m "feat: migrar useReceitas para Supabase com suporte offline"
```

---

## Task 12: Atualizar useCardapio com user_id

**Files:**
- Modify: `hooks/useCardapio.ts`

- [ ] **Step 1: Adicionar `useAuth` no `hooks/useCardapio.ts`**

Abra `hooks/useCardapio.ts`. A chave do AsyncStorage precisa ser por usuário para não misturar dados:

Localize a linha com a constante da chave e substitua por uma chave dinâmica por usuário:

```ts
// Antes (linha atual):
const STORAGE_KEY = '@cardapio';

// Depois — remova essa linha e derive dentro do hook:
// const chave = user ? `@cardapio_${user.id}` : '@cardapio';
```

No topo do arquivo, adicione o import:
```ts
import { useAuth } from './useAuth';
```

Dentro da função do hook, adicione:
```ts
const { user } = useAuth();
const STORAGE_KEY = user ? `@cardapio_${user.id}` : '@cardapio';
```

E mova o `useEffect` que carrega os dados para depender de `STORAGE_KEY`:
```ts
useEffect(() => {
  AsyncStorage.getItem(STORAGE_KEY).then((json) => {
    if (json) setCardapio(JSON.parse(json));
    else setCardapio([]);
  });
}, [STORAGE_KEY]);
```

- [ ] **Step 2: Verificar TypeScript**

```bash
npx tsc --noEmit
```

Esperado: sem erros.

- [ ] **Step 3: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Esperado: todos os testes passando.

- [ ] **Step 4: Commit final**

```bash
git add hooks/useCardapio.ts
git commit -m "feat: isolar dados do cardápio por usuário"
```

---

## Configuração Manual Necessária

Antes de testar login social, configure no **Supabase Dashboard → Authentication → Providers**:

**Google:**
1. Crie um projeto em [console.cloud.google.com](https://console.cloud.google.com)
2. OAuth 2.0 → adicione o redirect URI do Supabase
3. Cole Client ID e Client Secret no Supabase

**Apple:**
1. Requer Apple Developer Account
2. Configure em Supabase → Apple provider
3. Só funciona em device iOS real ou TestFlight

**Redirect URL do app:**
No `app.json`, adicione o scheme do app:
```json
{
  "expo": {
    "scheme": "noz"
  }
}
```
