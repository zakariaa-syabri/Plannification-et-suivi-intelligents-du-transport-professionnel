-- RPC Function: Vérifier l'unicité d'un slug (bypass RLS)
-- Cette fonction est appelée lors de la création d'une organisation
-- Elle retourne true si le slug est disponible, false s'il est déjà utilisé

create or replace function check_slug_available(p_slug text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists(
    select 1 from organizations where slug = p_slug
  ) into v_exists;

  return not v_exists; -- true si NOT exists (c'est-à-dire disponible)
end;
$$;

grant execute on function check_slug_available(text) to authenticated;
grant execute on function check_slug_available(text) to anon;
