-- Reforco do anti-cheat (um jogador editou o save: atributos 1e55, ouro inventado).
-- 1) gog._n / gog._nv passam a ler valores enormes e em notacao cientifica (antes devolviam 0 e as verificacoes deixavam-nos passar);
-- 2) gog._sane valida itens (nivel/encantamento/estrelas), niveis de arma, pedras, copias e as builds guardadas;
-- 3) historico de saves (gog.save_history): guarda o save anterior de cada personagem, no maximo 1 a cada 6 h, os 4 mais recentes.
-- Corre no SQL Editor do Supabase (precisa do update-attr-check.sql ja corrido). Para as regras valerem o anti-cheat tem de estar LIGADO (server/anticheat-on.sql).

create or replace function gog._n(j jsonb, variadic p text[]) returns numeric
language plpgsql immutable set search_path = '' as $$
declare t text;
begin
  t := j #>> p;
  if t is not null and t ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then return t::numeric; end if;   -- qualquer tamanho/notacao cientifica (antes valores enormes davam 0 e passavam)
  return 0;
end $$;

create or replace function gog._nv(j jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare t text;
begin
  t := j #>> '{}';
  if t is not null and t ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then return t::numeric; end if;   -- qualquer tamanho/notacao cientifica (antes valores enormes davam 0 e passavam)
  return 0;
end $$;

create or replace function gog._item_bad(it jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(it) = 'object' and (gog._n(it, 'il') > 125 or gog._n(it, 'il') < 0 or gog._n(it, 'ench') > 12 or gog._n(it, 'ench') < 0 or gog._n(it, 'st') > 3 or gog._n(it, 'st') < 0 or gog._n(it, 'r') > 4 or gog._n(it, 'r') < 0)
$$;
create or replace function gog._sane(s jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare b jsonb; it jsonb; lim numeric; tot numeric;
begin
  lim := 3 * (gog._n(s, 'pl', 'lv') - 1) + least(gog._n(s, 'buyN'), 1200) + 30;
  if gog._n(s, 'pts') < 0 or gog._n(s, 'buyN') < 0 or gog._n(s, 'pts') > 100000 then return 'abs:neg'; end if;
  if jsonb_typeof(s->'lo'->'b') = 'array' then   -- builds guardadas (loadouts)
    for b in select x from jsonb_array_elements(s->'lo'->'b') x loop
      if jsonb_typeof(b->'attr') = 'object' then
        select coalesce(sum(case when e.value ~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then e.value::numeric else 1e12 end), 0) into tot from jsonb_each_text(b->'attr') e;
        if tot > lim then return 'abs:attrs'; end if;
      end if;
      if jsonb_typeof(b->'gear') = 'object' then for it in select e.value from jsonb_each(b->'gear') e loop if gog._item_bad(it) then return 'abs:items'; end if; end loop; end if;
    end loop;
  end if;
  if jsonb_typeof(s->'wl') = 'object' and exists (select 1 from jsonb_each_text(s->'wl') e where e.value !~ '^[0-9]{1,2}$' or e.value::numeric > 25) then return 'abs:wl'; end if;
  if jsonb_typeof(s->'stones') = 'array' and exists (select 1 from jsonb_array_elements_text(s->'stones') e where e !~ '^[0-9]{1,7}$') then return 'abs:stones'; end if;
  if jsonb_typeof(s->'wst') = 'object' and exists (select 1 from jsonb_each(s->'wst') w, jsonb_array_elements_text(case when jsonb_typeof(w.value) = 'array' then w.value else '[]'::jsonb end) e where e !~ '^[0-9]{1,7}$') then return 'abs:copies'; end if;
  if jsonb_typeof(s->'gear') = 'object' then for it in select e.value from jsonb_each(s->'gear') e loop if gog._item_bad(it) then return 'abs:items'; end if; end loop; end if;
  if jsonb_typeof(s->'bag') = 'array' then for it in select x from jsonb_array_elements(s->'bag') x loop if gog._item_bad(it) then return 'abs:items'; end if; end loop; end if;
  return null;
end $$;

-- historico de saves: guarda o save anterior de cada personagem (no maximo 1 a cada 6 h, os 4 mais recentes) para poder repor um save adulterado
create table if not exists gog.save_history (id bigserial primary key, player_id bigint not null references gog.players(id) on delete cascade, at timestamptz not null default now(), save jsonb not null);
create index if not exists save_history_idx on gog.save_history (player_id, at desc);
alter table gog.save_history enable row level security; revoke all on gog.save_history from public;
create or replace function gog._save_snap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.save is not null and new.save is distinct from old.save and not exists (select 1 from gog.save_history h where h.player_id = old.id and h.at > now() - interval '6 hours') then
    insert into gog.save_history (player_id, save) values (old.id, old.save);
    delete from gog.save_history where player_id = old.id and id not in (select id from gog.save_history where player_id = old.id order by at desc limit 4);
  end if;
  return new;
end $$;
drop trigger if exists save_snap on gog.players;
create trigger save_snap before update of save on gog.players for each row execute function gog._save_snap();


do $$
declare f text; def text; a1 text := E'    return ''abs:attrs'';
  end if;
'; a2 text := E'  -- conquistas: so as novas precisam de prova no proprio save'; call text := E'  if gog._sane(nw) is not null then return gog._sane(nw); end if;
';
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('gog._sane' in def) = 0 then
      if position(a1 in def) > 0 then def := replace(def, a1, a1 || call);
      elsif position(a2 in def) > 0 then def := replace(def, a2, call || a2);
      else continue; end if;
      execute def;
    end if;
  end loop;
end $$;
