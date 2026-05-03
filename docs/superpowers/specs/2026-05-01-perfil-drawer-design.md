# Tela de Perfil com Drawer — Design Spec

## Objetivo

Adicionar menu lateral (drawer) com perfil do usuário, opção de editar nome e foto, e botão de logout ao app Noz.

## Contexto

O app já tem autenticação completa via Supabase (email/senha + Google OAuth). Há 3 abas: Receitas, Cardápio, Compras. Não existe ainda nenhuma forma de o usuário deslogar ou ver seu perfil.

---

## Funcionalidades

### 1. Drawer lateral

- Ícone ☰ (hambúrguer) no canto superior esquerdo do header de cada aba
- Toque no ☰ abre o drawer deslizando da esquerda
- Toque fora do drawer (overlay escuro) fecha o drawer
- O drawer sobrepõe o conteúdo sem alterar a estrutura de navegação

**Conteúdo do drawer:**
- Avatar circular (foto do perfil ou primeira letra do nome em maiúsculo como fallback)
- Nome do usuário
- Email do usuário (somente leitura)
- Botão "Editar perfil" → abre `app/perfil/editar.tsx` como modal
- Item "Configurações" — desabilitado, placeholder para versão futura
- Item "Ajuda" — desabilitado, placeholder para versão futura
- Botão "Sair" → executa logout e redireciona para `/(auth)/login`

### 2. Modal de edição de perfil (`app/perfil/editar.tsx`)

- Abre como modal (presentation: 'modal')
- Header: botão "Cancelar" (esquerda) + título "Editar perfil" + botão "Salvar" (direita)
- Avatar grande centralizado com ícone de câmera sobreposto que abre o seletor de imagem
- Campo "Nome" (editável)
- Campo "Email" (somente leitura, com texto explicativo abaixo)
- Ao salvar: faz upload da foto (se alterada) e atualiza o nome no banco

### 3. Banco de dados

**Tabela `profiles`:**
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  foto_url text,
  criado_em timestamptz default now()
);

-- RLS
alter table profiles enable row level security;
create policy "Usuário lê próprio perfil" on profiles
  for select using (auth.uid() = id);
create policy "Usuário atualiza próprio perfil" on profiles
  for update using (auth.uid() = id);

-- Trigger: cria perfil ao cadastrar usuário
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### 4. Supabase Storage

- Bucket: `avatars` (público para leitura, privado para escrita)
- Caminho por usuário: `avatars/{user_id}/avatar.jpg`
- RLS storage: usuário só faz upload/update no próprio caminho
- `foto_url` na tabela `profiles` armazena a URL pública do arquivo

---

## Arquitetura de Componentes

### `components/Drawer.tsx`
- Props: `visible: boolean`, `onClose: () => void`, `user: User`, `profile: Profile | null`
- Animated.Value para slide da esquerda (translateX: -280 → 0)
- Overlay com opacidade animada
- Chama `signOut` do `useAuth` no botão Sair
- Navega para `app/perfil/editar` no botão Editar perfil

### `hooks/useProfile.ts`
- `profile: Profile | null` — dados do perfil carregados do Supabase
- `loading: boolean`
- `updateProfile(nome: string, fotoUri?: string): Promise<void>` — atualiza nome e/ou foto
  - Se `fotoUri` fornecido: faz upload para Storage, obtém URL pública, salva em `foto_url`
  - Atualiza tabela `profiles`
- `refreshProfile(): Promise<void>` — recarrega do banco

### `app/_layout.tsx`
- Adiciona `<Stack.Screen name="perfil/editar" options={{ presentation: 'modal' }} />` ao Stack

### `app/(tabs)/_layout.tsx`
- Adiciona estado `drawerVisible: boolean`
- Passa `headerLeft` em `screenOptions` com o ícone ☰
- Renderiza `<Drawer>` fora do `<Tabs>`, posicionado absolutamente sobre tudo

### `app/perfil/editar.tsx`
- Usa `useProfile` para carregar dados iniciais
- `expo-image-picker` para selecionar foto da galeria
- Mostra preview da foto selecionada antes de salvar
- Ao salvar: chama `updateProfile`, fecha modal

---

## Fluxo de navegação

```
☰ (header) 
  → drawer abre (slide da esquerda)
    → "Editar perfil" → app/perfil/editar.tsx (modal)
      → Salvar → fecha modal, drawer atualiza avatar/nome
    → "Sair" → signOut() → router.replace('/(auth)/login')
  → toque fora → drawer fecha
```

---

## Bibliotecas necessárias

- `expo-image-picker` — seleção de foto da galeria (já pode estar instalada)
- Nenhuma dependência nova de navegação

---

## Fora do escopo (desta versão)

- Tela de Configurações (placeholder no drawer)
- Tela de Ajuda (placeholder no drawer)
- Alterar email
- Alterar senha via perfil
- Foto de capa
