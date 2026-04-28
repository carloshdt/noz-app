# Recipe App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir do zero um app de catálogo de receitas nativo para iOS e Android com visual artesanal de alta qualidade usando Expo + NativeWind.

**Architecture:** Expo Router para navegação baseada em arquivos; hooks isolados (`useReceitas`, `useCardapio`) como única camada de acesso a dados (AsyncStorage hoje, API no futuro); NativeWind v4 para estilização com tokens de design customizados; componentes UI base reutilizáveis.

**Tech Stack:** Expo SDK 51, Expo Router v3, NativeWind v4, Tailwind CSS, React Native Reanimated, AsyncStorage, Lucide React Native, Expo Google Fonts (Playfair Display + Inter).

---

## File Map

```
recipe-app/
├── app/
│   ├── _layout.tsx                  → root layout, carregamento de fontes
│   ├── (tabs)/
│   │   ├── _layout.tsx              → bottom tab navigator
│   │   ├── index.tsx                → lista de receitas
│   │   ├── cardapio.tsx             → cardápio semanal
│   │   └── compras.tsx              → lista de compras
│   └── receita/
│       ├── nova.tsx                 → criar receita
│       └── [id]/
│           ├── index.tsx            → detalhes da receita
│           └── editar.tsx           → editar receita
├── components/
│   ├── ui/
│   │   ├── AppText.tsx              → Text com fonte aplicada
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   └── Input.tsx
│   ├── ReceitaCard.tsx
│   ├── CategoriaChip.tsx
│   ├── IngredienteItem.tsx
│   ├── InstrucaoItem.tsx
│   └── ReceitaForm.tsx
├── hooks/
│   ├── useReceitas.ts
│   └── useCardapio.ts
├── types/
│   └── index.ts
├── constants/
│   └── categorias.ts
├── __tests__/
│   ├── hooks/
│   │   ├── useReceitas.test.ts
│   │   └── useCardapio.test.ts
├── tailwind.config.js
├── babel.config.js
└── package.json
```

---

## Task 1: Inicializar projeto Expo

**Files:**
- Create: `package.json`, `app.json`, `babel.config.js`, `tailwind.config.js`, `app/_layout.tsx`

- [ ] **Step 1: Criar projeto Expo**

```bash
cd C:/Users/carlo/Projects/recipe-app
npx create-expo-app@latest . --template blank-typescript
```

- [ ] **Step 2: Instalar dependências**

```bash
npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-reanimated
npx expo install expo-linear-gradient
npx expo install expo-font @expo-google-fonts/playfair-display @expo-google-fonts/inter
npx expo install react-native-svg
npm install nativewind tailwindcss
npm install lucide-react-native
npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 3: Configurar `app.json`**

```json
{
  "expo": {
    "name": "recipe-app",
    "slug": "recipe-app",
    "version": "1.0.0",
    "scheme": "recipe-app",
    "web": { "bundler": "metro", "output": "static" },
    "plugins": ["expo-router"],
    "experiments": { "typedRoutes": true }
  }
}
```

- [ ] **Step 4: Configurar `babel.config.js`**

```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
```

- [ ] **Step 5: Configurar `tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#FAF6F1',
        surface: '#F0E8DC',
        primary: '#8B4513',
        accent: '#6B7C5C',
        text: '#2C1810',
        muted: '#8C7B6B',
        border: '#D4C4B0',
      },
      fontFamily: {
        serif: ['PlayfairDisplay_700Bold'],
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-bold': ['Inter_700Bold'],
      },
      borderRadius: {
        card: '12px',
      },
    },
  },
};
```

- [ ] **Step 6: Criar `nativewind-env.d.ts` na raiz**

```ts
/// <reference types="nativewind/types" />
```

- [ ] **Step 7: Configurar `jest` no `package.json`**

Adicionar ao `package.json`:
```json
{
  "jest": {
    "preset": "jest-expo",
    "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
    "transformIgnorePatterns": [
      "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|lucide-react-native)"
    ]
  },
  "scripts": {
    "test": "jest"
  }
}
```

- [ ] **Step 8: Configurar `app/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import '../global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    PlayfairDisplay_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="receita/nova" options={{ presentation: 'modal' }} />
      <Stack.Screen name="receita/[id]/index" />
      <Stack.Screen name="receita/[id]/editar" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
```

- [ ] **Step 9: Criar `global.css` na raiz**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 10: Verificar que o projeto inicia**

```bash
npx expo start
```

Esperado: Metro bundler inicia sem erros.

- [ ] **Step 11: Commit**

```bash
git init
git add .
git commit -m "chore: inicializar projeto Expo com NativeWind e Expo Router"
```

---

## Task 2: Tipos e constantes

**Files:**
- Create: `types/index.ts`
- Create: `constants/categorias.ts`

- [ ] **Step 1: Criar `types/index.ts`**

```ts
export type Dificuldade = 'Fácil' | 'Médio' | 'Difícil';

export type Ingrediente = {
  nome: string;
  quantidade: number;
  unidade: string;
};

