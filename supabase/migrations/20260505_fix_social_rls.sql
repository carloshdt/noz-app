drop policy if exists "Qualquer autenticado lê corações" on public.recipe_hearts;
drop policy if exists "Qualquer autenticado lÃª coraÃ§Ãµes" on public.recipe_hearts;
drop policy if exists "Usuario gerencia proprio coracao" on public.recipe_hearts;
drop policy if exists "Usuário gerencia próprio coração" on public.recipe_hearts;
drop policy if exists "UsuÃ¡rio gerencia prÃ³prio coraÃ§Ã£o" on public.recipe_hearts;
drop policy if exists "recipe_hearts_select_authenticated" on public.recipe_hearts;
drop policy if exists "recipe_hearts_insert_own" on public.recipe_hearts;
drop policy if exists "recipe_hearts_delete_own" on public.recipe_hearts;

grant usage on schema public to authenticated;
grant select, insert, delete on public.recipe_hearts to authenticated;

create policy "recipe_hearts_select_authenticated" on public.recipe_hearts
  for select
  using (auth.role() = 'authenticated');

create policy "recipe_hearts_insert_own" on public.recipe_hearts
  for insert
  with check (auth.uid() = user_id);

create policy "recipe_hearts_delete_own" on public.recipe_hearts
  for delete
  using (auth.uid() = user_id);

drop policy if exists "Autenticados leem comentarios publicos" on public.comments;
drop policy if exists "Usuario cria comentario" on public.comments;
drop policy if exists "Usuario deleta proprio comentario" on public.comments;
drop policy if exists "comments_select_authenticated" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
drop policy if exists "comments_delete_own_or_recipe_owner" on public.comments;

grant select, insert, delete on public.comments to authenticated;

create policy "comments_select_authenticated" on public.comments
  for select
  using (auth.role() = 'authenticated');

create policy "comments_insert_own" on public.comments
  for insert
  with check (auth.uid() = user_id);

create policy "comments_delete_own_or_recipe_owner" on public.comments
  for delete
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.receitas r
      where r.id = comments.recipe_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "Autenticados leem coracoes de comentarios" on public.comment_hearts;
drop policy if exists "Usuario gerencia proprio coracao de comentario" on public.comment_hearts;
drop policy if exists "comment_hearts_select_authenticated" on public.comment_hearts;
drop policy if exists "comment_hearts_insert_own" on public.comment_hearts;
drop policy if exists "comment_hearts_delete_own" on public.comment_hearts;

grant select, insert, delete on public.comment_hearts to authenticated;

create policy "comment_hearts_select_authenticated" on public.comment_hearts
  for select
  using (auth.role() = 'authenticated');

create policy "comment_hearts_insert_own" on public.comment_hearts
  for insert
  with check (auth.uid() = user_id);

create policy "comment_hearts_delete_own" on public.comment_hearts
  for delete
  using (auth.uid() = user_id);
