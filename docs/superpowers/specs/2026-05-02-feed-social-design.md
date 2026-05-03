# Feed Social — Design Spec (Sprint 1)
**Data:** 2026-05-02
**Status:** Aprovado

---

## Visão Geral

Nova aba **Feed** no app Noz: scroll de receitas públicas de outros usuários, com salvamento de receitas para o acervo pessoal e perfil público de criadores. Sprint 1 foca no core social (descoberta + salvar). Likes, comentários e rankings ficam para Sprint 2.

---

## Escopo da Sprint 1

| Feature | Incluído |
|---------|----------|
| Aba Feed com scroll snap (1 receita por tela) | ✅ |
| Card de receita no feed | ✅ |
| Salvar receita (cópia independente) | ✅ |
| Badge de atualização da receita original | ✅ |
| Publicar/despublicar receita (toggle) | ✅ |
| Perfil público de criador | ✅ |
| Conta oficial @noz (seed content) | ✅ |
| Likes e comentários | ❌ Sprint 2 |
| Rankings/gamificação | ❌ Sprint 2 |
| Busca no feed | ❌ Sprint 2 |
| Notificações push | ❌ Sprint 2 |

---

## Navegação

Barra de tabs: **Receitas · Feed · Cardápio · Compras**

Feed ocupa a segunda posição (centro-esquerda), equilibrando uso pessoal e social.

---

## Feed

### Comportamento
- Scroll com snap — 1 receita por tela, desliza verticalmente para a próxima
- Carrega em lotes de 10 (paginação por cursor)
- Ordenação híbrida: `score = recência + (importações * peso)` — evita feed só cronológico sem penalizar novos criadores excessivamente

### Card (layout A)
- Imagem da receita ocupa ~60% superior da tela
- Fallback visual com emoji 🍽 quando sem foto (não quebra sem imagem)
- Área branca inferior: nome do criador (clicável → perfil), nome da receita, tempo + porções + dificuldade
- Botão "**+ Salvar nas minhas receitas**" — ação principal, largura total

### Seed Content — Conta @noz
- Perfil oficial do app pré-criado no Supabase com receitas curadas
- Novos usuários veem o feed populado desde o primeiro acesso
- Evolui para canal editorial (receitas da estação, tendências, etc.)

---

## Publicar Receitas

- `publica = true` por **default** ao criar receita (mudança do comportamento atual)
- Toggle "Tornar privada" disponível na tela de detalhes e edição da receita
- Receitas privadas não aparecem no feed, mas continuam no acervo pessoal

---

## Salvar Receita (Importar)

- Ação: "**+ Salvar nas minhas receitas**"
- Cria uma **cópia independente** no acervo do usuário — editável, não linkada
- Guarda referência de origem: `fonte_receita_id` + `fonte_atualizada_em`
- Se o criador atualizar a receita original, aparece badge discreto: *"Original atualizada · ver"*
- Usuário decide manualmente se quer ver e aplicar as mudanças — sem merge automático
- Incrementa contador `total_importacoes` no perfil do criador

---

## Perfil Público

Acessível tocando no nome/foto do criador no feed.

**Conteúdo:**
- Foto, nome
- Contador de receitas públicas
- Contador de importações recebidas (total vezes que alguém salvou suas receitas)
- Grid de receitas públicas do criador
- (Sprint 2) Badges de gamificação, ranking

**Privacidade:** qualquer usuário autenticado pode ver o perfil público de qualquer outro.

---

## Arquitetura

### Novas telas
| Rota | Descrição |
|------|-----------|
| `app/(tabs)/feed.tsx` | Aba Feed — scroll snap |
| `app/perfil/[id].tsx` | Perfil público de usuário |

### Hooks novos
| Hook | Responsabilidade |
|------|-----------------|
| `hooks/useFeed.ts` | Busca receitas públicas paginadas, ordenação híbrida |
| `hooks/usePublicar.ts` | Toggle publica/privada na receita do usuário |
| `hooks/useSalvarReceita.ts` | Copia receita para acervo, rastreia origem |

### Componentes novos
| Componente | Descrição |
|------------|-----------|
| `components/FeedCard.tsx` | Card full-screen de receita no feed |
| `components/PerfilPublico.tsx` | Header de perfil (foto, nome, contadores) |

### Schema — mudanças no Supabase

```sql
-- Novo default: receitas públicas
ALTER TABLE public.receitas ALTER COLUMN publica SET DEFAULT true;

-- Rastreamento de origem nas cópias
ALTER TABLE public.receitas
  ADD COLUMN fonte_receita_id uuid REFERENCES public.receitas(id) ON DELETE SET NULL,
  ADD COLUMN fonte_atualizada_em timestamptz;

-- Contador denormalizado para performance
ALTER TABLE public.profiles
  ADD COLUMN total_importacoes int DEFAULT 0 NOT NULL;

-- Perfil público: leitura aberta para usuários autenticados
CREATE POLICY "Perfil público leitura" ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Feed: ler receitas públicas de qualquer usuário (já existe, confirmar)
-- "Usuário lê próprias receitas e públicas" cobre isso
```

### Ordenação híbrida (useFeed)

```typescript
// Score calculado no cliente após fetch, ou via Supabase RPC futuramente
score = (diasDesdePublicacao: number, importacoes: number) =>
  1 / (diasDesdePublicacao + 1) + importacoes * 0.1;
```

---

## RLS e Segurança

- Feed lê apenas receitas com `publica = true` — RLS já cobre isso
- Salvar receita: INSERT com `user_id = auth.uid()` — RLS cobre
- Perfil público: SELECT em `profiles` aberto para autenticados
- Contador `total_importacoes`: incrementado via função Supabase (evita race condition no cliente)

---

## Conta @noz

- Criada manualmente no Supabase Auth + profiles
- Credenciais guardadas em variável de ambiente (não no código)
- Script de seed popula 10-15 receitas curadas na criação
- Email: `noz@noz.app` (requer domínio configurado no Resend — ver IDEAS.md)

---

## O que NÃO está neste design

- Likes, comentários, notificações → Sprint 2
- Rankings/gamificação com badges → Sprint 2
- Busca e filtros no feed → Sprint 2
- Seguir criadores → Sprint 2+
- Monetização (receitas promovidas) → futuro