export type Receita = {
  id: string;
  nome: string;
  categoria: string;
  imagem?: string;
  tempoPreparo: number;
  porcoes: number;
  dificuldade: Dificuldade;
  ingredientes: Ingrediente[];
  instrucoes: string[];
  criadaEm: string;
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

- [ ] **Step 2: Criar `constants/categorias.ts`**

```ts
export const CATEGORIAS = [
  'Todas',
  'Carnes',
  'Vegetariano',
  'Massas',
  'Sopas',
  'Saladas',
  'Sobremesas',
  'Lanches',
  'Bebidas',
] as const;

export type Categoria = typeof CATEGORIAS[number];
```

- [ ] **Step 3: Commit**

```bash
git add types/ constants/
git commit -m "feat: adicionar tipos e constantes do domínio"
```

---

## Task 3: Hook `useReceitas`

**Files:**
- Create: `hooks/useReceitas.ts`
- Test: `__tests__/hooks/useReceitas.test.ts`

- [ ] **Step 1: Escrever o teste**

Criar `__tests__/hooks/useReceitas.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useReceitas } from '../../hooks/useReceitas';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const receitaBase = {
  nome: 'Frango Grelhado',
  categoria: 'Carnes',
  tempoPreparo: 20,
  porcoes: 4,
  dificuldade: 'Fácil' as const,
  ingredientes: [{ nome: 'Frango', quantidade: 500, unidade: 'g' }],
  instrucoes: ['Grelhar o frango por 20 minutos'],
};

describe('useReceitas', () => {
  beforeEach(() => AsyncStorage.clear());

  it('começa com lista vazia', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    expect(result.current.receitas).toEqual([]);
  });

  it('adiciona receita e persiste', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => { result.current.adicionar(receitaBase); });
    expect(result.current.receitas).toHaveLength(1);
    expect(result.current.receitas[0].nome).toBe('Frango Grelhado');
    expect(result.current.receitas[0].id).toBeDefined();
    expect(result.current.receitas[0].criadaEm).toBeDefined();
  });

  it('remove receita por id', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => { result.current.adicionar(receitaBase); });
    const id = result.current.receitas[0].id;
    await act(async () => { result.current.remover(id); });
    expect(result.current.receitas).toHaveLength(0);
  });

  it('edita receita existente', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => { result.current.adicionar(receitaBase); });
    const id = result.current.receitas[0].id;
    await act(async () => { result.current.editar(id, { nome: 'Frango Assado' }); });
    expect(result.current.receitas[0].nome).toBe('Frango Assado');
  });

  it('busca receitas por nome', async () => {
    const { result } = renderHook(() => useReceitas());
    await act(async () => {});
    await act(async () => {
      result.current.adicionar(receitaBase);
      result.current.adicionar({ ...receitaBase, nome: 'Macarrão', categoria: 'Massas' });
    });
    const encontradas = result.current.buscar('frango');
    expect(encontradas).toHaveLength(1);
    expect(encontradas[0].nome).toBe('Frango Grelhado');
  });
});
```

- [ ] **Step 2: Rodar teste e confirmar falha**

```bash
npm test -- useReceitas
```

Esperado: FAIL — `Cannot find module '../../hooks/useReceitas'`

- [ ] **Step 3: Implementar `hooks/useReceitas.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Receita } from '../types';

const STORAGE_KEY = '@receitas';

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useReceitas() {
  const [receitas, setReceitas] = useState<Receita[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) setReceitas(JSON.parse(json));
    });
  }, []);

  const salvar = useCallback(async (lista: Receita[]) => {
    setReceitas(lista);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }, []);

  const adicionar = useCallback(
    (dados: Omit<Receita, 'id' | 'criadaEm'>) => {
      const nova: Receita = { ...dados, id: gerarId(), criadaEm: new Date().toISOString() };
      setReceitas((prev) => {
        const lista = [...prev, nova];
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
        return lista;
      });
    },
    []
  );

  const remover = useCallback((id: string) => {
    setReceitas((prev) => {
      const lista = prev.filter((r) => r.id !== id);
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      return lista;
    });
  }, []);

  const editar = useCallback((id: string, dados: Partial<Receita>) => {
    setReceitas((prev) => {
      const lista = prev.map((r) => (r.id === id ? { ...r, ...dados } : r));
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      return lista;
    });
  }, []);

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

- [ ] **Step 4: Rodar teste e confirmar aprovação**

```bash
npm test -- useReceitas
```

Esperado: PASS — 5 testes passando.

- [ ] **Step 5: Commit**

```bash
git add hooks/useReceitas.ts __tests__/hooks/useReceitas.test.ts
git commit -m "feat: adicionar hook useReceitas com persistência em AsyncStorage"
```

---

## Task 4: Hook `useCardapio`

**Files:**
- Create: `hooks/useCardapio.ts`
- Test: `__tests__/hooks/useCardapio.test.ts`

- [ ] **Step 1: Escrever o teste**

Criar `__tests__/hooks/useCardapio.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCardapio } from '../../hooks/useCardapio';
import { Receita } from '../../types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const receita: Receita = {
  id: '1',
  nome: 'Frango',
  categoria: 'Carnes',
  tempoPreparo: 20,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [
    { nome: 'Frango', quantidade: 500, unidade: 'g' },
    { nome: 'Sal', quantidade: 1, unidade: 'pitada' },
  ],
  instrucoes: ['Grelhar'],
  criadaEm: '2026-01-01',
};

describe('useCardapio', () => {
  beforeEach(() => AsyncStorage.clear());

  it('começa com 7 dias todos nulos', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    expect(result.current.cardapio).toHaveLength(7);
    expect(result.current.cardapio.every((d) => d.receitaId === null)).toBe(true);
  });

  it('atribui receita a um dia', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.atribuir(1, '1'); });
    expect(result.current.cardapio[1].receitaId).toBe('1');
  });

  it('limpa o cardápio', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => { result.current.atribuir(0, '1'); });
    await act(async () => { result.current.limpar(); });
    expect(result.current.cardapio.every((d) => d.receitaId === null)).toBe(true);
  });

  it('gera lista de compras agrupando ingredientes iguais', async () => {
    const { result } = renderHook(() => useCardapio());
    await act(async () => {});
    await act(async () => {
      result.current.atribuir(0, '1');
      result.current.atribuir(1, '1');
    });
    const lista = result.current.gerarListaCompras([receita, receita]);
    const frango = lista.find((i) => i.nome === 'Frango');
    expect(frango?.quantidade).toBe(1000);
  });
});
```

- [ ] **Step 2: Rodar teste e confirmar falha**

```bash
npm test -- useCardapio
```

Esperado: FAIL

- [ ] **Step 3: Implementar `hooks/useCardapio.ts`**

```ts
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CardapioDia, ItemCompra, Receita } from '../types';

