create or replace function create_member_safely(
  p_member_number text,
  p_email text,
  p_full_name text
) returns table (
  email text
) language plpgsql security definer as $$
declare
  v_member record;
begin
  -- First try to get existing member
  select * into v_member from members 
  where member_number = p_member_number;
  
  if found then
    return query select v_member.email;
    return;
  end if;

  -- Try to create new member
  return query 
  insert into members (
    member_number,
    email,
    full_name,
    verified,
    profile_updated,
    password_changed,
    email_verified,
    status
  ) values (
    p_member_number,
    p_email,
    p_full_name,
    true,
    false,
    false,
    true,
    'active'
  )
  on conflict (member_number) do update 
    set member_number = excluded.member_number
  returning email;
  
  exception when unique_violation then
    -- If we hit a race condition, return the existing member
    return query 
    select email from members 
    where member_number = p_member_number;
end;
$$;