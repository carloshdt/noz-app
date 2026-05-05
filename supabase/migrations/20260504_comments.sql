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

create policy "Autenticados leem comentarios publicos" on comments
  for select using (auth.role() = 'authenticated');

create policy "Usuario cria comentario" on comments
  for insert with check (auth.uid() = user_id);

create policy "Usuario deleta proprio comentario" on comments
  for delete using (auth.uid() = user_id);

create policy "Autenticados leem coracoes de comentarios" on comment_hearts
  for select using (auth.role() = 'authenticated');

create policy "Usuario gerencia proprio coracao de comentario" on comment_hearts
  for all using (auth.uid() = user_id);
