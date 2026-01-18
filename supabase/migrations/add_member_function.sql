-- Fonction RPC pour ajouter un membre (contourne les RLS)
create or replace function add_team_member(
  p_display_name text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_user_type text,
  p_organization_id uuid
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_id uuid;
begin
  -- Générer un UUID pour user_id
  v_member_id := gen_random_uuid();

  -- Insérer le profil
  insert into user_profiles (
    user_id,
    display_name,
    first_name,
    last_name,
    phone,
    user_type,
    is_active,
    organization_id,
    notification_preferences,
    language,
    timezone
  ) values (
    v_member_id,
    p_display_name,
    p_first_name,
    p_last_name,
    p_phone,
    p_user_type,
    true,
    p_organization_id,
    '{"email": true, "push": true, "sms": false}'::jsonb,
    'fr',
    'Europe/Paris'
  );

  return json_build_object(
    'success', true,
    'message', 'Membre ajouté avec succès',
    'member_id', v_member_id
  );
exception when others then
  return json_build_object(
    'success', false,
    'error', SQLERRM
  );
end;
$$;
