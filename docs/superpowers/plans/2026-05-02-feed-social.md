# Feed Social Sprint 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar Feed Social Sprint 1: aba Feed com scroll snap, salvar receitas (cópia independente), toggle publicar/privada e perfil público de criadores.

**Architecture:** Nova aba Feed (posição 2: Receitas · Feed · Cardápio · Compras) com `FlatList` paginada e snap scroll. Três novos hooks (`useFeed`, `useSalvarReceita`, `usePublicar`). Receitas públicas por padrão (`publica = true`). Perfil público em rota `/perfil/[id]`.

**Tech Stack:** Expo Router, React Native, Supabase JS v2, NativeWind, TypeScript, Jest + `@testing-library/react-native`.

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| Create | `supabase/migrations/002_feed_social.sql` |
| Modify | `types/index.ts` |
| Modify | `lib/__mocks__/supabase.ts` |
| Create | `__tests__/hooks/useFeed.test.ts` |
| Create | `hooks/useFeed.ts` |
| Create | `__tests__/hooks/useSalvarReceita.test.ts` |
| Create | `hooks/useSalvarReceita.ts` |
| Create | `__tests__/hooks/usePublicar.test.ts` |
| Create | `hooks/usePublicar.ts` |
| Create | `components/FeedCard.tsx` |
| Create | `components/PerfilPublico.tsx` |
| Create | `app/(tabs)/feed.tsx` |
| Modify | `app/(tabs)/_layout.tsx` |
| Create | `app/perfil/[id].tsx` |
| Modify | `app/_layout.tsx` |
| Modify | `app/receita/[id]/index.tsx` |
| Modify | `hooks/useReceitas.ts` |
| Modify | `components/ReceitaForm.tsx` |

---

## Tarefas

### Task 1: Schema Migration

**Files:**
- Create: `supabase/migrations/002_feed_social.sql`

- [ ] **Step 1: Criar arquivo de migração**

```sql
-- supabase/migrations/002_feed_social.sql

-- Receitas públicas por padrão
ALTER TABLE public.receitas ALTER COLUMN publica SET DEFAULT true;

-- Rastreamento de origem nas cópias
ALTER TABLE public.receitas
  ADD COLUMN fonte_receita_id uuid REFERENCES public.receitas(id) ON DELETE SET NULL,
  ADD COLUMN fonte_atualizada_em timestamptz;

-- Contador denormalizado no perfil do criador
ALTER TABLE public.profiles
  ADD COLUMN total_importacoes int DEFAULT 0 NOT NULL;

-- Perfil público: leitura aberta para autenticados
CREATE POLICY "Perfil público leitura" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Função para incrementar total_importacoes com segurança
CREATE OR REPLACE FUNCTION public.incrementar_importacoes(perfil_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles
  SET total_importacoes = total_importacoes + 1
  WHERE id = perfil_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 2: Aplicar migração no Supabase**

No Supabase Studio (SQL Editor) ou via CLI:
```bash
supabase db push
# ou copiar o conteúdo do arquivo e executar no SQL Editor do Supabase Studio
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_feed_social.sql
git commit -m "feat: migration feed social — colunas fonte, total_importacoes, perfil público"
```

---

### Task 2: Types + Supabase Mock

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/__mocks__/supabase.ts`

- [ ] **Step 1: Atualizar `types/index.ts`**

```typescript
export type Dificuldade = 'Fácil' | 'Médio' | 'Difícil';

export type Instrucao = {
  texto: string;
  imagem?: string;
};

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
  categorias: string[];
  imagem?: string;
  tempoPreparo: number;
  porcoes: number;
  dificuldade: Dificuldade;
  ingredientes: Ingrediente[];
  instrucoes: Instrucao[];
  publica?: boolean;
  criadaEm: string;
  atualizadaEm?: string;
  fonte_receita_id?: string;
  fonte_atualizada_em?: string;
  _pendingSync?: boolean;
};

export type Criador = {
  id: string;
  nome: string;
  foto_url?: string;
  total_importacoes: number;
};

export type ReceitaFeed = {
  id: string;
  user_id: string;
  nome: string;
  categorias: string[];
  imagem?: string;
  tempoPreparo: number;
  porcoes: number;
  dificuldade: Dificuldade;
  criada_em: string;
  criador: Criador;
};

export type Profile = {
  id: string;
  nome: string;
  foto_url?: string;
  criado_em: string;
  total_importacoes?: number;
};

export type PeriodoPlanejamento = 'semanal' | 'quinzenal' | 'mensal';

export type DiaPorcao = {
  dia: number;
  porcoes: number;
};

export type PlanoReceita = {
  receitaId: string;
  batches: number;
  dias?: DiaPorcao[];
};

export type Plano = {
  periodo: PeriodoPlanejamento;
  receitas: PlanoReceita[];
};

export type ItemCompra = {
  nome: string;
  quantidade: number;
  unidade: string;
  receitas: string[];
};
```

