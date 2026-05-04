# Comentários em Receitas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Usuários comentam em receitas públicas no Feed (expandível inline) e donos de receita veem comentários recebidos na aba Receitas. Threads 2 níveis. Corações em comentários.

**Architecture:** Tabelas `comments` + `comment_hearts`. Hook `useComentarios(receitaId)` monta árvore de threads client-side. `ComentariosSheet` é componente reutilizável (Feed inline + modal do dono). FeedCard recebe estado de expansão + prop `totalComentarios`. Aba Receitas: toque no card abre `ComentariosSheet` via router ou state local.

**Tech Stack:** Supabase, React Native, NativeWind, expo-router.

**Dependência:** `useCoracoes` já implementado (plano coracoes). `totalComentarios` já exibido no FeedCard (placeholder 0 substituído agora).

---

## Arquivos

| Ação | Arquivo |
|------|---------|
| SQL | `supabase/migrations/20260504_comments.sql` |
| Create | `hooks/useComentarios.ts` |
| Create | `__tests__/hooks/useComentarios.test.ts` |
| Create | `components/ComentariosSheet.tsx` |
| Modify | `components/FeedCard.tsx` — preview + expansão inline |
| Modify | `app/(tabs)/perfil.tsx` — contagem + abrir sheet |
| Modify | `app/receita/[id]/index.tsx` — substituir 0 por contagem real |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase/migrations/20260504_comments.sql`

- [ ] **Step 1: Criar arquivo de migration**

```sql
create table comments (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references receitas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 500),
  parent_id uuid references comments(id) on delete cascade,
  created_at timestamptz default now()
);

create table comment_hearts (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(comment_id, user_id)
);

alter table comments enable row level security;
alter table comment_hearts enable row level security;

create policy "Autenticados lêem comentários públicos" on comments
  for select using (auth.role() = 'authenticated');
create policy "Usuário cria comentário" on comments
  for insert with check (auth.uid() = user_id);
create policy "Usuário deleta próprio comentário" on comments
  for delete using (auth.uid() = user_id);

create policy "Autenticados lêem corações de comentários" on comment_hearts
  for select using (auth.role() = 'authenticated');
create policy "Usuário gerencia próprio coração de comentário" on comment_hearts
  for all using (auth.uid() = user_id);
```

- [ ] **Step 2: Aplicar no Supabase Dashboard**

Colar o SQL no Supabase Dashboard → SQL Editor e executar.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260504_comments.sql
git commit -m "feat: migration tabelas comments e comment_hearts com RLS"
```

---

## Task 2: Hook `useComentarios` (TDD)

**Files:**
- Create: `__tests__/hooks/useComentarios.test.ts`
- Create: `hooks/useComentarios.ts`

### Tipos

```ts
// Em hooks/useComentarios.ts (ou types/index.ts se preferido)
export type Comentario = {
  id: string;
  recipe_id: string;
  user_id: string;
  texto: string;
  parent_id: string | null;
  created_at: string;
  autor: { nome: string; foto_url?: string };
  total_coracoes: number;
  meu_coracao: boolean;
  replies?: Comentario[];
};
```

- [ ] **Step 1: Escrever testes**

