create or replace function public.decrementar_importacoes(perfil_id uuid)
returns void as $$
begin
  update public.profiles
  set total_importacoes = greatest(0, total_importacoes - 1)
  where id = perfil_id;
end;
$$ language plpgsql security definer;

grant execute on function public.decrementar_importacoes(uuid) to authenticated;
