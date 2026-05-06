# Recipe Overrides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o modelo de cópia completa de receitas salvas por um modelo de override (diff), onde existe apenas 1 receita canônica no sistema e cada usuário mantém apenas os campos que personalizou.

**Architecture:** Receitas salvas do feed deixam de criar uma cópia na tabela `receitas`. Em vez disso, criam um registro em `recipe_overrides (user_id, recipe_id, ...campos_alterados)`. Na leitura, o hook mescla original + override para montar o `Receita` exibido. Corações e comentários vivem sempre no ID da receita original.

**Tech Stack:** Supabase (PostgreSQL + RLS), React Native, Expo Router, AsyncStorage cache

---

## Mapa de arquivos

| Arquivo | Ação |
|---------|------|
| `supabase/migrations/20260505_recipe_overrides.sql` | Criar — tabela + RLS + migração de dados |
| `types/index.ts` | Modificar — nenhuma mudança de tipo necessária (Receita.fonte_receita_id já existe) |
| `hooks/useReceitas.ts` | Modificar — `carregarReceitas`, `editar`, `remover` |
| `hooks/useSalvarReceita.ts` | Modificar — `salvar` cria override, `remover` deleta override |
| `app/receita/[id]/index.tsx` | Modificar — `podeEditar`, ocultar toggle público para receitas salvas |

---

## Task 1: Criar tabela recipe_overrides + RLS + migrar dados existentes

**Files:**
- Create: `supabase/migrations/20260505_recipe_overrides.sql`

- [ ] **Step 1: Escrever a migration**

```sql
-- supabase/migrations/20260505_recipe_overrides.sql

-- 1. Criar tabela
create table public.recipe_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id uuid not null references public.receitas(id) on delete cascade,
  nome text,
  categorias text[],
  imagem text,
  tempo_preparo integer,
  porcoes integer,
  dificuldade text,
  ingredientes jsonb,
  instrucoes jsonb,
  fonte_atualizada_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique(user_id, recipe_id)
);

-- 2. RLS
alter table public.recipe_overrides enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.recipe_overrides to authenticated;

create policy "recipe_overrides_all_own" on public.recipe_overrides
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Migrar hearts de cópias para originais (ignorar duplicatas)
insert into public.recipe_hearts (user_id, recipe_id, created_at)
select rh.user_id, r.fonte_receita_id, rh.created_at
from public.recipe_hearts rh
join public.receitas r on r.id = rh.recipe_id
where r.fonte_receita_id is not null
on conflict (user_id, recipe_id) do nothing;

-- 4. Migrar comentários de cópias para originais
update public.comments
set recipe_id = r.fonte_receita_id
from public.receitas r
where comments.recipe_id = r.id
  and r.fonte_receita_id is not null;

-- 5. Criar overrides a partir das cópias existentes
insert into public.recipe_overrides (
  user_id, recipe_id,
  nome, categorias, imagem, tempo_preparo, porcoes, dificuldade,
  ingredientes, instrucoes,
  fonte_atualizada_em, criado_em, atualizado_em
)
select
  copia.user_id,
  copia.fonte_receita_id,
  case when copia.nome <> original.nome then copia.nome else null end,
  case when copia.categorias::text <> original.categorias::text then copia.categorias else null end,
  case when copia.imagem is distinct from original.imagem then copia.imagem else null end,
  case when copia.tempo_preparo <> original.tempo_preparo then copia.tempo_preparo else null end,
  case when copia.porcoes <> original.porcoes then copia.porcoes else null end,
  case when copia.dificuldade <> original.dificuldade then copia.dificuldade else null end,
  (
    select jsonb_agg(jsonb_build_object(
      'nome', i.nome,
      'quantidade', i.quantidade::text,
      'unidade', i.unidade
    ))
    from public.ingredientes i
    where i.receita_id = copia.id
  ),
  case when copia.instrucoes::text <> original.instrucoes::text then copia.instrucoes else null end,
  coalesce(copia.fonte_atualizada_em, original.atualizada_em),
  copia.criada_em,
  copia.atualizada_em
from public.receitas copia
join public.receitas original on original.id = copia.fonte_receita_id
where copia.fonte_receita_id is not null;

-- 6. Deletar ingredientes das cópias
delete from public.ingredientes
where receita_id in (
  select id from public.receitas where fonte_receita_id is not null
);

-- 7. Deletar hearts das cópias (já migrados)
delete from public.recipe_hearts
where recipe_id in (
  select id from public.receitas where fonte_receita_id is not null
);

-- 8. Deletar as cópias
delete from public.receitas where fonte_receita_id is not null;
```