```ts
// __tests__/hooks/useComentarios.test.ts
import { renderHook, act } from '@testing-library/react-native';
import { useComentarios } from '../../hooks/useComentarios';

jest.mock('../../lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));
jest.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'user-1' } } }),
}));

import { supabase } from '../../lib/supabase';
const mockFrom = supabase.from as jest.Mock;

const comentarioRoot = {
  id: 'c1',
  recipe_id: 'r1',
  user_id: 'user-2',
  texto: 'Ótima receita!',
  parent_id: null,
  created_at: '2026-05-04T10:00:00Z',
  profiles: { nome: 'Ana', foto_url: null },
};

const comentarioReply = {
  id: 'c2',
  recipe_id: 'r1',
  user_id: 'user-1',
  texto: 'Obrigado!',
  parent_id: 'c1',
  created_at: '2026-05-04T11:00:00Z',
  profiles: { nome: 'Carlos', foto_url: null },
};

const heartC1 = { comment_id: 'c1', user_id: 'user-3' };

function setupLoadMock() {
  let callCount = 0;
  mockFrom.mockImplementation((table: string) => {
    if (table === 'comments') {
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [comentarioRoot, comentarioReply],
          error: null,
        }),
      };
    }
    if (table === 'comment_hearts') {
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: [heartC1], error: null }),
      };
    }
    return { select: jest.fn().mockReturnThis() };
  });
}

describe('useComentarios', () => {
  beforeEach(() => jest.clearAllMocks());

  it('carrega e monta árvore de comentários', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));

    await act(async () => {
      await result.current.carregar();
    });

    expect(result.current.comentarios).toHaveLength(1); // só root
    expect(result.current.comentarios[0].id).toBe('c1');
    expect(result.current.comentarios[0].replies).toHaveLength(1);
    expect(result.current.comentarios[0].replies![0].id).toBe('c2');
    expect(result.current.total).toBe(2);
  });

  it('conta corações corretamente', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));

    await act(async () => { await result.current.carregar(); });

    expect(result.current.comentarios[0].total_coracoes).toBe(1);
    expect(result.current.comentarios[0].meu_coracao).toBe(false);
  });

  it('addComentario insere root otimisticamente', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));
    await act(async () => { await result.current.carregar(); });

    const novoInsert = { id: 'c3', recipe_id: 'r1', user_id: 'user-1',
      texto: 'Novo!', parent_id: null, created_at: '2026-05-04T12:00:00Z',
      profiles: { nome: 'Carlos', foto_url: null } };

    mockFrom.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: novoInsert, error: null }),
    });

    await act(async () => {
      await result.current.addComentario('Novo!');
    });

    expect(result.current.comentarios.some(c => c.id === 'c3')).toBe(true);
  });

  it('deletarComentario remove da lista', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));
    await act(async () => { await result.current.carregar(); });

    mockFrom.mockReturnValue({
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await act(async () => {
      await result.current.deletarComentario('c1');
    });

    expect(result.current.comentarios.find(c => c.id === 'c1')).toBeUndefined();
  });

  it('toggleCoracaoComentario atualiza estado otimisticamente', async () => {
    setupLoadMock();
    const { result } = renderHook(() => useComentarios('r1'));
    await act(async () => { await result.current.carregar(); });

    mockFrom.mockReturnValue({
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    });

    await act(async () => {
      await result.current.toggleCoracaoComentario('c1');
    });

    expect(result.current.comentarios[0].meu_coracao).toBe(true);
    expect(result.current.comentarios[0].total_coracoes).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar para verificar falha**

```bash
npx jest __tests__/hooks/useComentarios.test.ts --no-coverage
```

Expected: FAIL — `useComentarios` not found.

- [ ] **Step 3: Implementar `hooks/useComentarios.ts`**

```ts
import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

export type Comentario = {
  id: string;
  recipe_id: string;
  user_id: string;
  texto: string;
  parent_id: string | null;
  created_at: string;
  autor: { nome: string; foto_url?: string };
  total_coracoes: number;
  meu_coracao: boolean;
  replies?: Comentario[];
};

type RawComment = {
  id: string; recipe_id: string; user_id: string; texto: string;
  parent_id: string | null; created_at: string;
  profiles: { nome: string; foto_url?: string | null };
};

