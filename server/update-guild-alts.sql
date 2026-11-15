-- Guildas: cada personagem (classe) e um membro separado (entra a parte e ocupa uma vaga).
-- Corre no SQL Editor do Supabase. Os membros atuais mantem-se (ficam associados ao personagem principal).

create or replace function public.gog_board(p_stat text, p_limit int default 20, p_token text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare col text; lim int := least(greatest(coalesce(p_limit, 20), 1), 50); rows jsonb; me jsonb; pid bigint; mine bigint;
begin
  col := case p_stat when 'level' then 'level' when 'kills' then 'kills' when 'gold' then 'gold' when 'bosses' then 'bosses' when 'raids' then 'raids'
                     when 'wave0' then 'w0' when 'wave1' then 'w1' when 'wave2' then 'w2' when 'wave3' then 'w3' when 'wave4' then 'w4' when 'wave5' then 'w5' end;
  if col is null then return jsonb_build_object('ok', false, 'error', 'bad_stat'); end if;
  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object('rank', r, 'nick', nick, 'cls', cls, 'value', v, 'lv', lv, 'skin', skin, 'title', title, 'gtag', gtag, 'gcol', gcol, 'gender', gender, 'country', country) order by r), '[]'::jsonb) from (
      select nick, cls, gender, country, level as lv, coalesce((build->>'skin')::int, 0) as skin, build->>'title' as title,
        (select g.tag from gog.guild_members gm join gog.guilds g on g.id = gm.guild_id where gm.root = gog.players.id) as gtag,
        (select g.color from gog.guild_members gm join gog.guilds g on g.id = gm.guild_id where gm.root = gog.players.id) as gcol, %1$I::bigint as v, rank() over (order by %1$I desc, updated_at asc) as r
      from gog.players where active and %1$I > 0 order by %1$I desc, updated_at asc limit %2$s) s$q$, col, lim) into rows;
  pid := gog._auth(p_token);
  if pid is not null then
    execute format('select %I::bigint from gog.players where id = $1', col) into mine using pid;
    if mine > 0 then
      execute format('select jsonb_build_object(''rank'', 1 + count(*), ''value'', $2::bigint) from gog.players where active and %I > $2', col) into me using pid, mine;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'rows', rows, 'me', me);
end $$;

create or replace function public.gog_save_put(p_token text, p_save jsonb, p_rev int, p_dev text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; newrev int; c text; reason text; banned boolean; pts numeric;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_save is null or jsonb_typeof(p_save) <> 'object' or not (p_save ? 'cls') or p_rev is null then
    return jsonb_build_object('ok', false, 'error', 'bad_data');
  end if;
  if length(p_save::text) > 600000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  select * into v from gog.players where id = pid for update;
  if p_rev <> v.save_rev then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'rev', v.save_rev, 'dev', v.save_dev);
  end if;
  if v.save_at is not null and v.save_at > now() - interval '3 seconds' then
    return jsonb_build_object('ok', false, 'error', 'slow');
  end if;
  -- uma conta sem save so pode comecar com um personagem novo (nivel 1 ou 2, quase sem ouro): impede levar o progresso de outra conta
  if v.save is null and ((p_save->'pl'->>'lv') !~ '^[0-9]{1,6}$' or (p_save->'pl'->>'lv')::int > 2 or coalesce(p_save->>'gold', '0') !~ '^[0-9]{1,9}$' or coalesce(p_save->>'gold', '0')::bigint > 2000 or coalesce(p_save->>'gems', '0') !~ '^[0-9]{1,6}$' or coalesce(p_save->>'gems', '0')::int > 50) then
    return jsonb_build_object('ok', false, 'error', 'not_new');
  end if;
  -- cada personagem tem uma classe fixa e a conta so pode ter uma de cada classe
  c := p_save->>'cls';
  if c is null or c not in ('knight', 'archer', 'mage') then return jsonb_build_object('ok', false, 'error', 'bad_data'); end if;
  if v.char_cls is null then
    if exists (select 1 from gog.players o where coalesce(o.owner, o.id) = coalesce(v.owner, v.id) and o.id <> v.id and o.char_cls = c) then
      return jsonb_build_object('ok', false, 'error', 'class_taken');
    end if;
  elsif v.char_cls <> c then
    return jsonb_build_object('ok', false, 'error', 'wrong_class', 'cls', v.char_cls);
  end if;
  -- anti-batota: valores impossiveis, conquistas sem prova e titulos que nao ganhaste
  reason := gog._check_save(v.save, p_save, least(greatest(extract(epoch from now() - coalesce(v.save_at, now() - interval '3 seconds')), 3), 7 * 86400), coalesce(v.owner, v.id));
  if reason is not null then
    banned := gog._violation(pid, reason, reason);
    return jsonb_build_object('ok', false, 'error', case when banned then 'banned' else 'cheat' end);
  end if;
  update gog.players set save = p_save, char_cls = coalesce(char_cls, c), save_rev = save_rev + 1, save_at = now(), save_dev = left(p_dev, 32) where id = pid returning save_rev into newrev;
  if v.save is not null then   -- guilda: os mobs, bosses e raids novos (ja validados acima) dao pontos a guilda
    pts := greatest(0, gog._n(p_save, 'stats', 'kills') - gog._n(v.save, 'stats', 'kills')) + 10 * greatest(0, gog._n(p_save, 'stats', 'bosses') - gog._n(v.save, 'stats', 'bosses')) + 60 * greatest(0, gog._raids_total(p_save) - gog._raids_total(v.save));
    if pts > 0 then perform gog._gcontrib(v.id, pts); end if;
  end if;
  return jsonb_build_object('ok', true, 'rev', newrev);
