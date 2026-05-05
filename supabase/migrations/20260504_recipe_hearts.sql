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