- [ ] **Step 2: Aplicar a migration**

```bash
npx supabase db push
```

Expected: migration aplicada sem erros.

- [ ] **Step 3: Verificar no Supabase Studio**

Checar que a tabela `recipe_overrides` existe e que `receitas` não tem mais linhas com `fonte_receita_id IS NOT NULL`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260505_recipe_overrides.sql
git commit -m "feat: add recipe_overrides table and migrate copy data"
```

---

## Task 2: Reescrever useReceitas — carregarReceitas, editar, remover

**Files:**
- Modify: `hooks/useReceitas.ts`

- [ ] **Step 1: Substituir a constante CACHE_KEY**

No topo de `hooks/useReceitas.ts`, mudar:
```typescript
const CACHE_KEY = '@receitas_v3'; // v3 invalida cache antigo com cópias
```

- [ ] **Step 2: Reescrever carregarReceitas**

Substituir o bloco dentro do `try` em `carregarReceitas`:

```typescript
// Receitas próprias (nunca foram salvas de outro usuário)
const { data: proprias, error: errProprias } = await supabase
  .from('receitas')
  .select('*, ingredientes(*)')
  .eq('user_id', user.id)
  .order('criada_em', { ascending: false });

if (errProprias) throw errProprias;

// Overrides do usuário (receitas salvas de outros)
const { data: overrides, error: errOverrides } = await supabase
  .from('recipe_overrides')
  .select(`
    *,
    receita:recipe_id (
      *,
      ingredientes (*)
    )
  `)
  .eq('user_id', user.id)
  .order('criado_em', { ascending: false });

if (errOverrides) throw errOverrides;

// Mapear receitas próprias
const mapeadasProprias: Receita[] = (proprias ?? []).map((r) => ({
  id: r.id,
  user_id: r.user_id,
  nome: r.nome,
  categorias: Array.isArray(r.categorias) ? r.categorias : [r.categoria ?? 'Carnes'],
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
  instrucoes: (r.instrucoes ?? []).map((inst: any) =>
    typeof inst === 'string' ? { texto: inst } : inst
  ),
  publica: r.publica,
  criadaEm: r.criada_em,
  atualizadaEm: r.atualizada_em,
  fonte_receita_id: undefined,
  fonte_atualizada_em: undefined,
}));

// Mesclar overrides com originais
const mapeadasSalvas: Receita[] = (overrides ?? []).map((o) => {
  const original = o.receita;
  const ingOverride = o.ingredientes as any[] | null;
  return {
    id: original.id,
    user_id: original.user_id,
    nome: o.nome ?? original.nome,
    categorias: o.categorias ?? (Array.isArray(original.categorias) ? original.categorias : [original.categoria ?? 'Carnes']),
    imagem: o.imagem ?? original.imagem,
    tempoPreparo: o.tempo_preparo ?? original.tempo_preparo,
    porcoes: o.porcoes ?? original.porcoes,
    dificuldade: o.dificuldade ?? original.dificuldade,
    ingredientes: (ingOverride ?? original.ingredientes ?? []).map((i: any) => ({
      id: i.id,
      nome: i.nome,
      quantidade: typeof i.quantidade === 'string' ? parseFloat(i.quantidade) : i.quantidade,
      unidade: i.unidade,
    })),
    instrucoes: (o.instrucoes ?? original.instrucoes ?? []).map((inst: any) =>
      typeof inst === 'string' ? { texto: inst } : inst
    ),
    publica: original.publica,
    criadaEm: o.criado_em,
    atualizadaEm: o.atualizado_em,
    fonte_receita_id: original.id, // marca que é salva
    fonte_atualizada_em: o.fonte_atualizada_em ?? original.atualizada_em,
  };
});