end $$;

create or replace function public.gog_profile(p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_nick'); end if;
  select * into v from gog.players where nick_key = lower(p_nick) and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'nick', v.nick, 'cls', v.cls, 'level', v.level, 'kills', v.kills, 'gold', v.gold, 'bosses', v.bosses, 'raids', v.raids,
    'waves', jsonb_build_array(v.w0, v.w1, v.w2, v.w3, v.w4, v.w5), 'build', v.build, 'gender', v.gender, 'country', v.country,
    'guild', (select jsonb_build_object('id', g.id, 'name', g.name, 'tag', g.tag, 'color', g.color, 'emblem', g.emblem) from gog.guild_members gm join gog.guilds g on g.id = gm.guild_id where gm.root = v.id),
    'account', (select o.nick from gog.players o where o.id = v.owner));   -- personagens extra mostram a conta principal
end $$;

create or replace function public.gog_guild_get(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; gid bigint; cd double precision;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select guild_id into gid from gog.guild_members where root = v_root;
  if gid is null then
    select greatest(0, extract(epoch from l.at + interval '24 hours' - now())) into cd from gog.guild_left l where l.root = v_root;
    return jsonb_build_object('ok', true, 'guild', null, 'cooldown', coalesce(cd, 0)::int);
  end if;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(gid, v_root));
end $$;

create or replace function public.gog_guild_create(p_token text, p_name text, p_tag text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; v_root bigint; nm text := btrim(coalesce(p_name, '')); tg text := btrim(coalesce(p_tag, '')); gid bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  if v.guild_at is not null and v.guild_at > now() - interval '2 seconds' then return jsonb_build_object('ok', false, 'error', 'slow'); end if;
  update gog.players set guild_at = now() where id = pid;
  v_root := v.id;   -- cada personagem (classe) e um membro separado da guilda
  if exists (select 1 from gog.guild_members where root = v_root) then return jsonb_build_object('ok', false, 'error', 'in_guild'); end if;
  if exists (select 1 from gog.guild_left where root = v_root and at > now() - interval '24 hours') then return jsonb_build_object('ok', false, 'error', 'cooldown'); end if;
  if nm !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,14}[A-Za-z0-9]$' or tg !~ '^[A-Za-z0-9]{2,4}$' then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  if not gog._text_ok(nm) or not gog._text_ok(tg) or not gog._text_ok(nm || tg) then return jsonb_build_object('ok', false, 'error', 'bad_word'); end if;
  -- os requisitos veem-se no save guardado na nuvem (o jogo guarda antes de pedir)
  if gog._n(v.save, 'pl', 'lv') < 40 then return jsonb_build_object('ok', false, 'error', 'need_level'); end if;
  if gog._n(v.save, 'gold') < 15000 then return jsonb_build_object('ok', false, 'error', 'need_gold'); end if;
  if gog._n(v.save, 'gems') < 100 then return jsonb_build_object('ok', false, 'error', 'need_gems'); end if;
  begin
    insert into gog.guilds (name, name_key, tag, tag_key, leader) values (nm, lower(nm), upper(tg), lower(tg), v_root) returning id into gid;
  exception when unique_violation then return jsonb_build_object('ok', false, 'error', 'name_taken');
  end;
  insert into gog.guild_members (root, guild_id) values (v_root, gid);
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(gid, v_root));
end $$;

