# Comentários em Receitas — Design

**Goal:** Usuários comentam em receitas públicas no Feed (expandível inline) e donos de receita veem comentários recebidos na aba Receitas. Threads 2 níveis. Corações em comentários.

**Architecture:** Tabela `comments` com `parent_id` nullable para threads. Tabela `comment_hearts` para corações em comentários. Hook `useComentarios(receitaId)` gerencia fetch + post + toggle coração. No Feed, expansão é estado local por card. Acesso do criador via modal de comentários a partir do grid da aba Receitas.

**Tech Stack:** Supabase, React Native, NativeWind, expo-router.

---

## Modelo de dados

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

**Regra de threads:** `parent_id` só pode referenciar comentários onde `parent_id IS NULL` (raiz). Todas as respostas — inclusive resposta de resposta — ficam no nível 2 sob o comentário raiz. Enforcement no app (não há constraint DB para isso, mas o app sempre salva replies com `parent_id` = id do comentário raiz).

---

## Hook `useComentarios`

**Arquivo:** `hooks/useComentarios.ts`

```ts
type Comentario = {
  id: string; recipe_id: string; user_id: string; texto: string;
  parent_id: string | null; created_at: string;
  autor: { nome: string; foto_url?: string };
  total_corações: number; meu_coração: boolean;
  replies?: Comentario[]; // só em root comments
}

export function useComentarios(receitaId: string) {
  // Estado: Comentario[] (apenas roots, com replies aninhados)
  // carregar(): busca todos, monta árvore no cliente
  // addComentario(texto, parentId?): otimista + sync
  // toggleCoracaoComentario(commentId): otimista + sync
  // deletarComentario(commentId): só próprios
  return { comentarios, total, carregar, addComentario, toggleCoracaoComentario, deletarComentario }
}
```

Query: busca todos os comentários da receita + autores + contagem de corações em batch, monta árvore cliente-side.

---

## UI

### FeedCard — estado colapsado
- Preview: 1 comentário (mais recente)
- "Ver todos os X comentários" → toggle expansão

### FeedCard — estado expandido (inline)
```
[header: "X comentários"  ✕ fechar]
[comentário root]
  [avatar] Nome  texto
  2h · ❤ 5 · Responder
  [reply indentado, fundo #FAF6F1]
    [avatar] Nome  texto
    1h · ❤ 2 · Responder  ← ao responder a reply, parent = root do reply
[comentário root 2]
  ...
[input] [avatar do user] [campo texto] [➤ enviar]
```

### Aba Receitas — grid do criador
- Sobreposto em cada card: ícone 💬 + contagem de comentários recebidos
- Toque no card → abre `ComentariosModal` (bottom sheet ou screen)

### ComentariosModal (`app/receita/[id]/comentarios.tsx` ou componente)
- Mesmo layout do Feed expandido
- Criador pode deletar qualquer comentário da própria receita
- Qualquer um pode deletar o próprio comentário

---

## Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Create | `hooks/useComentarios.ts` |
| Create | `__tests__/hooks/useComentarios.test.ts` |
| Modify | `components/FeedCard.tsx` — estado expand + preview |
| Modify | `app/(tabs)/perfil.tsx` — contagem no grid de receitas próprias |
| Create | `components/ComentariosSheet.tsx` — comentários expandidos (Feed + modal) |
| SQL | Migration: tabelas + RLS |

---

## Comportamentos de borda

- Texto vazio: botão enviar desabilitado
- Texto longo: limite 500 caracteres, contador visível
- Delete: swipe-to-delete ou long-press → "Excluir comentário"
- Paginação: primeiros 20 comentários, "Ver mais" se houver
- Preview no FeedCard: comentário mais recente (order by created_at desc limit 1)