- [ ] **Step 2: Atualizar `lib/__mocks__/supabase.ts`**

Adicionar `order`, `range`, `neq`, `not`, `is`, `rpc` ao mock:

```typescript
const mockChain = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  not: jest.fn().mockReturnThis(),
  is: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  range: jest.fn().mockResolvedValue({ data: [], error: null }),
  single: jest.fn().mockResolvedValue({ data: null, error: null }),
  update: jest.fn().mockReturnThis(),
  insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  upsert: jest.fn().mockResolvedValue({ data: null, error: null }),
  delete: jest.fn().mockReturnThis(),
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
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  storage: {
    from: jest.fn(() => ({ ...mockStorageChain })),
  },
};
```

- [ ] **Step 3: Rodar testes existentes para garantir compatibilidade**

```bash
npx jest --no-coverage
```

Expected: todos os testes existentes passam (30+).

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/__mocks__/supabase.ts
git commit -m "feat: tipos ReceitaFeed e Criador; atualizar mock Supabase com order/range/neq/rpc"
```

---

### Task 3: `hooks/useFeed.ts` (TDD)

**Files:**
- Create: `__tests__/hooks/useFeed.test.ts`
- Create: `hooks/useFeed.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/hooks/useFeed.test.ts`:

```typescript
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
  profiles: {
    id: 'user-2',
    nome: 'Maria',
    foto_url: null,
    total_importacoes: 5,
  },
};

function setupFeedMock(data: any[], error: any = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockResolvedValue({ data, error }),
  };
  (supabase.from as jest.Mock).mockReturnValue(chain);
  return chain;
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
```

- [ ] **Step 2: Rodar teste para confirmar falha**

```bash
npx jest __tests__/hooks/useFeed.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../hooks/useFeed'"

- [ ] **Step 3: Implementar `hooks/useFeed.ts`**

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { ReceitaFeed } from '../types';

const PAGE_SIZE = 10;

function calcularScore(criadaEm: string, totalImportacoes: number): number {
  const dias = (Date.now() - new Date(criadaEm).getTime()) / (1000 * 60 * 60 * 24);
  return 1 / (dias + 1) + totalImportacoes * 0.1;
}

