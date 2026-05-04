# Corações em Receitas — Design

**Goal:** Usuários podem dar coração em receitas públicas no Feed e na tela de detalhe. Contagem visível; coração próprio destacado visualmente.

**Architecture:** Tabela `recipe_hearts` no Supabase com constraint única (recipe_id, user_id). Contagem via COUNT query agrupado. Hook `useCoracoes` gerencia toggle + contagem local otimista. Feed carrega corações em batch ao montar. Detalhe da receita carrega individualmente.

**Tech Stack:** Supabase, React Native, lucide-react-native (Heart icon), NativeWind.

---

## Modelo de dados

```sql
create table recipe_hearts (
  id uuid primary key default gen_random_uuid(),
  recipe_id uuid not null references receitas(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(recipe_id, user_id)
);

alter table recipe_hearts enable row level security;

create policy "Qualquer autenticado lê corações" on recipe_hearts
  for select using (auth.role() = 'authenticated');

create policy "Usuário gerencia próprio coração" on recipe_hearts
  for all using (auth.uid() = user_id);
```

---

## Hook `useCoracoes`

**Arquivo:** `hooks/useCoracoes.ts`

```ts
export function useCoracoes(receitaIds: string[]) {
  // Estado: Map<recipeId, { total: number; meu: boolean }>
  // carregarCorações(ids): busca em batch do Supabase
  // toggleCoracao(recipeId): otimista + sync
  return { coracoes, toggleCoracao, carregarCorações }
}
```

Otimismo: ao toglear, atualiza estado local imediatamente. Se Supabase falhar, reverte.

Batch query:
```sql
select recipe_id, count(*) as total,
  bool_or(user_id = auth.uid()) as meu
from recipe_hearts
where recipe_id = any($1)
group by recipe_id
```

---

## UI

### FeedCard
- Barra de ações embaixo da foto: `[Heart count] [Comment count]`
- Heart preenchido (#8B4513) = coração dado; outline = não dado
- Toque: toggle imediato (otimista)
- Contagem numérica ao lado

### Tela de detalhe da receita (`app/receita/[id]/index.tsx`)
- Seção de stats abaixo do header: `❤ 47  💬 12`
- Mesmo comportamento de toggle

### Perfil público (`app/perfil/[id].tsx`)
- Não aparece heart nas receitas do grid (só no Feed e detalhe)

---

## Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Create | `hooks/useCoracoes.ts` |
| Create | `__tests__/hooks/useCoracoes.test.ts` |
| Modify | `components/FeedCard.tsx` |
| Modify | `app/receita/[id]/index.tsx` |
| SQL | Migration: tabela + RLS |

---

## Comportamentos de borda

- Usuário não logado: heart desabilitado (app requer auth, não deve ocorrer)
- Double-tap rápido: segundo toggle cancela o primeiro otimisticamente, debounce 300ms no sync
- Receita própria: pode dar coração na própria receita (sem restrição)
