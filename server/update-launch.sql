-- LANCAMENTO PUBLICO: relatos de bugs, estatisticas anonimas e painel de moderacao (admin.html). Corre no SQL Editor do Supabase. Idempotente.
-- Precisa de update-security.sql (gog._rate, gog._ip) e de a tua conta estar em gog.admins:  insert into gog.admins (nick_key) values ('o_teu_nick_em_minusculas') on conflict do nothing;
-- ====================================================== relatos de bugs e estatisticas (sem identificadores nem cookies)
create table if not exists gog.reports (
  id bigserial primary key, at timestamptz not null default now(), player bigint references gog.players(id) on delete set null,
  msg text not null, ctx jsonb, handled boolean not null default false);
create table if not exists gog.daily_stats (day date not null default current_date, k text not null, n bigint not null default 0, primary key (day, k));
alter table gog.reports enable row level security; alter table gog.daily_stats enable row level security;
revoke all on gog.reports, gog.daily_stats from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on gog.reports, gog.daily_stats from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on gog.reports, gog.daily_stats from authenticated; end if;
end $$;

-- relato de bug/problema: texto livre (so texto, nunca interpretado como HTML), com contexto tecnico; 5 por hora por rede
create or replace function public.gog_report(p_msg text, p_ctx jsonb default null, p_token text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m text := btrim(coalesce(p_msg, '')); iph text := coalesce(gog._ip(), 'x'); pid bigint;
begin
  if length(m) < 5 or length(m) > 1000 then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if p_ctx is not null and (jsonb_typeof(p_ctx) <> 'object' or length(p_ctx::text) > 4000) then p_ctx := null; end if;
  if not gog._rate('rep:' || iph, 5, 3600) then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
  pid := gog._auth(p_token);
  insert into gog.reports (player, msg, ctx) values (pid, m, p_ctx);
  return jsonb_build_object('ok', true);
end $$;

-- contador anonimo de eventos do dia (so nomes de uma lista fixa; nada de ids, IPs ou conteudo)
create or replace function public.gog_ping(p_ev text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare iph text := coalesce(gog._ip(), 'x');
begin
  if p_ev is null or p_ev !~ '^(open|login|register|mission_start|mission_win|mission_lose|tutorial_done|play5|play20|error)(:[dm])?$' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if not gog._rate('ping:' || iph, 60, 60) then return jsonb_build_object('ok', true); end if;
  insert into gog.daily_stats as d (day, k, n) values (current_date, p_ev, 1) on conflict (day, k) do update set n = d.n + 1;
  return jsonb_build_object('ok', true);
end $$;

-- ====================================================== moderacao (so contas em gog.admins; o servidor confere a sessao)
create or replace function gog._admin(p_token text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare pid bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return null; end if;
  if not exists (select 1 from gog.players p join gog.admins a on a.nick_key = p.nick_key where p.id = pid) then return null; end if;
  return pid;
end $$;

create or replace function public.gog_admin_overview(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if gog._admin(p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  return jsonb_build_object('ok', true,
    'violations', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('id', v.id, 'at', v.at, 'nick', p.nick, 'kind', v.kind, 'detail', v.detail, 'counted', v.counted, 'active', p.active) x
        from gog.violations v join gog.players p on p.id = v.root order by v.at desc limit 100) q),
    'reports', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('id', r.id, 'at', r.at, 'nick', p.nick, 'msg', r.msg, 'ctx', r.ctx, 'handled', r.handled) x
        from gog.reports r left join gog.players p on p.id = r.player order by r.at desc limit 50) q),
    'banned', (select coalesce(jsonb_agg(x order by x->>'at' desc), '[]'::jsonb) from (
        select jsonb_build_object('nick', p.nick, 'at', p.inactive_at) x from gog.players p where not p.active and p.owner is null order by p.inactive_at desc nulls last limit 50) q),
    'stats', (select coalesce(jsonb_agg(jsonb_build_object('day', s.day, 'k', s.k, 'n', s.n) order by s.day desc, s.k), '[]'::jsonb) from gog.daily_stats s where s.day > current_date - 14),
    'players', (select count(*) from gog.players where owner is null));
end $$;

create or replace function public.gog_admin_player(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players; rt bigint;
begin
  if gog._admin(p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where nick_key = lower(coalesce(p_nick, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  rt := coalesce(v.owner, v.id);
  return jsonb_build_object('ok', true, 'nick', v.nick, 'root', (select nick from gog.players where id = rt), 'active', v.active, 'created', v.created_at,
    'level', gog._n(v.save, 'pl', 'lv'), 'gold', gog._n(v.save, 'gold'), 'gems', gog._n(v.save, 'gems'), 'spent', gog._n(v.save, 'stats', 'spent'), 'kills', gog._n(v.save, 'stats', 'kills'), 'save_at', v.save_at, 'has_save', v.save is not null,
    'characters', (select coalesce(jsonb_agg(jsonb_build_object('nick', c.nick, 'cls', c.char_cls, 'active', c.active)), '[]'::jsonb) from gog.players c where coalesce(c.owner, c.id) = rt),
    'violations', (select coalesce(jsonb_agg(jsonb_build_object('at', x.at, 'kind', x.kind, 'detail', x.detail, 'counted', x.counted) order by x.at desc), '[]'::jsonb) from (select * from gog.violations where root = rt order by at desc limit 20) x),
    'history', (select coalesce(jsonb_agg(jsonb_build_object('id', h.id, 'at', h.at, 'level', gog._n(h.save, 'pl', 'lv'), 'gold', gog._n(h.save, 'gold'), 'gems', gog._n(h.save, 'gems')) order by h.at desc), '[]'::jsonb) from gog.save_history h where h.player_id = v.id));
end $$;

create or replace function public.gog_admin_set_active(p_token text, p_nick text, p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if gog._admin(p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if exists (select 1 from gog.players p join gog.admins a on a.nick_key = p.nick_key where p.nick_key = lower(coalesce(p_nick, ''))) then return jsonb_build_object('ok', false, 'error', 'admin'); end if;
  return jsonb_build_object('ok', gog.set_active(p_nick, coalesce(p_active, true)) <> 'not_found');
end $$;

-- repoe um save do historico (sobe a epoca: o save local antigo nunca volta a substituir este)
create or replace function public.gog_admin_restore(p_token text, p_nick text, p_hist bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players; h gog.save_history;
begin
  if gog._admin(p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where nick_key = lower(coalesce(p_nick, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into h from gog.save_history where id = p_hist and player_id = v.id;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  update gog.players set save = jsonb_set(h.save, '{ep}', to_jsonb(coalesce(gog._n(v.save, 'ep'), 0) + 1)), save_rev = save_rev + 1, save_at = null where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

-- apaga o progresso de um personagem (a conta fica)
create or replace function public.gog_admin_reset(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players;
begin
  if gog._admin(p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where nick_key = lower(coalesce(p_nick, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  update gog.players set save = null, save_rev = save_rev + 1, save_at = null, save_dev = null, build = null, level = 0, kills = 0, gold = 0, bosses = 0, raids = 0,
    w0 = 0, w1 = 0, w2 = 0, w3 = 0, w4 = 0, w5 = 0, submitted_at = null, updated_at = now() where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

-- RGPD: apaga a conta inteira (todos os personagens, saves, sessoes, violacoes). A guilda passa para quem mais contribuiu.
create or replace function public.gog_admin_erase(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players; rt bigint; g record; nl bigint;
begin
  if gog._admin(p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where nick_key = lower(coalesce(p_nick, ''));
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  rt := coalesce(v.owner, v.id);
  if exists (select 1 from gog.players p join gog.admins a on a.nick_key = p.nick_key where coalesce(p.owner, p.id) = rt) then return jsonb_build_object('ok', false, 'error', 'admin'); end if;
  for g in select id from gog.guilds where leader in (select id from gog.players where coalesce(owner, id) = rt) loop
    select m.root into nl from gog.guild_members m where m.guild_id = g.id and m.root not in (select id from gog.players where coalesce(owner, id) = rt) order by m.contrib desc, m.joined_at limit 1;
    if nl is not null then update gog.guilds set leader = nl where id = g.id; end if;
  end loop;
  delete from gog.players where id = rt;   -- os personagens extra apagam-se em cascata (owner), tal como saves, sessoes e violacoes
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gog_admin_report_done(p_token text, p_id bigint, p_done boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if gog._admin(p_token) is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  update gog.reports set handled = coalesce(p_done, true) where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

do $$
declare f text;
begin
  execute 'revoke all on function gog._admin(text) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function gog._admin(text) from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on function gog._admin(text) from authenticated'; end if;
  foreach f in array array['public.gog_report(text,jsonb,text)', 'public.gog_ping(text)', 'public.gog_admin_overview(text)', 'public.gog_admin_player(text,text)', 'public.gog_admin_set_active(text,text,boolean)',
    'public.gog_admin_restore(text,text,bigint)', 'public.gog_admin_reset(text,text)', 'public.gog_admin_erase(text,text)', 'public.gog_admin_report_done(text,bigint,boolean)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;