const todasReceitas = [...mapeadasProprias, ...mapeadasSalvas];
setReceitas(todasReceitas);
await setCache(todasReceitas);
```

Remover o bloco de `comIngredientesRecuperados` e `toResync` — não são mais necessários com o novo modelo.

- [ ] **Step 3: Reescrever editar**

```typescript
const editar = useCallback(
  async (id: string, dados: Partial<Receita>) => {
    const agora = new Date().toISOString();
    const lista = receitas.map((r) =>
      r.id === id ? { ...r, ...dados, atualizadaEm: agora } : r
    );
    setReceitas(lista);
    await setCache(lista);

    if (!user) return;

    const receita = receitas.find((r) => r.id === id);
    if (receita?.fonte_receita_id) {
      // Receita salva → upsert override
      await supabase.from('recipe_overrides').upsert(
        {
          user_id: user.id,
          recipe_id: id,
          nome: dados.nome,
          categorias: dados.categorias,
          imagem: dados.imagem,
          tempo_preparo: dados.tempoPreparo,
          porcoes: dados.porcoes,
          dificuldade: dados.dificuldade,
          ingredientes: dados.ingredientes
            ? dados.ingredientes.map((i) => ({
                nome: i.nome,
                quantidade: String(i.quantidade),
                unidade: i.unidade,
              }))
            : undefined,
          instrucoes: dados.instrucoes,
          atualizado_em: agora,
        },
        { onConflict: 'user_id,recipe_id' }
      );
    } else {
      // Receita própria → sync na tabela receitas
      const atualizada = lista.find((r) => r.id === id);
      if (atualizada) _syncReceita(atualizada, user.id);
    }
  },
  [user, receitas]
);
```

- [ ] **Step 4: Reescrever remover**

```typescript
const remover = useCallback(
  async (id: string) => {
    const receita = receitas.find((r) => r.id === id);
    setReceitas((prev) => {
      const lista = prev.filter((r) => r.id !== id);
      setCache(lista);
      return lista;
    });

    if (!user) return;

    if (receita?.fonte_receita_id) {
      // Receita salva → deletar override
      await supabase
        .from('recipe_overrides')
        .delete()
        .match({ user_id: user.id, recipe_id: id });
    } else {
      // Receita própria → deletar da tabela receitas
      await supabase.from('receitas').delete().eq('id', id).eq('user_id', user.id);
    }
  },
  [user, receitas]
);
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useReceitas.ts
git commit -m "feat: rewrite useReceitas to merge original + overrides"
```

---

## Task 3: Reescrever useSalvarReceita

**Files:**
- Modify: `hooks/useSalvarReceita.ts`

- [ ] **Step 1: Reescrever salvar — cria override em vez de cópia**

```typescript
const salvar = useCallback(
  async (receitaId: string, criadorId: string): Promise<string | null> => {
    if (!user) return null;
    setSalvando(true);

    // Buscar receita original para cache local
    const { data: original, error: fetchError } = await supabase
      .from('receitas')
      .select('*, ingredientes(*)')
      .eq('id', receitaId)
      .single();

    if (fetchError || !original) {
      setSalvando(false);
      return null;
    }

    // Criar override vazio (só o vínculo user → recipe)
    const agora = new Date().toISOString();
    const { error: overrideError } = await supabase
      .from('recipe_overrides')
      .insert({
        user_id: user.id,
        recipe_id: receitaId,
        fonte_atualizada_em: original.atualizada_em,
        criado_em: agora,
        atualizado_em: agora,
      });

    if (overrideError) {
      setSalvando(false);
      return null;
    }

    // Adicionar ao cache local como receita mesclada
    await adicionarAoCache({
      id: original.id,
      user_id: original.user_id,
      nome: original.nome,
      categorias: Array.isArray(original.categorias) ? original.categorias : [original.categoria ?? 'Carnes'],
      imagem: original.imagem,
      tempoPreparo: original.tempo_preparo,
      porcoes: original.porcoes,
      dificuldade: original.dificuldade,
      ingredientes: (original.ingredientes ?? []).map((i: any) => ({
        id: i.id,
        nome: i.nome,
        quantidade: parseFloat(i.quantidade),
        unidade: i.unidade,
      })),
      instrucoes: (original.instrucoes ?? []).map((inst: any) =>
        typeof inst === 'string' ? { texto: inst } : inst
      ),
      publica: original.publica,
      criadaEm: agora,
      atualizadaEm: agora,
      fonte_receita_id: original.id,
      fonte_atualizada_em: original.atualizada_em,
    });

    await supabase.rpc('incrementar_importacoes', { perfil_id: criadorId });

    setSalvando(false);
    return original.id;
  },
  [user]
);
```

- [ ] **Step 2: Reescrever remover — deleta override**

```typescript
const remover = useCallback(
  async (recipeId: string): Promise<void> => {
    if (!user) return;
    await supabase
      .from('recipe_overrides')
      .delete()
      .match({ user_id: user.id, recipe_id: recipeId });
  },
  [user]
);
```

- [ ] **Step 3: Remover gerarId — não é mais necessário**

Deletar a função `gerarId()` do arquivo.

- [ ] **Step 4: Commit**

```bash
git add hooks/useSalvarReceita.ts
git commit -m "feat: salvar receita creates override instead of full copy"
```

---

## Task 4: Atualizar ReceitaDetalhesScreen — podeEditar + toggle público

**Files:**
- Modify: `app/receita/[id]/index.tsx`

- [ ] **Step 1: Corrigir podeEditar**

Localizar a linha:
```typescript
const podeEditar = !!receitaLocal && receita?.user_id === user?.id;
```

Substituir por:
```typescript
const isOwnRecipe = receita?.user_id === user?.id && !receita?.fonte_receita_id;
const isSavedRecipe = !!receita?.fonte_receita_id;
const podeEditar = !!receitaLocal && (isOwnRecipe || isSavedRecipe);
```

- [ ] **Step 2: Ocultar toggle público para receitas salvas**

Localizar o botão de visibilidade no header (Eye/EyeOff):
```tsx
{podeEditar && (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <Pressable onPress={handleTogglePublicar} className="bg-black/30 rounded-full p-2">
```

Mudar para:
```tsx
{podeEditar && (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    {isOwnRecipe && (
      <Pressable onPress={handleTogglePublicar} className="bg-black/30 rounded-full p-2">
        {publica ? <Eye size={20} color="white" /> : <EyeOff size={20} color="white" />}
      </Pressable>
    )}
```

- [ ] **Step 3: Ocultar "Toggle público" do menu bottom sheet para receitas salvas**

Localizar o bloco do menu:
```tsx
{/* Toggle público */}
<Pressable
  onPress={handleTogglePublicar}
  ...
```

Envolver com:
```tsx
{isOwnRecipe && (
  <Pressable onPress={handleTogglePublicar} ...>
    ...
  </Pressable>
)}
```

- [ ] **Step 4: Atualizar texto "Compartilhada por" para "Salva de"**

Localizar:
```tsx
<AppText variant="muted" style={{ fontSize: 11, textAlign: 'right' }}>Compartilhada por</AppText>
```

Substituir por:
```tsx
<AppText variant="muted" style={{ fontSize: 11, textAlign: 'right' }}>Salva de</AppText>
```

- [ ] **Step 5: Commit**

```bash
git add app/receita/[id]/index.tsx
git commit -m "feat: fix podeEditar for saved recipes, hide toggle público"
```

---

## Task 5: Verificar feed — receitas salvas não devem aparecer duas vezes

**Files:**
- Read: `hooks/useFeed.ts`

- [ ] **Step 1: Confirmar que feed não mostra receitas com fonte_receita_id**

Ler `hooks/useFeed.ts` e verificar se a query do feed busca receitas de outros usuários. Após a migration, não existem mais cópias na tabela `receitas`, então o feed naturalmente só mostra originais. Verificar se há algum filtro explícito por `fonte_receita_id` que possa ser removido.

- [ ] **Step 2: Verificar useSalvarReceita no feed — retorno correto**

O feed usa `useSalvarReceita().salvar(receitaId, criadorId)` e recebe de volta um ID para marcar como salva. Com o novo modelo, retorna `original.id`. Verificar que a comparação no feed usa esse ID corretamente (normalmente compara com IDs salvos em AsyncStorage).

- [ ] **Step 3: Commit se necessário**

```bash
git add hooks/useFeed.ts  # só se houve mudança
git commit -m "fix: feed uses canonical recipe ids after override migration"
```

---

## Notas de implementação

- **Cache invalidado** com `@receitas_v3` — na primeira abertura após deploy, usuário busca do zero se offline. Comportamento aceitável.
- **Receitas salvas com `id = original.id`** — hearts, comentários e routing funcionam sem mapeamento adicional.
- **Receitas salvas com `user_id = criador_original`** — detectadas via `fonte_receita_id` (não-null). `podeEditar` usa esse campo como flag.
- **Override com todos os campos null** = receita não editada, idêntica ao original. Merging retorna o original.
- **Se original deletado** — `ON DELETE CASCADE` remove o override; a receita some do acervo do usuário.