create or replace function public.gog_guild_join(p_token text, p_guild bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; v_root bigint; n int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  if v.guild_at is not null and v.guild_at > now() - interval '2 seconds' then return jsonb_build_object('ok', false, 'error', 'slow'); end if;
  update gog.players set guild_at = now() where id = pid;
  v_root := v.id;   -- cada personagem (classe) e um membro separado da guilda
  if exists (select 1 from gog.guild_members where root = v_root) then return jsonb_build_object('ok', false, 'error', 'in_guild'); end if;
  if exists (select 1 from gog.guild_left where root = v_root and at > now() - interval '24 hours') then return jsonb_build_object('ok', false, 'error', 'cooldown'); end if;
  if gog._n(v.save, 'pl', 'lv') < 10 then return jsonb_build_object('ok', false, 'error', 'need_level_join'); end if;
  perform 1 from gog.guilds where id = p_guild for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select count(*) into n from gog.guild_members where guild_id = p_guild;
  if n >= 10 then return jsonb_build_object('ok', false, 'error', 'full'); end if;
  insert into gog.guild_members (root, guild_id) values (v_root, p_guild);
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(p_guild, v_root));
end $$;

create or replace function public.gog_guild_leave(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; gid bigint; g gog.guilds; nl bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select guild_id into gid from gog.guild_members where root = v_root;
  if gid is null then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  select * into g from gog.guilds where id = gid for update;
  delete from gog.guild_members where root = v_root;
  insert into gog.guild_left (root, at) values (v_root, now()) on conflict (root) do update set at = now();
  if g.leader = v_root then   -- o lider sai: passa para quem mais contribuiu; sem membros a guilda desaparece
    select root into nl from gog.guild_members where guild_id = gid order by contrib desc, joined_at limit 1;
    if nl is null then delete from gog.guilds where id = gid; else update gog.guilds set leader = nl where id = gid; end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gog_guild_kick(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; t bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  select m.root into t from gog.guild_members m join gog.players p on p.id = m.root where m.guild_id = g.id and p.nick_key = lower(coalesce(p_nick, ''));
  if t is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if t = v_root then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  delete from gog.guild_members where root = t;
  insert into gog.guild_left (root, at) values (t, now()) on conflict (root) do update set at = now();
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_transfer(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; t bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  select m.root into t from gog.guild_members m join gog.players p on p.id = m.root where m.guild_id = g.id and p.nick_key = lower(coalesce(p_nick, ''));
  if t is null or t = v_root then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  update gog.guilds set leader = t where id = g.id;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_upgrade(p_token text, p_perk text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; info jsonb;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_perk is null or p_perk not in ('xp', 'gold', 'drop', 'attr') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root for update of g2;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  if gog._glevel(g.xp) - (g.p_xp + g.p_gold + g.p_drop + g.p_attr) < 1 then return jsonb_build_object('ok', false, 'error', 'no_points'); end if;
  if (case p_perk when 'xp' then g.p_xp when 'gold' then g.p_gold when 'drop' then g.p_drop else g.p_attr end) >= 10 then return jsonb_build_object('ok', false, 'error', 'maxed'); end if;
  update gog.guilds set p_xp = p_xp + (p_perk = 'xp')::int, p_gold = p_gold + (p_perk = 'gold')::int, p_drop = p_drop + (p_perk = 'drop')::int, p_attr = p_attr + (p_perk = 'attr')::int where id = g.id;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_style(p_token text, p_color int, p_emblem int, p_motto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; mt text := btrim(coalesce(p_motto, ''));
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root for update of g2;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  if p_color is null or p_color < 0 or p_color > 7 or p_emblem is null or p_emblem < 0 or p_emblem > 11 then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if length(mt) > 40 or mt !~ '^[A-Za-z0-9 .,!?_''-]*$' then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  if mt <> '' and not gog._text_ok(mt) then return jsonb_build_object('ok', false, 'error', 'bad_word'); end if;
  update gog.guilds set color = p_color, emblem = p_emblem, motto = mt where id = g.id;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_board(p_token text default null, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare rows jsonb; mine bigint; v_root bigint; pid bigint;
begin
  select coalesce(jsonb_agg(jsonb_build_object('rank', s.r, 'id', s.id, 'name', s.name, 'tag', s.tag, 'level', s.lv, 'members', s.n, 'color', s.color, 'emblem', s.emblem, 'xp', s.xp) order by s.r), '[]'::jsonb) into rows from (
    select g.id, g.name, g.tag, g.xp, g.color, g.emblem, gog._glevel(g.xp) as lv, (select count(*) from gog.guild_members m where m.guild_id = g.id) as n, rank() over (order by g.xp desc, g.id) as r
    from gog.guilds g order by g.xp desc, g.id limit 14 offset greatest(coalesce(p_offset, 0), 0)) s;
  pid := gog._auth(p_token);
  if pid is not null then
    v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
    select guild_id into mine from gog.guild_members where root = v_root;
  end if;
  return jsonb_build_object('ok', true, 'rows', rows, 'mine', mine);
end $$;
