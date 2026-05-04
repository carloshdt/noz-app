# Perfil Social + Badges — Design

**Goal:** Reformular tela de perfil (próprio e público) com foco em rede social: 4 stats, conquistas (solo + categoria + influência), tabs Criadas/Salvas. Renomear "importar" → "salvar" em toda UI.

**Architecture:** `useProfile` já existe — estender com stats agregados. Badges computados no cliente a partir de receitas + stats (sem tabela extra). Perfil próprio = `app/(tabs)/perfil.tsx`; perfil público = `app/perfil/[id].tsx` — mesmo layout, modo somente-leitura. Tabs Criadas/Salvas gerenciadas em `useReceitas` (receitas com `fonte_receita_id != null` = salvas).

**Tech Stack:** Supabase, React Native, NativeWind, expo-router.

**Dependências:** Corações e Comentários devem existir antes para stats precisas (mas perfil funciona com 0 se ainda não implementados).

---

## Renomeação "importar" → "salvar"

| Arquivo | De | Para |
|---------|-----|------|
| `components/ReceitaCard.tsx` | "Compartilhada por" | "Salva de" |
| `app/(tabs)/perfil.tsx` | "importações" | "salvas" |
| `app/perfil/[id].tsx` | "importações" | "salvas" |
| `components/FeedCard.tsx` | botão "Salvar" (já OK) | manter |
| `profiles.total_importacoes` | coluna DB — manter nome, só mudar UI | — |

---

## Stats do perfil

Calculadas ao carregar o perfil:

```ts
type ProfileStats = {
  totalReceitas: number;           // receitas.length
  totalSalvas: number;             // profile.total_importacoes (coluna DB existente)
  totalCorações: number;           // COUNT de recipe_hearts onde recipe.user_id = id
  totalComentarios: number;        // COUNT de comments onde recipe.user_id = id
}
```

Query para corações recebidos:
```sql
select count(*) from recipe_hearts rh
join receitas r on r.id = rh.recipe_id
where r.user_id = $userId
```

Query para comentários recebidos:
```sql
select count(*) from comments c
join receitas r on r.id = c.recipe_id
where r.user_id = $userId
```

Ambas executadas no `useProfile` ao carregar, expostas como `stats`.

---

## Sistema de Badges

**Arquivo:** `lib/badges.ts`

Badges computados — sem tabela no DB. Função pura recebe dados e retorna lista de badges com `unlocked: boolean`.

```ts
type Badge = {
  id: string;
  label: string;
  emoji: string;
  grupo: 'solo' | 'categoria' | 'influencia';
  unlocked: boolean;
  descricao: string; // condição ex: "Criar 5 receitas"
}

function computarBadges(
  receitas: Receita[],
  stats: ProfileStats
): Badge[]
```

### Badges Solo (grupo: 'solo', cor amarela)
| id | emoji | label | Condição |
|----|-------|-------|----------|
| `primeira-receita` | 🍳 | Primeira receita | ≥ 1 receita criada |
| `receita-completa` | 📸 | Receita completa | 1+ receita com foto + ingredientes + instruções |
| `5-receitas` | 🌿 | 5 receitas | ≥ 5 receitas |
| `10-receitas` | 🌳 | 10 receitas | ≥ 10 receitas |
| `chef-diversificado` | 🎨 | Chef diversificado | Receitas em ≥ 3 categorias distintas |
| `50-receitas` | 🏅 | 50 receitas | ≥ 50 receitas |

### Badges por Categoria (grupo: 'categoria', cor amarela)
Para cada categoria em `CATEGORIAS` (exceto "Todas"), gera 3 badges:
- `5-{cat}`: 5 receitas dessa categoria
- `25-{cat}`: 25 receitas dessa categoria  
- `50-{cat}`: 50 receitas dessa categoria

Só exibe badges de categorias onde o usuário tem ≥ 1 receita (para não poluir com 50 badges travados).

### Badges de Influência (grupo: 'influencia', cor roxa)
| id | emoji | label | Condição |
|----|-------|-------|----------|
| `primeira-salva` | ⭐ | 1ª receita salva | stats.totalSalvas ≥ 1 |
| `10-salvas` | 🔥 | 10 salvas | stats.totalSalvas ≥ 10 |
| `50-salvas` | 🏆 | 50 salvas | stats.totalSalvas ≥ 50 |
| `primeiro-coracao` | 💛 | 1º coração | stats.totalCorações ≥ 1 |
| `10-coracoes` | ✨ | 10 corações | stats.totalCorações ≥ 10 |
| `primeiro-comentario` | 💬 | 1º comentário | stats.totalComentarios ≥ 1 |

---

## Layout do Perfil

### Próprio (`app/(tabs)/perfil.tsx`)

```
[Avatar com botão ✏ editar]
[Nome]
[Chef desde {data}]

[4 stats: receitas | salvas | corações | comentários]

[Conquistas]
  [label: Suas ações]
  [chips badges solo — desbloqueados + próximos bloqueados]
  [label: Por categoria]
  [chips badges categoria — só categorias com ≥1 receita]
  [label: Influência]
  [chips badges influência]

[Tabs: Criadas (N) | Salvas (N)]
[Grid 3 colunas de receitas]
  [cada card: imagem + contagem 💬 sobreposta]
```

### Público (`app/perfil/[id].tsx`)

Mesmo layout, sem botão editar. Stats mostram dados públicos do usuário. Badges computados com dados públicos. Sem tab "Salvas" (privado). Grid só receitas públicas.

---

## Tabs Criadas / Salvas

- **Criadas:** `receitas.filter(r => !r.fonte_receita_id)` — receitas originais do usuário
- **Salvas:** `receitas.filter(r => !!r.fonte_receita_id)` — receitas salvas de outros chefs

Ambas já disponíveis em `useReceitas`.

---

## Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Create | `lib/badges.ts` |
| Create | `__tests__/lib/badges.test.ts` |
| Modify | `hooks/useProfile.ts` — adicionar stats agregados |
| Modify | `app/(tabs)/perfil.tsx` — novo layout |
| Modify | `app/perfil/[id].tsx` — novo layout (modo público) |
| Modify | `components/ReceitaCard.tsx` — "Salva de" |

---

## Ordem de implementação sugerida

1. `lib/badges.ts` + testes (puro, sem deps)
2. `useProfile` stats
3. Layout perfil próprio
4. Layout perfil público
5. Renomeações UI
