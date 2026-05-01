# Design: Sistema de Autenticação — Noz

**Data:** 2026-05-01  
**Status:** Aprovado

---

## Contexto

O Noz é um app de receitas em processo de produtização. O sistema de auth é a fundação para receitas por usuário, suporte offline e o feed social planejado.

---

## Decisões

- **Backend:** Supabase (Auth + Postgres)
- **Social login:** Google e Apple
- **Email/senha:** suportado como opção secundária
- **Offline:** AsyncStorage como cache local, sync com Supabase quando online
- **Dados existentes:** app começa do zero, sem migração

---

## Fluxo de Telas

```
Splash
  └─► verifica sessão ativa
        ├─► sessão válida → App (tabs)
        └─► sem sessão → Tela de Login

Tela de Login (social primeiro)
  ├─► Entrar com Google → App
  ├─► Entrar com Apple → App
  ├─► Entrar com email → Tela Login Email → App
  ├─► Criar conta → Tela Cadastro → App
  └─► Esqueci a senha → email de reset

Tela Login Email
  - Campos: email, senha
  - Link "Esqueci a senha"

Tela Cadastro
  - Campos: nome, email, senha (tela única)
  - Após criar conta: login automático → App
```

---

## Arquitetura

### Autenticação
- `@supabase/supabase-js` para auth
- Supabase persiste o token localmente via AsyncStorage
- No boot do app: verifica `supabase.auth.getSession()` — se válida, vai direto ao app

### Banco de Dados (Supabase Postgres)

**Tabela `profiles`** (extensão da tabela `auth.users` do Supabase)
```
id          uuid (FK → auth.users.id)
nome        text
foto_url    text (nullable)
criado_em   timestamptz
```

**Tabela `receitas`**
```
id            uuid
user_id       uuid (FK → auth.users.id)
nome          text
categoria     text
tempo_preparo int
porcoes       int
dificuldade   text
publica       boolean (default: false)
criada_em     timestamptz
atualizada_em timestamptz
```

**Tabela `ingredientes`**
```
id          uuid
receita_id  uuid (FK → receitas.id)
nome        text
quantidade  text
unidade     text
```

**Tabela `instrucoes`**
```
id          uuid
receita_id  uuid (FK → receitas.id)
ordem       int
descricao   text
```

Row Level Security (RLS):
- Usuário só lê/escreve as próprias receitas privadas
- Receitas com `publica = true` são legíveis por todos (base para o feed)

### Suporte Offline
- Ao carregar receitas: busca do Supabase e salva no AsyncStorage
- Sem internet: lê do AsyncStorage
- Ao voltar online: sincroniza alterações locais para o Supabase
- Conflito de sync: versão mais recente por `atualizada_em` vence

---

## Telas a Implementar

1. **`app/auth/login.tsx`** — social primeiro (Google, Apple, link p/ email)
2. **`app/auth/login-email.tsx`** — formulário email + senha
3. **`app/auth/cadastro.tsx`** — formulário nome + email + senha
4. **`app/auth/esqueci-senha.tsx`** — input de email, envia link de reset

### Navegação
- Stack separado `app/(auth)/` para telas de auth (sem tabs)
- `app/_layout.tsx` decide entre `(auth)` e `(tabs)` baseado na sessão

---

## Hook `useAuth`

```ts
// hooks/useAuth.ts
{
  user: User | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signInWithEmail: (email, senha) => Promise<void>
  signUp: (nome, email, senha) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email) => Promise<void>
}
```

---

## Conta Oficial "Noz"

- Conta criada manualmente no Supabase com email oficial
- Usada para popular o feed com receitas curadas antes de ter usuários reais
- `user_id` fixo referenciado nas receitas seed

---

## Fora de Escopo (desta fase)

- Foto de perfil no cadastro (adicionada depois nas configurações)
- Feed social e likes (ver IDEIAS.md)
- Verificação de email obrigatória
- Autenticação por telefone/SMS