export function useComentarios(receitaId: string) {
  const [comentarios, setComentarios] = useState<Comentario[]>([]);
  const { session } = useAuth();
  const userId = session?.user?.id;

  const total = comentarios.reduce((acc, c) => acc + 1 + (c.replies?.length ?? 0), 0);

  const carregar = useCallback(async () => {
    const { data: rawComments, error } = await supabase
      .from('comments')
      .select('id, recipe_id, user_id, texto, parent_id, created_at, profiles(nome, foto_url)')
      .eq('recipe_id', receitaId)
      .order('created_at', { ascending: true });

    if (error || !rawComments) return;

    const allIds = rawComments.map((c: RawComment) => c.id);
    const { data: hearts } = await supabase
      .from('comment_hearts')
      .select('comment_id, user_id')
      .in('comment_id', allIds);

    const heartMap = new Map<string, { total: number; meu: boolean }>();
    for (const h of (hearts ?? [])) {
      const cur = heartMap.get(h.comment_id) ?? { total: 0, meu: false };
      heartMap.set(h.comment_id, {
        total: cur.total + 1,
        meu: cur.meu || h.user_id === userId,
      });
    }

    const toComentario = (raw: RawComment): Comentario => ({
      id: raw.id,
      recipe_id: raw.recipe_id,
      user_id: raw.user_id,
      texto: raw.texto,
      parent_id: raw.parent_id,
      created_at: raw.created_at,
      autor: { nome: raw.profiles?.nome ?? 'Usuário', foto_url: raw.profiles?.foto_url ?? undefined },
      total_coracoes: heartMap.get(raw.id)?.total ?? 0,
      meu_coracao: heartMap.get(raw.id)?.meu ?? false,
    });

    const roots = rawComments
      .filter((c: RawComment) => !c.parent_id)
      .map((c: RawComment) => ({
        ...toComentario(c),
        replies: rawComments
          .filter((r: RawComment) => r.parent_id === c.id)
          .map(toComentario),
      }));

    setComentarios(roots);
  }, [receitaId, userId]);

  const addComentario = useCallback(async (texto: string, parentId?: string) => {
    if (!userId || !texto.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({ recipe_id: receitaId, user_id: userId, texto: texto.trim(), parent_id: parentId ?? null })
      .select('id, recipe_id, user_id, texto, parent_id, created_at, profiles(nome, foto_url)')
      .single();

    if (error || !data) return;

    const novo: Comentario = {
      id: data.id,
      recipe_id: data.recipe_id,
      user_id: data.user_id,
      texto: data.texto,
      parent_id: data.parent_id,
      created_at: data.created_at,
      autor: { nome: data.profiles?.nome ?? 'Usuário', foto_url: data.profiles?.foto_url ?? undefined },
      total_coracoes: 0,
      meu_coracao: false,
      replies: [],
    };

    if (!parentId) {
      setComentarios(prev => [...prev, novo]);
    } else {
      setComentarios(prev => prev.map(c =>
        c.id === parentId ? { ...c, replies: [...(c.replies ?? []), novo] } : c
      ));
    }
  }, [receitaId, userId]);

  const deletarComentario = useCallback(async (commentId: string) => {
    await supabase.from('comments').delete().eq('id', commentId);
    setComentarios(prev => {
      const semRoot = prev.filter(c => c.id !== commentId);
      return semRoot.map(c => ({
        ...c,
        replies: (c.replies ?? []).filter(r => r.id !== commentId),
      }));
    });
  }, []);

  const toggleCoracaoComentario = useCallback(async (commentId: string) => {
    const atualizar = (list: Comentario[]): Comentario[] =>
      list.map(c => {
        if (c.id === commentId) {
          const novoMeu = !c.meu_coracao;
          return {
            ...c,
            meu_coracao: novoMeu,
            total_coracoes: novoMeu ? c.total_coracoes + 1 : Math.max(0, c.total_coracoes - 1),
          };
        }
        if (c.replies?.length) return { ...c, replies: atualizar(c.replies) };
        return c;
      });

    setComentarios(prev => atualizar(prev));

    const atual = comentarios.flatMap(c => [c, ...(c.replies ?? [])]).find(c => c.id === commentId);
    if (!atual || !userId) return;

    if (!atual.meu_coracao) {
      await supabase.from('comment_hearts').insert({ comment_id: commentId, user_id: userId });
    } else {
      await supabase.from('comment_hearts').delete()
        .eq('comment_id', commentId).eq('user_id', userId);
    }
  }, [comentarios, userId]);

  return { comentarios, total, carregar, addComentario, toggleCoracaoComentario, deletarComentario };
}
```

- [ ] **Step 4: Rodar testes**

```bash
npx jest __tests__/hooks/useComentarios.test.ts --no-coverage
```

Expected: 5 passed.

- [ ] **Step 5: Commit**

```bash
git add hooks/useComentarios.ts __tests__/hooks/useComentarios.test.ts
git commit -m "feat: hook useComentarios com threads, corações e CRUD otimista"
```

---

## Task 3: Componente `ComentariosSheet`

**Files:**
- Create: `components/ComentariosSheet.tsx`

Sheet reutilizável para exibir/comentar em uma receita. Usado inline no FeedCard (expandido) e como modal da aba Receitas.

- [ ] **Step 1: Criar `components/ComentariosSheet.tsx`**

```tsx
import { View, TextInput, Pressable, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useEffect } from 'react';
import { Heart, Send, X } from 'lucide-react-native';
import { useComentarios, Comentario } from '../hooks/useComentarios';
import { useAuth } from '../hooks/useAuth';
import { AppText } from './ui/AppText';

type Props = {
  receitaId: string;
  receitaUserId: string; // dono da receita — pode deletar qualquer comentário
  onClose: () => void;
};

function Avatar({ nome, foto_url, size = 28 }: { nome: string; foto_url?: string; size?: number }) {
  const inicial = nome?.[0]?.toUpperCase() ?? '?';
  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-[#E8DDD4] items-center justify-center flex-shrink-0"
    >
      <AppText style={{ fontSize: size * 0.38 }} className="font-sans-bold text-primary">
        {inicial}
      </AppText>
    </View>
  );
}

function ComentarioItem({
  comentario,
  receitaUserId,
  onReply,
  onToggleCoracao,
  onDeletar,
  isReply = false,
}: {
  comentario: Comentario;
  receitaUserId: string;
  onReply: (rootId: string, nome: string) => void;
  onToggleCoracao: (id: string) => void;
  onDeletar: (id: string) => void;
  isReply?: boolean;
}) {
  const { session } = useAuth();
  const podeDelete = session?.user?.id === comentario.user_id || session?.user?.id === receitaUserId;

  const ago = (() => {
    const diff = Date.now() - new Date(comentario.created_at).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
  })();

  return (
    <View className={isReply ? 'ml-9 mt-2 bg-[#FAF6F1] rounded-xl p-2' : 'mb-3'}>
      <View className="flex-row gap-2 items-start">
        <Avatar nome={comentario.autor.nome} foto_url={comentario.autor.foto_url} size={isReply ? 22 : 28} />
        <View className="flex-1">
          <AppText className="text-[13px] text-[#2C1810]">
            <AppText className="font-sans-bold">{comentario.autor.nome} </AppText>
            {comentario.texto}
          </AppText>
          <View className="flex-row items-center gap-3 mt-1">
            <AppText className="text-[11px] text-[#8C7B6B]">{ago}</AppText>
            <Pressable
              onPress={() => onToggleCoracao(comentario.id)}
              className="flex-row items-center gap-1"
              hitSlop={6}
            >
              <Heart
                size={13}
                color={comentario.meu_coracao ? '#8B4513' : '#8C7B6B'}
                fill={comentario.meu_coracao ? '#8B4513' : 'none'}
              />
              <AppText className="text-[11px] text-[#8C7B6B]">{comentario.total_coracoes}</AppText>
            </Pressable>
            {!isReply && (
              <Pressable onPress={() => onReply(comentario.id, comentario.autor.nome)} hitSlop={6}>
                <AppText className="text-[11px] text-primary font-sans-bold">Responder</AppText>
              </Pressable>
            )}
            {isReply && (
              <Pressable onPress={() => onReply(comentario.parent_id!, comentario.autor.nome)} hitSlop={6}>
                <AppText className="text-[11px] text-primary font-sans-bold">Responder</AppText>
              </Pressable>
            )}
            {podeDelete && (
              <Pressable onPress={() => onDeletar(comentario.id)} hitSlop={6}>
                <AppText className="text-[11px] text-red-400">Excluir</AppText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
      {(comentario.replies ?? []).map(reply => (
        <ComentarioItem
          key={reply.id}
          comentario={reply}
          receitaUserId={receitaUserId}
          onReply={onReply}
          onToggleCoracao={onToggleCoracao}
          onDeletar={onDeletar}
          isReply
        />
      ))}
    </View>
  );
}

export function ComentariosSheet({ receitaId, receitaUserId, onClose }: Props) {
  const { comentarios, total, carregar, addComentario, toggleCoracaoComentario, deletarComentario } =
    useComentarios(receitaId);
  const { session } = useAuth();
  const [texto, setTexto] = useState('');
  const [respondendoId, setRespondendoId] = useState<string | null>(null);
  const [respondendoNome, setRespondendoNome] = useState<string | null>(null);

  useEffect(() => { carregar(); }, [receitaId]);

  const handleReply = (rootId: string, nome: string) => {
    setRespondendoId(rootId);
    setRespondendoNome(nome);
  };

  const handleEnviar = async () => {
    if (!texto.trim()) return;
    await addComentario(texto.trim(), respondendoId ?? undefined);
    setTexto('');
    setRespondendoId(null);
    setRespondendoNome(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-3 border-b border-[#F5F0EB]">
        <AppText className="text-[13px] font-sans-bold text-[#2C1810]">{total} comentários</AppText>
        <Pressable onPress={onClose} hitSlop={8}>
          <X size={18} color="#8C7B6B" />
        </Pressable>
      </View>

      {/* Lista */}
      <FlatList
        data={comentarios}
        keyExtractor={c => c.id}
        contentContainerStyle={{ padding: 14 }}
        renderItem={({ item }) => (
          <ComentarioItem
            comentario={item}
            receitaUserId={receitaUserId}
            onReply={handleReply}
            onToggleCoracao={toggleCoracaoComentario}
            onDeletar={deletarComentario}
          />
        )}
        ListEmptyComponent={
          <AppText className="text-[13px] text-[#8C7B6B] text-center py-6">
            Seja o primeiro a comentar!
          </AppText>
        }
      />

      {/* Input */}
      <View className="border-t border-[#F5F0EB] px-4 pt-2 pb-4">
        {respondendoNome && (
          <View className="flex-row justify-between items-center mb-1 px-1">
            <AppText className="text-[11px] text-[#8C7B6B]">
              Respondendo a <AppText className="font-sans-bold">{respondendoNome}</AppText>
            </AppText>
            <Pressable onPress={() => { setRespondendoId(null); setRespondendoNome(null); }} hitSlop={6}>
              <X size={14} color="#8C7B6B" />
            </Pressable>
          </View>
        )}
        <View className="flex-row items-center gap-3">
          <Avatar
            nome={session?.user?.email?.[0]?.toUpperCase() ?? '?'}
            size={28}
          />
          <TextInput
            className="flex-1 bg-[#F5F0EB] rounded-full px-4 py-2 text-[13px] text-[#2C1810]"
            placeholder="Adicionar comentário..."
            placeholderTextColor="#8C7B6B"
            value={texto}
            onChangeText={setTexto}
            maxLength={500}
            multiline={false}
            returnKeyType="send"
            onSubmitEditing={handleEnviar}
          />
          <Pressable
            onPress={handleEnviar}
            disabled={!texto.trim()}
            hitSlop={8}
          >
            <Send size={20} color={texto.trim() ? '#8B4513' : '#D4C4B0'} />
          </Pressable>
        </View>
        {texto.length > 450 && (
          <AppText className="text-[11px] text-[#8C7B6B] text-right mt-1">{texto.length}/500</AppText>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/ComentariosSheet.tsx
git commit -m "feat: componente ComentariosSheet reutilizável com threads e hearts"
```

---

## Task 4: FeedCard — preview + expansão inline

**Files:**
- Modify: `components/FeedCard.tsx`

FeedCard deve mostrar preview do comentário mais recente abaixo da barra de ações, e expandir o `ComentariosSheet` inline ao tocar no ícone de comentário.

- [ ] **Step 1: Adicionar props de comentários e estado de expansão**

Adicionar ao tipo de props (além dos já adicionados na task corações):
```ts
comentarioPreview?: { autor: string; texto: string } | null;
receitaUserId: string;
```

No corpo do componente, adicionar estado local:
```ts
const [expandido, setExpandido] = useState(false);
```

Atualizar o handler do ícone de comentário (já na barra de ações) para toggle:
```tsx
onPress={() => setExpandido(prev => !prev)}
```

- [ ] **Step 2: Adicionar preview + sheet expansível**

Após a barra de ações, adicionar:
```tsx
{/* Preview comentário */}
{!expandido && comentarioPreview && (
  <View className="px-4 py-3">
    <View className="flex-row gap-2 items-start">
      <View className="w-6 h-6 rounded-full bg-[#E8DDD4] items-center justify-center flex-shrink-0">
        <AppText className="text-[10px] font-sans-bold text-primary">
          {comentarioPreview.autor[0]?.toUpperCase()}
        </AppText>
      </View>
      <AppText className="flex-1 text-[13px] text-[#2C1810]" numberOfLines={2}>
        <AppText className="font-sans-bold">{comentarioPreview.autor} </AppText>
        {comentarioPreview.texto}
      </AppText>
    </View>
    <Pressable onPress={() => setExpandido(true)} className="mt-2 pl-8">
      <AppText className="text-[12px] text-[#8C7B6B]">
        Ver todos os {totalComentarios} comentários
      </AppText>
    </Pressable>
  </View>
)}

{/* Sheet expandida */}
{expandido && (
  <View style={{ maxHeight: 400 }}>
    <ComentariosSheet
      receitaId={receita.id}
      receitaUserId={receitaUserId}
      onClose={() => setExpandido(false)}
    />
  </View>
)}
```

Importar `ComentariosSheet`:
```ts
import { ComentariosSheet } from './ComentariosSheet';
```

- [ ] **Step 3: Rodar testes**

```bash
npx jest --no-coverage
```

Expected: sem regressões.

- [ ] **Step 4: Commit**

```bash
git add components/FeedCard.tsx
git commit -m "feat: preview de comentário e expansão inline no FeedCard"
```

---

## Task 5: Feed.tsx — passar preview + contagem real

**Files:**
- Modify: `app/(tabs)/feed.tsx`

- [ ] **Step 1: Passar props de comentário ao FeedCard**

No `app/(tabs)/feed.tsx`, para cada receita carregada no feed precisamos de `totalComentarios` e `comentarioPreview`. Buscar em batch junto com o feed, ou lazy-load ao expandir.

Abordagem: buscar contagem em batch ao carregar feed (simples, um SELECT COUNT por recipe_id).

```ts
// Em useFeed ou diretamente em feed.tsx
const [contagensComentarios, setContagensComentarios] = useState<Map<string, number>>(new Map());

useEffect(() => {
  if (!receitas.length) return;
  const ids = receitas.map(r => r.id);
  supabase
    .from('comments')
    .select('recipe_id')
    .in('recipe_id', ids)
    .then(({ data }) => {
      const map = new Map<string, number>();
      for (const row of (data ?? [])) {
        map.set(row.recipe_id, (map.get(row.recipe_id) ?? 0) + 1);
      }
      setContagensComentarios(map);
    });
}, [receitas]);
```

Passar ao FeedCard:
```tsx
<FeedCard
  // ... props existentes ...
  totalComentarios={contagensComentarios.get(receita.id) ?? 0}
  receitaUserId={receita.user_id}
  comentarioPreview={null} // preview lazy-loaded pelo ComentariosSheet ao expandir
/>
```

(Preview do comentário mais recente será carregado pelo próprio `carregar()` do `useComentarios` quando o card expandir.)

- [ ] **Step 2: Rodar testes**

```bash
npx jest __tests__/hooks/useFeed.test.ts --no-coverage
```

Expected: sem regressões.

- [ ] **Step 3: Commit**

```bash
git add app/(tabs)/feed.tsx
git commit -m "feat: contagem de comentários em batch no Feed"
```

---

## Task 6: Aba Perfil — contagem + modal de comentários

**Files:**
- Modify: `app/(tabs)/perfil.tsx`

No grid de receitas do criador, cada card deve mostrar o ícone 💬 + contagem sobreposto, e ao tocar abrir `ComentariosSheet` em modal.

- [ ] **Step 1: Adicionar contagem sobreposta no grid**

No `app/(tabs)/perfil.tsx`, buscar contagens ao carregar receitas:
```ts
import { supabase } from '../../lib/supabase';
import { useState, useEffect } from 'react';

const [contagensComentarios, setContagensComentarios] = useState<Map<string, number>>(new Map());
const [receitaAbertaId, setReceitaAbertaId] = useState<string | null>(null);

useEffect(() => {
  if (!receitas.length) return;
  const ids = receitas.map(r => r.id);
  supabase
    .from('comments')
    .select('recipe_id')
    .in('recipe_id', ids)
    .then(({ data }) => {
      const map = new Map<string, number>();
      for (const row of (data ?? [])) {
        map.set(row.recipe_id, (map.get(row.recipe_id) ?? 0) + 1);
      }
      setContagensComentarios(map);
    });
}, [receitas]);
```

No grid, ao renderizar cada card:
```tsx
<Pressable
  key={receita.id}
  onPress={() => setReceitaAbertaId(receita.id)}
  className="..."
>
  {/* imagem da receita */}
  {(contagensComentarios.get(receita.id) ?? 0) > 0 && (
    <View className="absolute bottom-1 right-1 bg-white/85 rounded-xl px-1.5 py-0.5 flex-row items-center gap-1">
      <MessageCircle size={9} color="#8B4513" />
      <AppText className="text-[10px] font-sans-bold text-primary">
        {contagensComentarios.get(receita.id)}
      </AppText>
    </View>
  )}
</Pressable>
```

Importar:
```ts
import { MessageCircle } from 'lucide-react-native';
import { Modal } from 'react-native';
import { ComentariosSheet } from '../../components/ComentariosSheet';
```

Modal de comentários:
```tsx
<Modal
  visible={!!receitaAbertaId}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setReceitaAbertaId(null)}
>
  {receitaAbertaId && (
    <ComentariosSheet
      receitaId={receitaAbertaId}
      receitaUserId={session?.user?.id ?? ''}
      onClose={() => setReceitaAbertaId(null)}
    />
  )}
</Modal>
```

- [ ] **Step 2: Atualizar `app/receita/[id]/index.tsx` — contagem real**

Substituir o `0` de comentários no stats row pelo total do hook `useComentarios`:

```ts
const { total: totalComentarios, carregar: carregarComentarios } = useComentarios(receita?.id ?? '');

useEffect(() => {
  if (receita?.id) carregarComentarios();
}, [receita?.id]);
```

No JSX, trocar `<AppText>0</AppText>` por:
```tsx
<AppText className="text-[13px] text-[#2C1810]">{totalComentarios}</AppText>
```

- [ ] **Step 3: Rodar todos os testes**

```bash
npx jest --no-coverage
```

Expected: todos passando.

- [ ] **Step 4: Commit**

```bash
git add app/(tabs)/perfil.tsx app/receita/[id]/index.tsx
git commit -m "feat: contagem e modal de comentários na aba perfil e detalhe"
```

---

## Verificação Final

```bash
npx jest --no-coverage
# Expected: todos passando
```

Manual:
1. Feed → barra tem ❤ + 💬 com contagens reais
2. Tap 💬 → expande sheet inline com lista de comentários + input
3. Digitar comentário → aparece imediatamente (otimista)
4. Responder comentário → reply indentado fundo #FAF6F1 nível 2
5. Coração em comentário → preenchido, contador sobe
6. Swipe/Long press → "Excluir" disponível para próprio comentário ou dono da receita
7. Aba Receitas (Perfil) → cards com 💬N sobreposto quando há comentários
8. Tap card → abre modal com ComentariosSheet da receita
