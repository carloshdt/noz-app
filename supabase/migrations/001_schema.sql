-- supabase/migrations/001_schema.sql

-- Tabela de perfis (extensão de auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  nome text not null,
  foto_url text,
  criado_em timestamptz default now() not null
);

-- Criar perfil automaticamente ao cadastrar usuário
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Tabela de receitas
create table public.receitas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  categoria text not null,
  imagem text,
  tempo_preparo int not null,
  porcoes int not null,
  dificuldade text not null,
  instrucoes text[] default '{}' not null,
  publica boolean default false not null,
  criada_em timestamptz default now() not null,
  atualizada_em timestamptz default now() not null
);

-- Tabela de ingredientes
create table public.ingredientes (
  id uuid default gen_random_uuid() primary key,
  receita_id uuid references public.receitas(id) on delete cascade not null,
  nome text not null,
  quantidade text not null,
  unidade text not null
);

-- RLS: profiles
alter table public.profiles enable row level security;

create policy "Usuário lê próprio perfil" on public.profiles
  for select using (auth.uid() = id);
create policy "Usuário atualiza próprio perfil" on public.profiles
  for update using (auth.uid() = id);

-- RLS: receitas
alter table public.receitas enable row level security;

create policy "Usuário lê próprias receitas e públicas" on public.receitas
  for select using (auth.uid() = user_id or publica = true);
create policy "Usuário cria próprias receitas" on public.receitas
  for insert with check (auth.uid() = user_id);
create policy "Usuário edita próprias receitas" on public.receitas
  for update using (auth.uid() = user_id);
create policy "Usuário remove próprias receitas" on public.receitas
  for delete using (auth.uid() = user_id);

-- RLS: ingredientes
alter table public.ingredientes enable row level security;

create policy "Ingredientes seguem acesso da receita" on public.ingredientes
  for select using (
    exists (
      select 1 from public.receitas
      where id = receita_id and (user_id = auth.uid() or publica = true)
    )
  );
create policy "Usuário gerencia ingredientes das próprias receitas" on public.ingredientes
  for all using (
    exists (
      select 1 from public.receitas
      where id = receita_id and user_id = auth.uid()
    )
  );