const STORAGE_KEY = '@cardapio';

const diasVazios = (): CardapioDia[] =>
  Array.from({ length: 7 }, (_, i) => ({ diaSemana: i as CardapioDia['diaSemana'], receitaId: null }));

export function useCardapio() {
  const [cardapio, setCardapio] = useState<CardapioDia[]>(diasVazios());

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((json) => {
      if (json) setCardapio(JSON.parse(json));
    });
  }, []);

  const salvarEAtualizar = useCallback((lista: CardapioDia[]) => {
    setCardapio(lista);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  }, []);

  const atribuir = useCallback(
    (diaSemana: number, receitaId: string | null) => {
      setCardapio((prev) => {
        const lista = prev.map((d) =>
          d.diaSemana === diaSemana ? { ...d, receitaId } : d
        );
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
        return lista;
      });
    },
    []
  );

  const limpar = useCallback(() => {
    const vazio = diasVazios();
    salvarEAtualizar(vazio);
  }, [salvarEAtualizar]);

  const gerarListaCompras = useCallback(
    (todasReceitas: Receita[]): ItemCompra[] => {
      const mapa = new Map<string, ItemCompra>();
      cardapio.forEach(({ receitaId }) => {
        if (!receitaId) return;
        const receita = todasReceitas.find((r) => r.id === receitaId);
        if (!receita) return;
        receita.ingredientes.forEach(({ nome, quantidade, unidade }) => {
          const chave = `${nome.toLowerCase()}|${unidade}`;
          if (mapa.has(chave)) {
            mapa.get(chave)!.quantidade += quantidade;
          } else {
            mapa.set(chave, { nome, quantidade, unidade, categoria: receita.categoria });
          }
        });
      });
      return Array.from(mapa.values());
    },
    [cardapio]
  );

  return { cardapio, atribuir, limpar, gerarListaCompras };
}
```

- [ ] **Step 4: Rodar todos os testes**

```bash
npm test
```

Esperado: PASS — todos os testes passando.

- [ ] **Step 5: Commit**

```bash
git add hooks/useCardapio.ts __tests__/hooks/useCardapio.test.ts
git commit -m "feat: adicionar hook useCardapio com geração de lista de compras"
```

---

## Task 5: Componentes UI base

**Files:**
- Create: `components/ui/AppText.tsx`
- Create: `components/ui/Button.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/Badge.tsx`
- Create: `components/ui/Input.tsx`

- [ ] **Step 1: Criar `components/ui/AppText.tsx`**

```tsx
import { Text, TextProps } from 'react-native';

type Variant = 'title' | 'heading' | 'body' | 'label' | 'muted';

const styles: Record<Variant, string> = {
  title: 'font-serif text-[28px] text-text leading-tight',
  heading: 'font-serif text-[20px] text-text leading-snug',
  body: 'font-sans text-[16px] text-text leading-relaxed',
  label: 'font-sans text-[13px] text-muted uppercase tracking-wide',
  muted: 'font-sans text-[14px] text-muted',
};

type Props = TextProps & { variant?: Variant };

export function AppText({ variant = 'body', className = '', ...props }: Props) {
  return <Text className={`${styles[variant]} ${className}`} {...props} />;
}
```

- [ ] **Step 2: Criar `components/ui/Button.tsx`**

```tsx
import { Pressable, PressableProps } from 'react-native';
import { AppText } from './AppText';

type Variant = 'primary' | 'secondary' | 'ghost';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  fullWidth?: boolean;
};

const base = 'rounded-card px-6 py-3 items-center justify-center';
const variants: Record<Variant, string> = {
  primary: 'bg-primary',
  secondary: 'bg-surface border border-border',
  ghost: 'bg-transparent',
};
const textVariants: Record<Variant, string> = {
  primary: 'text-white font-sans-bold',
  secondary: 'text-text font-sans-medium',
  ghost: 'text-primary font-sans-medium',
};

