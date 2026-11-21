-- Titulos dos mapas: agora ganham-se na onda 40 (o do Abismo Final continua na 50).
-- Quem ja tinha o titulo pela onda 50 continua a poder usa-lo. Corre no SQL Editor do Supabase ANTES de publicar a build 71.
create or replace function gog._title_ach(t text) returns text
language sql immutable set search_path = '' as $$
  select case t
    when 'reaper' then 'kills10000' when 'slayer' then 'kills50000' when 'treasure' then 'guard1' when 'tycoon' then 'spend100000'
    when 'veteran' then 'lv50' when 'legend' then 'lv100' when 'immortal' then 'lv120' when 'tireless' then 'farm25'
    when 'lord0' then 'wave0_40' when 'lord1' then 'wave1_40' when 'lord2' then 'wave2_40' when 'lord3' then 'wave3_40' when 'lord4' then 'wave4_40' when 'lord5' then 'wave5_50'
    when 'hardcore' then 'raid2' when 'nightmare' then 'raid3' when 'inferno' then 'raid4'
    when 'enchanter' then 'ench10' when 'armorer' then 'wmax5' when 'smith' then 'anv20' when 'lucky' then 'rar4' when 'dandy' then 'skin3'
    when 'lodestar' then 'stars6' when 'astro' then 'stars20' when 'emperor' then 'stars30' when 'abyss5' then 'presmax5' end;
$$;

create or replace function gog._title_ok(s jsonb, p_root bigint, t text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare a text;
begin
  if t is null or t = '' then return true; end if;
  if t = 'beta' then return exists (select 1 from gog.promo_used u where u.root = p_root and u.code = 'beta'); end if;
  a := gog._title_ach(t);
  if a is null then return false; end if;
  if t ~ '^lord[0-4]$' and gog._nv(s->'ach'->('wave' || substr(t, 5, 1) || '_50')) = 2 and gog._ach_ok('wave' || substr(t, 5, 1) || '_50', s) then return true; end if;   -- quem ganhou o titulo na onda 50 (antes) continua a poder usa-lo
  return gog._nv(s->'ach'->a) = 2 and gog._ach_ok(a, s);
end $$;