export function useFeed() {
  const { user } = useAuth();
  const [receitas, setReceitas] = useState<ReceitaFeed[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [temMais, setTemMais] = useState(true);

  const carregar = useCallback(
    async (reset: boolean) => {
      if (!user || loading) return;
      setLoading(true);

      const offset = reset ? 0 : cursor;

      const { data, error } = await supabase
        .from('receitas')
        .select(
          'id, nome, categorias, imagem, tempo_preparo, porcoes, dificuldade, criada_em, user_id, profiles!inner(id, nome, foto_url, total_importacoes)'
        )
        .eq('publica', true)
        .neq('user_id', user.id)
        .order('criada_em', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (!error && data) {
        const mapeadas: ReceitaFeed[] = (data as any[])
          .map((r) => ({
            id: r.id,
            user_id: r.user_id,
            nome: r.nome,
            categorias: Array.isArray(r.categorias) ? r.categorias : [],
            imagem: r.imagem ?? undefined,
            tempoPreparo: r.tempo_preparo,
            porcoes: r.porcoes,
            dificuldade: r.dificuldade,
            criada_em: r.criada_em,
            criador: {
              id: r.profiles.id,
              nome: r.profiles.nome,
              foto_url: r.profiles.foto_url ?? undefined,
              total_importacoes: r.profiles.total_importacoes ?? 0,
            },
          }))
          .sort(
            (a, b) =>
              calcularScore(b.criada_em, b.criador.total_importacoes) -
              calcularScore(a.criada_em, a.criador.total_importacoes)
          );

        if (reset) {
          setReceitas(mapeadas);
        } else {
          setReceitas((prev) => [...prev, ...mapeadas]);
        }
        setCursor(offset + data.length);
        setTemMais(data.length === PAGE_SIZE);
      }

      setLoading(false);
    },
    [user, cursor, loading]
  );

  const recarregar = useCallback(() => carregar(true), [carregar]);
  const carregarMais = useCallback(() => carregar(false), [carregar]);

  return { receitas, loading, temMais, recarregar, carregarMais };
}
```

- [ ] **Step 4: Rodar teste para confirmar passa**

```bash
npx jest __tests__/hooks/useFeed.test.ts --no-coverage
```

Expected: 6 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add hooks/useFeed.ts __tests__/hooks/useFeed.test.ts
git commit -m "feat: hook useFeed com paginação e ordenação híbrida"
```

---

### Task 4: `hooks/useSalvarReceita.ts` (TDD)

**Files:**
- Create: `__tests__/hooks/useSalvarReceita.test.ts`
- Create: `hooks/useSalvarReceita.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/hooks/useSalvarReceita.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { useSalvarReceita } from '../../hooks/useSalvarReceita';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const receitaOriginalRaw = {
  id: 'rec-original',
  nome: 'Macarrão ao Sugo',
  categorias: ['Massas'],
  imagem: null,
  tempo_preparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  instrucoes: [{ texto: 'Cozinhar o macarrão' }],
  atualizada_em: '2026-05-01T00:00:00Z',
  ingredientes: [{ nome: 'Macarrão', quantidade: '200', unidade: 'g' }],
};

function setupSalvarMock(fetchData: any, insertError: any = null) {
  const fetchChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: fetchData, error: null }),
  };
  const insertChain = {
    insert: jest.fn().mockResolvedValue({ data: null, error: insertError }),
  };
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'ingredientes') return insertChain;
    return fetchChain;
  });
  (supabase.rpc as jest.Mock).mockResolvedValue({ data: null, error: null });
  return { fetchChain, insertChain };
}

describe('useSalvarReceita', () => {
  beforeEach(() => jest.clearAllMocks());

  it('começa com salvando false', () => {
    const { result } = renderHook(() => useSalvarReceita());
    expect(result.current.salvando).toBe(false);
  });

  it('salvar retorna true ao salvar com sucesso', async () => {
    const { fetchChain } = setupSalvarMock(receitaOriginalRaw);
    fetchChain.insert = jest.fn().mockResolvedValue({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    let ok: boolean = false;
    await act(async () => {
      ok = await result.current.salvar('rec-original', 'user-2');
    });

    expect(ok).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith('receitas');
  });

  it('salvar copia ingredientes da receita original', async () => {
    const insertIngMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: receitaOriginalRaw, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: insertIngMock };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    await act(async () => { await result.current.salvar('rec-original', 'user-2'); });

    expect(insertIngMock).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ nome: 'Macarrão' })])
    );
  });

  it('salvar chama rpc incrementar_importacoes ao salvar com sucesso', async () => {
    const fetchChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: receitaOriginalRaw, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'ingredientes') return { insert: jest.fn().mockResolvedValue({ data: null, error: null }) };
      return fetchChain;
    });

    const { result } = renderHook(() => useSalvarReceita());
    await act(async () => { await result.current.salvar('rec-original', 'user-2'); });

    expect(supabase.rpc).toHaveBeenCalledWith('incrementar_importacoes', { perfil_id: 'user-2' });
  });

  it('salvar retorna false se fetch da original falhar', async () => {
    const errorChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };
    (supabase.from as jest.Mock).mockReturnValue(errorChain);

    const { result } = renderHook(() => useSalvarReceita());
    let ok = true;
    await act(async () => { ok = await result.current.salvar('rec-inexistente', 'user-2'); });
    expect(ok).toBe(false);
  });
});
```

- [ ] **Step 2: Rodar teste para confirmar falha**

```bash
npx jest __tests__/hooks/useSalvarReceita.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../hooks/useSalvarReceita'"

- [ ] **Step 3: Implementar `hooks/useSalvarReceita.ts`**

```typescript
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function useSalvarReceita() {
  const { user } = useAuth();
  const [salvando, setSalvando] = useState(false);

  const salvar = useCallback(
    async (receitaId: string, criadorId: string): Promise<boolean> => {
      if (!user) return false;
      setSalvando(true);

      const { data: original, error: fetchError } = await supabase
        .from('receitas')
        .select('*, ingredientes(*)')
        .eq('id', receitaId)
        .single();

      if (fetchError || !original) {
        setSalvando(false);
        return false;
      }

      const agora = new Date().toISOString();
      const novoId = gerarId();

      const { error: insertError } = await supabase.from('receitas').insert({
        id: novoId,
        user_id: user.id,
        nome: original.nome,
        categorias: original.categorias,
        imagem: original.imagem,
        tempo_preparo: original.tempo_preparo,
        porcoes: original.porcoes,
        dificuldade: original.dificuldade,
        instrucoes: original.instrucoes ?? [],
        publica: true,
        fonte_receita_id: receitaId,
        fonte_atualizada_em: original.atualizada_em,
        criada_em: agora,
        atualizada_em: agora,
      });

      if (!insertError && original.ingredientes?.length > 0) {
        await supabase.from('ingredientes').insert(
          original.ingredientes.map((i: any) => ({
            receita_id: novoId,
            nome: i.nome,
            quantidade: i.quantidade,
            unidade: i.unidade,
          }))
        );
      }

      if (!insertError) {
        await supabase.rpc('incrementar_importacoes', { perfil_id: criadorId });
      }

      setSalvando(false);
      return !insertError;
    },
    [user]
  );

  return { salvar, salvando };
}
```

- [ ] **Step 4: Rodar teste para confirmar passa**

```bash
npx jest __tests__/hooks/useSalvarReceita.test.ts --no-coverage
```

Expected: 5 passed, 0 failed.

- [ ] **Step 5: Commit**

```bash
git add hooks/useSalvarReceita.ts __tests__/hooks/useSalvarReceita.test.ts
git commit -m "feat: hook useSalvarReceita — copia receita com ingredientes e rastreia origem"
```

---

### Task 5: `hooks/usePublicar.ts` (TDD)

**Files:**
- Create: `__tests__/hooks/usePublicar.test.ts`
- Create: `hooks/usePublicar.ts`

- [ ] **Step 1: Escrever teste falhando**

Criar `__tests__/hooks/usePublicar.test.ts`:

```typescript
import { renderHook, act } from '@testing-library/react-native';
import { usePublicar } from '../../hooks/usePublicar';
import { supabase } from '../../lib/supabase';

jest.mock('../../lib/supabase');
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

function setupUpdateMock(error: any = null) {
  const chain = {
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    then: undefined as any,
  };
  // Terminal: segundo .eq() resolve
  let callCount = 0;
  chain.eq = jest.fn().mockImplementation(() => {
    callCount++;
    if (callCount >= 2) return Promise.resolve({ data: null, error });
    return chain;
  });
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
```

- [ ] **Step 2: Rodar teste para confirmar falha**

```bash
npx jest __tests__/hooks/usePublicar.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../../hooks/usePublicar'"

- [ ] **Step 3: Implementar `hooks/usePublicar.ts`**

```typescript
import { useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export function usePublicar() {
  const { user } = useAuth();

  const togglePublicar = useCallback(
    async (receitaId: string, publicaAtual: boolean): Promise<boolean> => {
      if (!user) return false;

      const { error } = await supabase
        .from('receitas')
        .update({ publica: !publicaAtual, atualizada_em: new Date().toISOString() })
        .eq('id', receitaId)
        .eq('user_id', user.id);

      return !error;
    },
    [user]
  );

  return { togglePublicar };
}
```

- [ ] **Step 4: Rodar teste para confirmar passa**

```bash
npx jest __tests__/hooks/usePublicar.test.ts --no-coverage
```

Expected: 3 passed, 0 failed.

- [ ] **Step 5: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: todos passam.

- [ ] **Step 6: Commit**

```bash
git add hooks/usePublicar.ts __tests__/hooks/usePublicar.test.ts
git commit -m "feat: hook usePublicar — toggle publica/privada em receita própria"
```

---

### Task 6: Componentes `FeedCard.tsx` e `PerfilPublico.tsx`

**Files:**
- Create: `components/FeedCard.tsx`
- Create: `components/PerfilPublico.tsx`

- [ ] **Step 1: Criar `components/FeedCard.tsx`**

Layout A: imagem ~60% superior, área branca inferior com criador, nome, metadados e botão salvar.

```tsx
import { View, Image, Pressable } from 'react-native';
import { Clock, Users } from 'lucide-react-native';
import { ReceitaFeed } from '../types';
import { AppText } from './ui/AppText';
import { Badge } from './ui/Badge';

type Props = {
  receita: ReceitaFeed;
  altura: number;
  onSalvar: () => void;
  onVerPerfil: (userId: string) => void;
  salvada: boolean;
};

export function FeedCard({ receita, altura, onSalvar, onVerPerfil, salvada }: Props) {
  const iniciais = receita.criador.nome
    .trim()
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ height: altura }}>
      {/* Imagem: ~60% superior */}
      <View style={{ flex: 6, backgroundColor: '#E8DDD4', position: 'relative' }}>
        {receita.imagem ? (
          <Image
            source={{ uri: receita.imagem }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <AppText style={{ fontSize: 72 }}>🍽</AppText>
          </View>
        )}

        {/* Nome do criador — canto superior esquerdo */}
        <Pressable
          onPress={() => onVerPerfil(receita.user_id)}
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {receita.criador.foto_url ? (
            <Image
              source={{ uri: receita.criador.foto_url }}
              style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'white' }}
            />
          ) : (
            <View
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: '#8B4513',
                borderWidth: 2,
                borderColor: 'white',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 10, color: 'white', fontWeight: '700' }}>{iniciais}</AppText>
            </View>
          )}
          <AppText
            style={{
              fontSize: 13,
              color: 'white',
              fontWeight: '600',
              textShadowColor: 'rgba(0,0,0,0.6)',
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 3,
            }}
          >
            {receita.criador.nome}
          </AppText>
        </Pressable>
      </View>

      {/* Área branca inferior: ~40% */}
      <View style={{ flex: 4, backgroundColor: 'white', padding: 16, gap: 8 }}>
        <AppText
          variant="heading"
          style={{ fontSize: 20, lineHeight: 26 }}
          numberOfLines={2}
        >
          {receita.nome}
        </AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Clock size={14} color="#8C7B6B" />
            <AppText variant="muted" style={{ fontSize: 13 }}>{receita.tempoPreparo} min</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users size={14} color="#8C7B6B" />
            <AppText variant="muted" style={{ fontSize: 13 }}>{receita.porcoes} porções</AppText>
          </View>
          <Badge
            label={receita.dificuldade}
            variant={receita.dificuldade === 'Fácil' ? 'accent' : 'default'}
          />
        </View>

        <Pressable
          onPress={salvada ? undefined : onSalvar}
          style={{
            backgroundColor: salvada ? '#E8DDD4' : '#8B4513',
            borderRadius: 8,
            paddingVertical: 14,
            alignItems: 'center',
            marginTop: 'auto' as any,
          }}
        >
          <AppText
            style={{
              color: salvada ? '#8C7B6B' : 'white',
              fontWeight: '600',
              fontSize: 15,
            }}
          >
            {salvada ? '✓ Salva nas suas receitas' : '+ Salvar nas minhas receitas'}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}
```

- [ ] **Step 2: Criar `components/PerfilPublico.tsx`**

Header de perfil público: foto/avatar, nome, contadores.

```tsx
import { View, Image } from 'react-native';
import { AppText } from './ui/AppText';

type Props = {
  nome: string;
  foto_url?: string;
  totalReceitas: number;
  totalImportacoes: number;
};

export function PerfilPublico({ nome, foto_url, totalReceitas, totalImportacoes }: Props) {
  const iniciais = nome
    .trim()
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 }}>
      {foto_url ? (
        <Image
          source={{ uri: foto_url }}
          style={{ width: 88, height: 88, borderRadius: 44 }}
        />
      ) : (
        <View
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            backgroundColor: '#E8DDD4',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText style={{ fontSize: 28, color: '#8B4513', fontWeight: '700' }}>{iniciais}</AppText>
        </View>
      )}

      <AppText variant="title" style={{ marginTop: 12, fontSize: 22 }}>{nome}</AppText>

      <View style={{ flexDirection: 'row', gap: 48, marginTop: 16 }}>
        <View style={{ alignItems: 'center' }}>
          <AppText style={{ fontSize: 22, fontWeight: '700', color: '#8B4513' }}>
            {totalReceitas}
          </AppText>
          <AppText variant="muted" style={{ fontSize: 12 }}>receitas</AppText>
        </View>
        <View style={{ alignItems: 'center' }}>
          <AppText style={{ fontSize: 22, fontWeight: '700', color: '#8B4513' }}>
            {totalImportacoes}
          </AppText>
          <AppText variant="muted" style={{ fontSize: 12 }}>importações</AppText>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/FeedCard.tsx components/PerfilPublico.tsx
git commit -m "feat: componentes FeedCard e PerfilPublico"
```

---

### Task 7: Tela Feed + Aba no Tab Layout

**Files:**
- Create: `app/(tabs)/feed.tsx`
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Criar `app/(tabs)/feed.tsx`**

```tsx
import { View, FlatList, ActivityIndicator } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useFeed } from '../../hooks/useFeed';
import { useSalvarReceita } from '../../hooks/useSalvarReceita';
import { FeedCard } from '../../components/FeedCard';
import { AppText } from '../../components/ui/AppText';

export default function FeedScreen() {
  const { receitas, loading, temMais, recarregar, carregarMais } = useFeed();
  const { salvar, salvando } = useSalvarReceita();
  const [itemHeight, setItemHeight] = useState(0);
  const [salvas, setSalvas] = useState<Set<string>>(new Set());

  useFocusEffect(useCallback(() => { recarregar(); }, []));

  async function handleSalvar(receitaId: string, criadorId: string) {
    if (salvando || salvas.has(receitaId)) return;
    const ok = await salvar(receitaId, criadorId);
    if (ok) setSalvas((prev) => new Set(prev).add(receitaId));
  }

  return (
    <View
      style={{ flex: 1, backgroundColor: '#FAF6F1' }}
      onLayout={(e) => setItemHeight(e.nativeEvent.layout.height)}
    >
      {itemHeight > 0 && (
        <FlatList
          data={receitas}
          keyExtractor={(item) => item.id}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          onEndReached={temMais ? carregarMais : undefined}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            loading ? (
              <View style={{ height: itemHeight, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color="#8B4513" />
              </View>
            ) : (
              <View style={{ height: itemHeight, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
                <AppText style={{ fontSize: 48, marginBottom: 16 }}>🍽</AppText>
                <AppText variant="heading" style={{ textAlign: 'center' }}>Feed vazio</AppText>
                <AppText variant="muted" style={{ textAlign: 'center', marginTop: 8 }}>
                  Nenhuma receita pública de outros usuários ainda.
                </AppText>
              </View>
            )
          }
          renderItem={({ item }) => (
            <FeedCard
              receita={item}
              altura={itemHeight}
              onSalvar={() => handleSalvar(item.id, item.user_id)}
              onVerPerfil={(userId) => router.push(`/perfil/${userId}`)}
              salvada={salvas.has(item.id)}
            />
          )}
        />
      )}
    </View>
  );
}
```

- [ ] **Step 2: Atualizar `app/(tabs)/_layout.tsx`**

Adicionar aba Feed na posição 2 (Receitas · Feed · Cardápio · Compras). Importar ícone `Rss` do lucide-react-native.

Substituir o conteúdo de `app/(tabs)/_layout.tsx`:

```tsx
import { View, Pressable } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { useState, useEffect } from 'react';
import { Menu, UtensilsCrossed, Rss, CalendarDays, ShoppingCart } from 'lucide-react-native';
import { Drawer } from '../../components/Drawer';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';

export default function TabLayout() {
  const [drawerVisible, setDrawerVisible] = useState(false);
  const { user } = useAuth();
  const { profile, refreshProfile } = useProfile();
  const pathname = usePathname();

  useEffect(() => {
    refreshProfile();
  }, [pathname]);

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
          name="feed"
          options={{
            title: 'Feed',
            tabBarIcon: ({ color }) => <Rss size={22} color={color} />,
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

- [ ] **Step 3: Rodar app e verificar aba Feed aparece na posição 2**

```bash
npx expo start
```

Verificar: Receitas · Feed · Cardápio · Compras. Tocar em Feed → tela carrega sem crash.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/feed.tsx app/(tabs)/_layout.tsx
git commit -m "feat: aba Feed com scroll snap e FeedCard"
```

---

### Task 8: Tela Perfil Público

**Files:**
- Create: `app/perfil/[id].tsx`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Criar `app/perfil/[id].tsx`**

```tsx
import { View, FlatList, Image, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { PerfilPublico } from '../../components/PerfilPublico';
import { AppText } from '../../components/ui/AppText';
import { Profile, ReceitaFeed } from '../../types';

export default function PerfilPublicoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [receitas, setReceitas] = useState<ReceitaFeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      setLoading(true);

      const [{ data: profileData }, { data: receitasData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).single(),
        supabase
          .from('receitas')
          .select('id, nome, categorias, imagem, tempo_preparo, porcoes, dificuldade, criada_em, user_id')
          .eq('user_id', id)
          .eq('publica', true)
          .order('criada_em', { ascending: false }),
      ]);

      if (profileData) setProfile(profileData);
      if (receitasData) {
        setReceitas(
          receitasData.map((r: any) => ({
            id: r.id,
            user_id: r.user_id,
            nome: r.nome,
            categorias: Array.isArray(r.categorias) ? r.categorias : [],
            imagem: r.imagem ?? undefined,
            tempoPreparo: r.tempo_preparo,
            porcoes: r.porcoes,
            dificuldade: r.dificuldade,
            criada_em: r.criada_em,
            criador: {
              id: profileData?.id ?? id,
              nome: profileData?.nome ?? '',
              foto_url: profileData?.foto_url ?? undefined,
              total_importacoes: profileData?.total_importacoes ?? 0,
            },
          }))
        );
      }

      setLoading(false);
    }

    if (id) carregar();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF6F1', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#8B4513" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#FAF6F1', alignItems: 'center', justifyContent: 'center' }}>
        <AppText variant="muted">Perfil não encontrado</AppText>
        <Pressable onPress={() => router.back()} style={{ marginTop: 12 }}>
          <AppText style={{ color: '#8B4513' }}>Voltar</AppText>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF6F1' }}>
      <FlatList
        data={receitas}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          <>
            {/* Header com botão voltar */}
            <SafeAreaView edges={['top']}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 }}>
                <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
                  <ArrowLeft size={22} color="#2C1810" />
                </Pressable>
              </View>
            </SafeAreaView>

            <PerfilPublico
              nome={profile.nome}
              foto_url={profile.foto_url}
              totalReceitas={receitas.length}
              totalImportacoes={profile.total_importacoes ?? 0}
            />

            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <AppText variant="heading">Receitas</AppText>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <AppText variant="muted">Nenhuma receita pública ainda.</AppText>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={{ flex: 1, backgroundColor: 'white', borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}
            onPress={() => router.push(`/receita/${item.id}`)}
          >
            <View style={{ height: 120, backgroundColor: '#E8DDD4', alignItems: 'center', justifyContent: 'center' }}>
              {item.imagem ? (
                <Image source={{ uri: item.imagem }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              ) : (
                <AppText style={{ fontSize: 40 }}>🍽</AppText>
              )}
            </View>
            <View style={{ padding: 10 }}>
              <AppText style={{ fontWeight: '600', fontSize: 13 }} numberOfLines={2}>{item.nome}</AppText>
              <AppText variant="muted" style={{ fontSize: 11, marginTop: 2 }}>{item.tempoPreparo} min</AppText>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 2: Registrar rota em `app/_layout.tsx`**

Adicionar `<Stack.Screen name="perfil/[id]" options={{ headerShown: false }} />` dentro do `<Stack>`:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(auth)" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="receita/nova" options={{ presentation: 'modal' }} />
  <Stack.Screen name="receita/[id]/index" />
  <Stack.Screen name="receita/[id]/editar" options={{ presentation: 'modal' }} />
  <Stack.Screen name="perfil/editar" options={{ presentation: 'modal', headerShown: false }} />
  <Stack.Screen name="planejamento/index" options={{ presentation: 'modal', headerShown: false }} />
  <Stack.Screen name="perfil/[id]" options={{ headerShown: false }} />
</Stack>
```

- [ ] **Step 3: Testar no app**

Tocar no nome de um criador no Feed → deve abrir perfil público com foto, nome, contadores e grid de receitas.

- [ ] **Step 4: Commit**

```bash
git add app/perfil/[id].tsx app/_layout.tsx
git commit -m "feat: tela de perfil público com grid de receitas"
```

---

### Task 9: Toggle Publicar + Badge "Original atualizada" em Detalhes da Receita

**Files:**
- Modify: `app/receita/[id]/index.tsx`

- [ ] **Step 1: Atualizar `app/receita/[id]/index.tsx`**

Adicionar `usePublicar` e botão de toggle publicar/privada. Adicionar verificação de badge "Original atualizada" quando `fonte_receita_id` existe.

Substituir o conteúdo do arquivo:

```tsx
import { View, ScrollView, Image, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, Users, ChefHat, Eye, EyeOff } from 'lucide-react-native';
import { useReceitas } from '../../../hooks/useReceitas';
import { usePublicar } from '../../../hooks/usePublicar';
import { AppText } from '../../../components/ui/AppText';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { IngredienteItem } from '../../../components/IngredienteItem';
import { InstrucaoItem } from '../../../components/InstrucaoItem';
import { supabase } from '../../../lib/supabase';

export default function ReceitaDetalhesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { receitas, remover, carregarReceitas, editar } = useReceitas();
  const { togglePublicar } = usePublicar();
  const receita = receitas.find((r) => r.id === id);
  const [originalAtualizada, setOriginalAtualizada] = useState(false);

  useFocusEffect(useCallback(() => { carregarReceitas(); }, [carregarReceitas]));

  useEffect(() => {
    if (!receita?.fonte_receita_id) return;
    supabase
      .from('receitas')
      .select('atualizada_em')
      .eq('id', receita.fonte_receita_id)
      .single()
      .then(({ data }) => {
        if (data && receita.fonte_atualizada_em) {
          setOriginalAtualizada(data.atualizada_em > receita.fonte_atualizada_em);
        }
      });
  }, [receita?.fonte_receita_id, receita?.fonte_atualizada_em]);

  if (!receita) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <AppText variant="muted">Receita não encontrada</AppText>
        <Button label="Voltar" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  async function handleTogglePublicar() {
    const publicaAtual = receita!.publica !== false;
    const ok = await togglePublicar(receita!.id, publicaAtual);
    if (ok) {
      await editar(receita!.id, { publica: !publicaAtual });
    }
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

  const publica = receita.publica !== false;

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
          </LinearGradient>
        </View>

        <View className="px-4 py-6 gap-6">
          {/* Badge original atualizada */}
          {originalAtualizada && (
            <Pressable
              onPress={() => router.push(`/receita/${receita.fonte_receita_id}`)}
              style={{
                backgroundColor: '#FEF3C7',
                borderRadius: 8,
                padding: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                borderWidth: 1,
                borderColor: '#F59E0B',
              }}
            >
              <AppText style={{ flex: 1, fontSize: 13, color: '#92400E' }}>
                Original atualizada · toque para ver
              </AppText>
            </Pressable>
          )}

          <View className="flex-row flex-wrap gap-2">
            {receita.categorias.map((c) => <Badge key={c} label={c} variant="accent" />)}
          </View>

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
              <InstrucaoItem key={i} numero={i + 1} instrucao={inst} />
            ))}
          </View>

          <View className="gap-3 pb-8">
            {/* Toggle publicar/privada */}
            <Pressable
              onPress={handleTogglePublicar}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 12,
                paddingHorizontal: 16,
                backgroundColor: publica ? '#F0FDF4' : '#F5F5F5',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: publica ? '#86EFAC' : '#E5E7EB',
              }}
            >
              {publica ? <Eye size={18} color="#166534" /> : <EyeOff size={18} color="#6B7280" />}
              <AppText style={{ flex: 1, color: publica ? '#166534' : '#6B7280', fontWeight: '500' }}>
                {publica ? 'Pública — visível no Feed' : 'Privada — só você vê'}
              </AppText>
              <AppText style={{ fontSize: 12, color: publica ? '#166534' : '#6B7280' }}>
                {publica ? 'Tornar privada' : 'Tornar pública'}
              </AppText>
            </Pressable>

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

- [ ] **Step 2: Testar no app**

1. Abrir detalhe de uma receita
2. Pressionar toggle → deve alternar entre "Pública" e "Privada" com feedback visual
3. Verificar que receita privada não aparece no Feed de outros usuários (testar com 2 contas se possível)

- [ ] **Step 3: Commit**

```bash
git add app/receita/[id]/index.tsx
git commit -m "feat: toggle publicar/privada e badge de original atualizada no detalhe da receita"
```

---

### Task 10: Default publica=true + Toggle no Formulário

**Files:**
- Modify: `hooks/useReceitas.ts`
- Modify: `components/ReceitaForm.tsx`

- [ ] **Step 1: Atualizar `hooks/useReceitas.ts`**

Mudar default de `publica` de `false` para `true` em `_syncReceita`. Localizar a linha:
```typescript
publica: receita.publica ?? false,
```
Alterar para:
```typescript
publica: receita.publica ?? true,
```

- [ ] **Step 2: Atualizar `formVazio()` em `components/ReceitaForm.tsx`**

Localizar:
```typescript
const formVazio = (): FormData => ({
  nome: '',
  categorias: ['Carnes'],
  tempoPreparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [],
  instrucoes: [],
});
```

Alterar para:
```typescript
const formVazio = (): FormData => ({
  nome: '',
  categorias: ['Carnes'],
  tempoPreparo: 30,
  porcoes: 4,
  dificuldade: 'Fácil',
  ingredientes: [],
  instrucoes: [],
  publica: true,
});
```

- [ ] **Step 3: Adicionar toggle de visibilidade no `ReceitaForm.tsx`**

No JSX de `ReceitaForm`, localizar a seção de botões no final (antes ou depois do botão "Salvar receita") e adicionar o toggle de visibilidade.

Localizar o bloco de botões (search for `onSalvar` in the JSX) e adicionar antes do botão principal:

```tsx
{/* Toggle visibilidade */}
<Pressable
  onPress={() => setForm((f) => ({ ...f, publica: !(f.publica !== false) }))}
  style={{
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: form.publica !== false ? '#F0FDF4' : '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: form.publica !== false ? '#86EFAC' : '#E5E7EB',
    marginBottom: 4,
  }}
>
  <View>
    <AppText style={{ fontWeight: '500', color: form.publica !== false ? '#166534' : '#6B7280' }}>
      {form.publica !== false ? 'Pública — aparece no Feed' : 'Privada — só você vê'}
    </AppText>
    <AppText variant="muted" style={{ fontSize: 12, marginTop: 2 }}>
      Toque para {form.publica !== false ? 'tornar privada' : 'publicar'}
    </AppText>
  </View>
  {/* Toggle visual */}
  <View
    style={{
      width: 44,
      height: 24,
      borderRadius: 12,
      backgroundColor: form.publica !== false ? '#86EFAC' : '#D1D5DB',
      justifyContent: 'center',
      paddingHorizontal: 2,
    }}
  >
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        alignSelf: form.publica !== false ? 'flex-end' : 'flex-start',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1,
        elevation: 2,
      }}
    />
  </View>
</Pressable>
```

- [ ] **Step 4: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: todos passam.

- [ ] **Step 5: Testar no app**

1. Criar nova receita → toggle deve estar "Pública" por padrão
2. Alterar toggle para "Privada" → salvar → receita não aparece no Feed
3. Editar receita existente com `publica: false` → toggle deve mostrar estado correto

- [ ] **Step 6: Commit**

```bash
git add hooks/useReceitas.ts components/ReceitaForm.tsx
git commit -m "feat: receitas públicas por padrão e toggle de visibilidade no formulário"
```

---

## Verificação Final

```bash
npx jest --no-coverage
# Expected: todos os testes passam
```

Manual checklist:
1. Feed abre com scroll snap — 1 receita por tela, desliza verticalmente
2. Tocar em "Salvar nas minhas receitas" → receita aparece em Receitas com origem rastreada
3. Tocar no nome do criador → abre perfil público com contadores e grid
4. Criar nova receita → pública por padrão, toggle disponível no formulário
5. Toggle em detalhe da receita → alterna visibilidade imediatamente
6. Receita salva de outro usuário → ao atualizar original, badge "Original atualizada" aparece