export function Button({ label, variant = 'primary', fullWidth, className = '', ...props }: Props) {
  return (
    <Pressable
      className={`${base} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      <AppText className={`text-[16px] ${textVariants[variant]}`}>{label}</AppText>
    </Pressable>
  );
}
```

- [ ] **Step 3: Criar `components/ui/Card.tsx`**

```tsx
import { View, ViewProps } from 'react-native';

type Props = ViewProps & { elevated?: boolean };

export function Card({ elevated = false, className = '', children, ...props }: Props) {
  return (
    <View
      className={`bg-surface rounded-card p-4 ${elevated ? 'shadow-sm' : ''} ${className}`}
      {...props}
    >
      {children}
    </View>
  );
}
```

- [ ] **Step 4: Criar `components/ui/Badge.tsx`**

```tsx
import { View } from 'react-native';
import { AppText } from './AppText';

type Variant = 'default' | 'accent' | 'primary';

const variants: Record<Variant, { bg: string; text: string }> = {
  default: { bg: 'bg-border', text: 'text-muted' },
  accent: { bg: 'bg-accent/20', text: 'text-accent' },
  primary: { bg: 'bg-primary/15', text: 'text-primary' },
};

type Props = { label: string; variant?: Variant };

export function Badge({ label, variant = 'default' }: Props) {
  const { bg, text } = variants[variant];
  return (
    <View className={`${bg} rounded-full px-3 py-1`}>
      <AppText className={`font-sans text-[12px] ${text}`}>{label}</AppText>
    </View>
  );
}
```

- [ ] **Step 5: Criar `components/ui/Input.tsx`**

```tsx
import { TextInput, TextInputProps, View } from 'react-native';
import { AppText } from './AppText';

type Props = TextInputProps & { label?: string };

export function Input({ label, className = '', ...props }: Props) {
  return (
    <View className="gap-1">
      {label && <AppText variant="label">{label}</AppText>}
      <TextInput
        className={`bg-surface border border-border rounded-card px-4 py-3 font-sans text-[16px] text-text ${className}`}
        placeholderTextColor="#8C7B6B"
        {...props}
      />
    </View>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add components/ui/
git commit -m "feat: adicionar componentes UI base (AppText, Button, Card, Badge, Input)"
```

---

## Task 6: Componente `ReceitaCard`

**Files:**
- Create: `components/ReceitaCard.tsx`
- Create: `components/CategoriaChip.tsx`

- [ ] **Step 1: Criar `components/CategoriaChip.tsx`**

```tsx
import { Pressable } from 'react-native';
import { AppText } from './ui/AppText';

type Props = {
  label: string;
  ativo: boolean;
  onPress: () => void;
};

export function CategoriaChip({ label, ativo, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={`px-4 py-2 rounded-full mr-2 ${ativo ? 'bg-primary' : 'bg-surface border border-border'}`}
    >
      <AppText className={`text-[14px] font-sans-medium ${ativo ? 'text-white' : 'text-text'}`}>
        {label}
      </AppText>
    </Pressable>
  );
}
```

- [ ] **Step 2: Criar `components/ReceitaCard.tsx`**

```tsx
import { Pressable, View, Image } from 'react-native';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';
import { Clock } from 'lucide-react-native';
import { Receita } from '../types';

type Props = {
  receita: Receita;
  onPress: () => void;
};

export function ReceitaCard({ receita, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface rounded-card overflow-hidden flex-1 mx-1 mb-3"
      style={{ shadowColor: '#2C1810', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 }}
    >
      <View className="aspect-[4/3] bg-border w-full">
        {receita.imagem ? (
          <Image source={{ uri: receita.imagem }} className="w-full h-full" resizeMode="cover" />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <AppText className="text-[32px]">🍽</AppText>
          </View>
        )}
      </View>
      <View className="p-3 gap-2">
        <AppText variant="heading" className="text-[16px]" numberOfLines={2}>
          {receita.nome}
        </AppText>
        <View className="flex-row items-center gap-1">
          <Clock size={12} color="#8C7B6B" />
          <AppText variant="muted" className="text-[12px]">{receita.tempoPreparo} min</AppText>
        </View>
        <Badge label={receita.dificuldade} variant={receita.dificuldade === 'Fácil' ? 'accent' : 'default'} />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ReceitaCard.tsx components/CategoriaChip.tsx
git commit -m "feat: adicionar ReceitaCard e CategoriaChip"
```

---

## Task 7: Navegação principal (Tab Bar)

**Files:**
- Create: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Criar `app/(tabs)/_layout.tsx`**

```tsx
import { Tabs } from 'expo-router';
import { UtensilsCrossed, CalendarDays, ShoppingCart } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#8B4513',
        tabBarInactiveTintColor: '#8C7B6B',
        tabBarStyle: {
          backgroundColor: '#FAF6F1',
          borderTopColor: '#D4C4B0',
          paddingBottom: 8,
          height: 60,
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
  );
}
```

- [ ] **Step 2: Criar placeholders para as outras abas**

Criar `app/(tabs)/cardapio.tsx`:
```tsx
import { View } from 'react-native';
import { AppText } from '../../components/ui/AppText';
export default function CardapioScreen() {
  return <View className="flex-1 bg-background items-center justify-center"><AppText>Cardápio</AppText></View>;
}
```

Criar `app/(tabs)/compras.tsx`:
```tsx
import { View } from 'react-native';
import { AppText } from '../../components/ui/AppText';
export default function ComprasScreen() {
  return <View className="flex-1 bg-background items-center justify-center"><AppText>Compras</AppText></View>;
}
```

- [ ] **Step 3: Testar navegação no simulador**

```bash
npx expo start
```

Verificar: tab bar aparece com 3 abas, cores corretas, navegação funciona.

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: adicionar navegação por tabs com ícones e cores do design system"
```

---

## Task 8: Tela Lista de Receitas

**Files:**
- Create: `app/(tabs)/index.tsx`

- [ ] **Step 1: Implementar `app/(tabs)/index.tsx`**

```tsx
import { View, FlatList, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useState, useMemo } from 'react';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { useReceitas } from '../../hooks/useReceitas';
import { ReceitaCard } from '../../components/ReceitaCard';
import { CategoriaChip } from '../../components/CategoriaChip';
import { Input } from '../../components/ui/Input';
import { AppText } from '../../components/ui/AppText';
import { CATEGORIAS } from '../../constants/categorias';

export default function ReceitasScreen() {
  const { receitas, buscar } = useReceitas();
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');

  const receitasFiltradas = useMemo(() => {
    const base = busca.trim() ? buscar(busca) : receitas;
    if (categoriaAtiva === 'Todas') return base;
    return base.filter((r) => r.categoria === categoriaAtiva);
  }, [receitas, busca, categoriaAtiva]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2 gap-4">
        <AppText variant="title">O que vamos cozinhar?</AppText>
        <Input
          placeholder="Buscar receitas..."
          value={busca}
          onChangeText={setBusca}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
          {CATEGORIAS.map((cat) => (
            <CategoriaChip
              key={cat}
              label={cat}
              ativo={categoriaAtiva === cat}
              onPress={() => setCategoriaAtiva(cat)}
            />
          ))}
        </ScrollView>
      </View>

      {receitasFiltradas.length === 0 ? (
        <View className="flex-1 items-center justify-center gap-2">
          <AppText className="text-[40px]">🍽</AppText>
          <AppText variant="muted">Nenhuma receita encontrada</AppText>
          <AppText variant="muted" className="text-[13px]">Toque no + para adicionar</AppText>
        </View>
      ) : (
        <FlatList
          data={receitasFiltradas}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: 12 }}
          renderItem={({ item }) => (
            <ReceitaCard
              receita={item}
              onPress={() => router.push(`/receita/${item.id}`)}
            />
          )}
        />
      )}

      <Pressable
        onPress={() => router.push('/receita/nova')}
        className="absolute bottom-6 right-6 bg-primary w-14 h-14 rounded-full items-center justify-center"
        style={{ shadowColor: '#8B4513', shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 }}
      >
        <Plus size={24} color="white" />
      </Pressable>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Testar no simulador**

Verificar: lista vazia mostra estado vazio, busca filtra, chips de categoria funcionam, FAB está visível.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat: implementar tela de lista de receitas com busca e filtros"
```

---

## Task 9: Tela Detalhes da Receita

**Files:**
- Create: `app/receita/[id]/index.tsx`
- Create: `components/IngredienteItem.tsx`
- Create: `components/InstrucaoItem.tsx`

- [ ] **Step 1: Criar `components/IngredienteItem.tsx`**

```tsx
import { View } from 'react-native';
import { AppText } from './ui/AppText';
import { Ingrediente } from '../types';

export function IngredienteItem({ ingrediente }: { ingrediente: Ingrediente }) {
  return (
    <View className="flex-row items-center py-3 border-b border-border">
      <View className="w-2 h-2 rounded-full bg-accent mr-3" />
      <AppText className="flex-1">{ingrediente.nome}</AppText>
      <AppText variant="muted">{ingrediente.quantidade} {ingrediente.unidade}</AppText>
    </View>
  );
}
```

- [ ] **Step 2: Criar `components/InstrucaoItem.tsx`**

```tsx
import { View } from 'react-native';
import { AppText } from './ui/AppText';

type Props = { numero: number; texto: string };

export function InstrucaoItem({ numero, texto }: Props) {
  return (
    <View className="flex-row gap-4 py-4 border-b border-border">
      <View className="w-8 h-8 rounded-full bg-primary items-center justify-center shrink-0">
        <AppText className="text-white font-sans-bold text-[14px]">{numero}</AppText>
      </View>
      <AppText className="flex-1 leading-relaxed">{texto}</AppText>
    </View>
  );
}
```

- [ ] **Step 3: Criar `app/receita/[id]/index.tsx`**

```tsx
import { View, ScrollView, Image, Pressable, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Edit2, Trash2, Clock, Users, ChefHat } from 'lucide-react-native';
import { useReceitas } from '../../../hooks/useReceitas';
import { AppText } from '../../../components/ui/AppText';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { IngredienteItem } from '../../../components/IngredienteItem';
import { InstrucaoItem } from '../../../components/InstrucaoItem';

export default function ReceitaDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receitas, remover } = useReceitas();
  const receita = receitas.find((r) => r.id === id);

  if (!receita) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <AppText variant="muted">Receita não encontrada</AppText>
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  function confirmarRemocao() {
    Alert.alert('Remover receita', `Deseja remover "${receita!.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: () => { remover(id); router.back(); },
      },
    ]);
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView>
        <View className="aspect-[4/3] w-full bg-border">
          {receita.imagem ? (
            <Image source={{ uri: receita.imagem }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="w-full h-full items-center justify-center bg-surface">
              <AppText className="text-[64px]">🍽</AppText>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(44,24,16,0.85)']}
            className="absolute bottom-0 left-0 right-0 h-32 justify-end p-4"
          >
            <AppText variant="title" className="text-white">{receita.nome}</AppText>
            <Badge label={receita.categoria} variant="accent" />
          </LinearGradient>
        </View>

        <View className="px-4 py-6 gap-6">
          <View className="flex-row justify-around">
            <View className="items-center gap-1">
              <Clock size={20} color="#8B4513" />
              <AppText variant="label">Tempo</AppText>
              <AppText className="font-sans-bold">{receita.tempoPreparo} min</AppText>
            </View>
            <View className="items-center gap-1">
              <Users size={20} color="#8B4513" />
              <AppText variant="label">Porções</AppText>
              <AppText className="font-sans-bold">{receita.porcoes}</AppText>
            </View>
            <View className="items-center gap-1">
              <ChefHat size={20} color="#8B4513" />
              <AppText variant="label">Dificuldade</AppText>
              <AppText className="font-sans-bold">{receita.dificuldade}</AppText>
            </View>
          </View>

          <View className="gap-2">
            <AppText variant="heading">Ingredientes</AppText>
            {receita.ingredientes.map((ing, i) => (
              <IngredienteItem key={i} ingrediente={ing} />
            ))}
          </View>

          <View className="gap-2">
            <AppText variant="heading">Modo de Preparo</AppText>
            {receita.instrucoes.map((inst, i) => (
              <InstrucaoItem key={i} numero={i + 1} texto={inst} />
            ))}
          </View>

          <View className="gap-3 pb-8">
            <Button label="Editar receita" variant="secondary" onPress={() => router.push(`/receita/${id}/editar`)} />
            <Button label="Remover receita" variant="ghost" onPress={confirmarRemocao} />
          </View>
        </View>
      </ScrollView>

      <SafeAreaView className="absolute top-0 left-0 right-0">
        <View className="flex-row justify-between px-4 pt-2">
          <Pressable onPress={() => router.back()} className="bg-black/30 rounded-full p-2">
            <ArrowLeft size={20} color="white" />
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}
```

- [ ] **Step 4: Testar no simulador**

Verificar: navegação da lista para detalhes, foto/placeholder, badges, ingredientes, instruções, botão de remover com confirmação.

- [ ] **Step 5: Commit**

```bash
git add app/receita/ components/IngredienteItem.tsx components/InstrucaoItem.tsx
git commit -m "feat: implementar tela de detalhes da receita"
```

---

## Task 10: Formulário de Criar/Editar Receita

**Files:**
- Create: `components/ReceitaForm.tsx`
- Create: `app/receita/nova.tsx`
- Create: `app/receita/[id]/editar.tsx`

- [ ] **Step 1: Criar `components/ReceitaForm.tsx`**

```tsx
import { View, ScrollView, Pressable, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { Receita, Ingrediente, Dificuldade } from '../types';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { AppText } from './ui/AppText';
import { CATEGORIAS } from '../constants/categorias';
import { CategoriaChip } from './CategoriaChip';

type FormData = Omit<Receita, 'id' | 'criadaEm'>;

type Props = {
  inicial?: FormData;
  onSalvar: (dados: FormData) => void;
  titulo: string;
};

const DIFICULDADES: Dificuldade[] = ['Fácil', 'Médio', 'Difícil'];

const formVazio = (): FormData => ({
  nome: '',
  categoria: 'Carnes',
  tempoPreparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [],
  instrucoes: [],
});

export function ReceitaForm({ inicial, onSalvar, titulo }: Props) {
  const [form, setForm] = useState<FormData>(inicial ?? formVazio());
  const [novoIng, setNovoIng] = useState({ nome: '', quantidade: '', unidade: '' });
  const [novaInst, setNovaInst] = useState('');

  function adicionarIngrediente() {
    if (!novoIng.nome || !novoIng.quantidade) return;
    const ing: Ingrediente = {
      nome: novoIng.nome,
      quantidade: parseFloat(novoIng.quantidade),
      unidade: novoIng.unidade || 'un',
    };
    setForm((f) => ({ ...f, ingredientes: [...f.ingredientes, ing] }));
    setNovoIng({ nome: '', quantidade: '', unidade: '' });
  }

  function removerIngrediente(index: number) {
    setForm((f) => ({ ...f, ingredientes: f.ingredientes.filter((_, i) => i !== index) }));
  }

  function adicionarInstrucao() {
    if (!novaInst.trim()) return;
    setForm((f) => ({ ...f, instrucoes: [...f.instrucoes, novaInst.trim()] }));
    setNovaInst('');
  }

  function removerInstrucao(index: number) {
    setForm((f) => ({ ...f, instrucoes: f.instrucoes.filter((_, i) => i !== index) }));
  }

  function salvar() {
    if (!form.nome.trim()) return;
    onSalvar(form);
    router.back();
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
        <AppText variant="heading">{titulo}</AppText>
        <Pressable onPress={() => router.back()}>
          <X size={22} color="#8C7B6B" />
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 16, gap: 20 }}>
        <Input label="Nome da receita" value={form.nome} onChangeText={(v) => setForm((f) => ({ ...f, nome: v }))} placeholder="Ex: Frango ao curry" />

        <View className="gap-2">
          <AppText variant="label">Categoria</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {CATEGORIAS.filter((c) => c !== 'Todas').map((cat) => (
              <CategoriaChip key={cat} label={cat} ativo={form.categoria === cat} onPress={() => setForm((f) => ({ ...f, categoria: cat }))} />
            ))}
          </ScrollView>
        </View>

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Input label="Tempo (min)" value={String(form.tempoPreparo)} onChangeText={(v) => setForm((f) => ({ ...f, tempoPreparo: parseInt(v) || 0 }))} keyboardType="numeric" />
          </View>
          <View className="flex-1">
            <Input label="Porções" value={String(form.porcoes)} onChangeText={(v) => setForm((f) => ({ ...f, porcoes: parseInt(v) || 1 }))} keyboardType="numeric" />
          </View>
        </View>

        <View className="gap-2">
          <AppText variant="label">Dificuldade</AppText>
          <View className="flex-row gap-2">
            {DIFICULDADES.map((d) => (
              <CategoriaChip key={d} label={d} ativo={form.dificuldade === d} onPress={() => setForm((f) => ({ ...f, dificuldade: d }))} />
            ))}
          </View>
        </View>

        <View className="gap-3">
          <AppText variant="heading" className="text-[18px]">Ingredientes</AppText>
          {form.ingredientes.map((ing, i) => (
            <View key={i} className="flex-row items-center gap-2 bg-surface rounded-card px-3 py-2">
              <AppText className="flex-1">{ing.nome}</AppText>
              <AppText variant="muted">{ing.quantidade} {ing.unidade}</AppText>
              <Pressable onPress={() => removerIngrediente(i)}>
                <Trash2 size={16} color="#8C7B6B" />
              </Pressable>
            </View>
          ))}
          <View className="gap-2">
            <View className="flex-row gap-2">
              <View className="flex-1"><Input placeholder="Nome" value={novoIng.nome} onChangeText={(v) => setNovoIng((n) => ({ ...n, nome: v }))} /></View>
              <View className="w-20"><Input placeholder="Qtd" value={novoIng.quantidade} onChangeText={(v) => setNovoIng((n) => ({ ...n, quantidade: v }))} keyboardType="numeric" /></View>
              <View className="w-20"><Input placeholder="Un" value={novoIng.unidade} onChangeText={(v) => setNovoIng((n) => ({ ...n, unidade: v }))} /></View>
            </View>
            <Button label="Adicionar ingrediente" variant="secondary" onPress={adicionarIngrediente} />
          </View>
        </View>

        <View className="gap-3">
          <AppText variant="heading" className="text-[18px]">Modo de Preparo</AppText>
          {form.instrucoes.map((inst, i) => (
            <View key={i} className="flex-row items-start gap-2 bg-surface rounded-card px-3 py-2">
              <AppText className="text-primary font-sans-bold w-5">{i + 1}.</AppText>
              <AppText className="flex-1">{inst}</AppText>
              <Pressable onPress={() => removerInstrucao(i)}>
                <Trash2 size={16} color="#8C7B6B" />
              </Pressable>
            </View>
          ))}
          <View className="gap-2">
            <Input placeholder="Descreva o passo..." value={novaInst} onChangeText={setNovaInst} multiline />
            <Button label="Adicionar passo" variant="secondary" onPress={adicionarInstrucao} />
          </View>
        </View>

        <View className="pb-8">
          <Button label="Salvar receita" onPress={salvar} fullWidth />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Criar `app/receita/nova.tsx`**

```tsx
import { useReceitas } from '../../hooks/useReceitas';
import { ReceitaForm } from '../../components/ReceitaForm';

export default function NovaReceitaScreen() {
  const { adicionar } = useReceitas();
  return <ReceitaForm titulo="Nova Receita" onSalvar={adicionar} />;
}
```

- [ ] **Step 3: Criar `app/receita/[id]/editar.tsx`**

```tsx
import { useLocalSearchParams } from 'expo-router';
import { useReceitas } from '../../../hooks/useReceitas';
import { ReceitaForm } from '../../../components/ReceitaForm';
import { View } from 'react-native';
import { AppText } from '../../../components/ui/AppText';

export default function EditarReceitaScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receitas, editar } = useReceitas();
  const receita = receitas.find((r) => r.id === id);

  if (!receita) return <View className="flex-1 bg-background items-center justify-center"><AppText>Não encontrada</AppText></View>;

  const { id: _, criadaEm: __, ...dadosIniciais } = receita;

  return (
    <ReceitaForm
      titulo="Editar Receita"
      inicial={dadosIniciais}
      onSalvar={(dados) => editar(id, dados)}
    />
  );
}
```

- [ ] **Step 4: Testar no simulador**

Verificar: criar receita via FAB → formulário abre como modal → preencher campos → salvar → aparece na lista. Editar receita a partir dos detalhes → dados pré-preenchidos → salvar atualiza.

- [ ] **Step 5: Commit**

```bash
git add components/ReceitaForm.tsx app/receita/
git commit -m "feat: implementar formulário de criação e edição de receitas"
```

---

## Task 11: Tela Cardápio Semanal

**Files:**
- Modify: `app/(tabs)/cardapio.tsx`

- [ ] **Step 1: Implementar `app/(tabs)/cardapio.tsx`**

```tsx
import { View, ScrollView, Pressable, Modal, FlatList, SafeAreaView } from 'react-native';
import { useState } from 'react';
import { Plus, X } from 'lucide-react-native';
import { useCardapio } from '../../hooks/useCardapio';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_COMPLETOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function CardapioScreen() {
  const { cardapio, atribuir, limpar } = useCardapio();
  const { receitas } = useReceitas();
  const [diaSelecionado, setDiaSelecionado] = useState<number | null>(null);

  function obterReceita(receitaId: string | null) {
    if (!receitaId) return null;
    return receitas.find((r) => r.id === receitaId) ?? null;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
        <AppText variant="title">Cardápio da Semana</AppText>
        <Pressable onPress={limpar}>
          <AppText variant="muted" className="text-[13px]">Limpar</AppText>
        </Pressable>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingVertical: 12, gap: 10 }}>
        {cardapio.map((dia) => {
          const receita = obterReceita(dia.receitaId);
          return (
            <Pressable key={dia.diaSemana} onPress={() => setDiaSelecionado(dia.diaSemana)}>
              <Card className="flex-row items-center gap-3">
                <View className="w-12 h-12 bg-primary/10 rounded-full items-center justify-center shrink-0">
                  <AppText className="font-sans-bold text-primary text-[13px]">{DIAS[dia.diaSemana]}</AppText>
                </View>
                <View className="flex-1">
                  {receita ? (
                    <>
                      <AppText variant="heading" className="text-[15px]">{receita.nome}</AppText>
                      <View className="flex-row gap-2 mt-1">
                        <Badge label={receita.categoria} />
                        <Badge label={`${receita.tempoPreparo} min`} />
                      </View>
                    </>
                  ) : (
                    <AppText variant="muted">Sem receita — toque para adicionar</AppText>
                  )}
                </View>
                <Plus size={18} color="#8C7B6B" />
              </Card>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal visible={diaSelecionado !== null} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
            <AppText variant="heading">
              {diaSelecionado !== null ? DIAS_COMPLETOS[diaSelecionado] : ''}
            </AppText>
            <Pressable onPress={() => setDiaSelecionado(null)}>
              <X size={22} color="#8C7B6B" />
            </Pressable>
          </View>

          {diaSelecionado !== null && (
            <Pressable
              className="mx-4 mt-3 mb-1"
              onPress={() => { atribuir(diaSelecionado, null); setDiaSelecionado(null); }}
            >
              <AppText variant="muted" className="text-center py-2">Remover receita do dia</AppText>
            </Pressable>
          )}

          <FlatList
            data={receitas}
            keyExtractor={(r) => r.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  if (diaSelecionado !== null) {
                    atribuir(diaSelecionado, item.id);
                    setDiaSelecionado(null);
                  }
                }}
              >
                <Card className="flex-row items-center gap-3">
                  <View className="flex-1">
                    <AppText variant="heading" className="text-[15px]">{item.nome}</AppText>
                    <AppText variant="muted" className="text-[13px]">{item.tempoPreparo} min · {item.porcoes} porções</AppText>
                  </View>
                  <Badge label={item.categoria} />
                </Card>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Testar no simulador**

Verificar: 7 dias exibidos, tap abre modal com lista de receitas, seleção atribui ao dia, botão limpar reseta tudo.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/cardapio.tsx
git commit -m "feat: implementar tela de cardápio semanal"
```

---

## Task 12: Tela Lista de Compras

**Files:**
- Modify: `app/(tabs)/compras.tsx`

- [ ] **Step 1: Implementar `app/(tabs)/compras.tsx`**

```tsx
import { View, FlatList, Pressable, SafeAreaView } from 'react-native';
import { useState, useMemo } from 'react';
import { Check } from 'lucide-react-native';
import { useCardapio } from '../../hooks/useCardapio';
import { useReceitas } from '../../hooks/useReceitas';
import { AppText } from '../../components/ui/AppText';
import { Button } from '../../components/ui/Button';
import { ItemCompra } from '../../types';

export default function ComprasScreen() {
  const { receitas } = useReceitas();
  const { gerarListaCompras } = useCardapio();
  const [marcados, setMarcados] = useState<Set<string>>(new Set());

  const itens = useMemo(() => gerarListaCompras(receitas), [receitas, gerarListaCompras]);

  const itensPorCategoria = useMemo(() => {
    const mapa = new Map<string, ItemCompra[]>();
    itens.forEach((item) => {
      const lista = mapa.get(item.categoria) ?? [];
      lista.push(item);
      mapa.set(item.categoria, lista);
    });
    return Array.from(mapa.entries());
  }, [itens]);

  function toggleMarcado(chave: string) {
    setMarcados((prev) => {
      const novo = new Set(prev);
      novo.has(chave) ? novo.delete(chave) : novo.add(chave);
      return novo;
    });
  }

  function limpar() {
    setMarcados(new Set());
  }

  if (itens.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center gap-3 px-8">
        <AppText className="text-[48px]">🛒</AppText>
        <AppText variant="heading" className="text-center">Lista vazia</AppText>
        <AppText variant="muted" className="text-center">Adicione receitas ao cardápio semanal para gerar sua lista de compras automaticamente.</AppText>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2 flex-row justify-between items-center">
        <AppText variant="title">Lista de Compras</AppText>
        {marcados.size > 0 && (
          <Pressable onPress={limpar}>
            <AppText variant="muted" className="text-[13px]">Limpar marcados</AppText>
          </Pressable>
        )}
      </View>

      <FlatList
        data={itensPorCategoria}
        keyExtractor={([cat]) => cat}
        contentContainerStyle={{ padding: 16, gap: 16 }}
        renderItem={({ item: [categoria, categoriaItens] }) => (
          <View className="gap-2">
            <AppText variant="label">{categoria}</AppText>
            {categoriaItens.map((item) => {
              const chave = `${item.nome}|${item.unidade}`;
              const marcado = marcados.has(chave);
              return (
                <Pressable
                  key={chave}
                  onPress={() => toggleMarcado(chave)}
                  className={`flex-row items-center gap-3 bg-surface rounded-card px-4 py-3 ${marcado ? 'opacity-50' : ''}`}
                >
                  <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${marcado ? 'bg-accent border-accent' : 'border-border'}`}>
                    {marcado && <Check size={14} color="white" />}
                  </View>
                  <AppText className={`flex-1 ${marcado ? 'line-through text-muted' : ''}`}>{item.nome}</AppText>
                  <AppText variant="muted">{item.quantidade} {item.unidade}</AppText>
                </Pressable>
              );
            })}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
```

- [ ] **Step 2: Testar no simulador**

Verificar: lista vazia sem cardápio configurado, itens agrupados por categoria quando cardápio tem receitas, checkbox risca o item, limpar desmarca todos.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/compras.tsx
git commit -m "feat: implementar tela de lista de compras com agrupamento por categoria"
```

---

## Self-Review

### Spec Coverage
- ✅ Stack: Expo + NativeWind + Expo Router + Reanimated + AsyncStorage + Lucide
- ✅ Paleta: tokens definidos em tailwind.config.js
- ✅ Tipografia: Playfair Display + Inter
- ✅ Tela lista de receitas: busca, filtros por categoria, grid 2 colunas, FAB
- ✅ Tela detalhes: foto, badges, ingredientes, instruções, botão editar/remover
- ✅ Tela criar/editar: formulário por seções, ingredientes, instruções
- ✅ Cardápio semanal: 7 dias, bottom sheet, atribuir/limpar
- ✅ Lista de compras: gerada pelo cardápio, agrupada, checkbox
- ✅ Hooks isolados: useReceitas e useCardapio com contratos públicos estáveis

### Tipos consistentes
- `Receita`, `CardapioDia`, `ItemCompra`, `Ingrediente`, `Dificuldade` definidos em `types/index.ts` e usados consistentemente em todos os hooks e componentes.
- `gerarListaCompras` recebe `Receita[]` e retorna `ItemCompra[]` — consistente entre hook, teste e tela.
