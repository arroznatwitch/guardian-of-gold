-- Missoes diarias: o servidor passa a aceitar as conquistas daily1/5/25/50/100/250 (prova: save.daily.n).
-- Corre no SQL Editor do Supabase (so substitui esta funcao).
create or replace function gog._ach_ok(id text, s jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare m text[]; n numeric; c int; k int; cl text;
begin
  m := regexp_match(id, '^(kills|boss|guard|spend|fuse)([0-9]+)$');
  if m is not null then
    return gog._n(s, 'stats', case m[1] when 'kills' then 'kills' when 'boss' then 'bosses' when 'guard' then 'guard' when 'spend' then 'spent' else 'fuses' end) >= m[2]::numeric;
  end if;
  m := regexp_match(id, '^lv([0-9]+)$');
  if m is not null then return gog._n(s, 'pl', 'lv') >= m[1]::numeric; end if;
  m := regexp_match(id, '^daily([0-9]+)$');   -- missoes diarias: so conta o que o save prova (contador d.n)
  if m is not null then return gog._n(s, 'daily', 'n') >= m[1]::numeric; end if;
  if id = 'bag5' then return gog._n(s, 'bagSlots') >= 5; end if;
  m := regexp_match(id, '^anv([0-9]+)$');
  if m is not null then
    return coalesce((select max(case when e.value ~ '^[0-9]{1,3}$' then e.value::numeric else 0 end) from jsonb_each_text(case when jsonb_typeof(s->'wl') = 'object' then s->'wl' else '{}'::jsonb end) e), 0) >= m[1]::numeric;
  end if;
  if id = 'rar3' then return gog._n(s, 'stats', 'rar') >= 3; end if;
  if id = 'rar4' then return gog._n(s, 'stats', 'rar') >= 4; end if;
  m := regexp_match(id, '^stars([0-9]+)$');
  if m is not null then
    return coalesce((select sum(gog._nv(e)) from jsonb_array_elements(case when jsonb_typeof(s->'pres') = 'array' then s->'pres' else '[]'::jsonb end) e), 0) >= m[1]::numeric;
  end if;
  m := regexp_match(id, '^presmax([0-5])$');
  if m is not null then return gog._nv(gog._idx(s->'pres', m[1]::int)) >= 5; end if;
  m := regexp_match(id, '^farm([0-9]+)$');
  if m is not null then
    n := m[1]::numeric;
    for k in 0..5 loop if gog._nv(gog._idx(s->'farmN', k)) < n then return false; end if; end loop;
    return true;
  end if;
  m := regexp_match(id, '^wave([0-5])_([0-9]+)$');
  if m is not null then return gog._nv(gog._idx(s->'farmBest', m[1]::int)) >= m[2]::numeric; end if;
  m := regexp_match(id, '^raid([0-4])$');
  if m is not null then
    c := 0;
    for k in 0..5 loop if gog._nv(gog._idx(gog._idx(s->'raids', k), m[1]::int)) > 0 then c := c + 1; end if; end loop;
    return c = 6;
  end if;
  m := regexp_match(id, '^ench(5|10)$');
  if m is not null then
    c := 0;
    foreach cl in array array['head', 'chest', 'boots', 'amulet'] loop
      if gog._n(s, 'gear', cl, 'ench') >= m[1]::numeric then c := c + 1; end if;
    end loop;
    return c = 4;
  end if;
  m := regexp_match(id, '^wmax([1-5])$');
  if m is not null then
    return (select count(*) from jsonb_each(case when jsonb_typeof(s->'wst') = 'object' then s->'wst' else '{}'::jsonb end) w
            where jsonb_typeof(w.value) = 'array' and gog._nv(w.value -> 3) > 0) >= m[1]::int;
  end if;
  if id in ('skin1', 'skin3') then
    c := 0;
    foreach cl in array array['knight', 'archer', 'mage'] loop
      if jsonb_typeof(s->'sk'->cl) = 'array' and jsonb_array_length(s->'sk'->cl) >= 6
         and not exists (select 1 from jsonb_array_elements(s->'sk'->cl) e where e <> '1'::jsonb) then c := c + 1; end if;
    end loop;
    return c >= case id when 'skin1' then 1 else 3 end;
  end if;
  return false;
end $$;
