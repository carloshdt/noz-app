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
