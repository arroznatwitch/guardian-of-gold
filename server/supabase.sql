-- =====================================================================
--  Guardians of Gold - ranking online (Supabase / Postgres)
--  Corre este ficheiro UMA vez no SQL Editor do teu projecto Supabase.
--
--  Seguranca (resumo):
--   * As tabelas vivem no schema privado "gog", que a API nunca expoe.
--     So se chega aos dados atraves das funcoes abaixo (SECURITY DEFINER).
--   * A palavra-passe NUNCA chega ao servidor: o jogo envia uma "prova"
--     (PBKDF2-SHA256, 210 000 iteracoes, feita no browser). O servidor
--     guarda apenas bcrypt(prova) com custo 12 e sal aleatorio.
--   * Sessoes: token aleatorio de 256 bits; so o SHA-256 fica guardado.
--   * Bloqueio progressivo de contas apos 5 tentativas falhadas e
--     resposta com o mesmo custo quer o nick exista ou nao.
--   * As pontuacoes so sobem e so aceitam aumentos plausiveis.
--   * O save do jogo vive na conta (gog_save_get / gog_save_put), com controlo
--     de versao para detetar uso em dois dispositivos ao mesmo tempo.
-- =====================================================================

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists gog;
revoke all on schema gog from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on schema gog from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on schema gog from authenticated; end if;
end $$;

-- ---------------------------------------------------------------- tabelas
create table if not exists gog.players (
  id           bigint generated always as identity primary key,
  nick         text not null check (nick ~ '^[A-Za-z0-9_]{3,16}$'),
  nick_key     text not null unique,
  pass_hash    text not null,
  created_at   timestamptz not null default now(),
  failed       int  not null default 0,
  locked_until timestamptz,
  cls          text not null default 'knight' check (cls in ('knight', 'archer', 'mage')),
  level        int    not null default 0,
  kills        bigint not null default 0,
  gold         bigint not null default 0,
  bosses       int    not null default 0,
  raids        int    not null default 0,
  w0 int not null default 0, w1 int not null default 0, w2 int not null default 0, w3 int not null default 0, w4 int not null default 0, w5 int not null default 0,
  submitted_at timestamptz,
  updated_at   timestamptz not null default now()
);
alter table gog.players add column if not exists build jsonb;   -- build publica: skin, arma, atributos e equipamento (limpa no servidor)
alter table gog.players add column if not exists reg_ip text;   -- HMAC do IP de registo (nunca o IP em claro), so para limitar contas por rede
create table if not exists gog.secrets (k text primary key, v text not null);
insert into gog.secrets (k, v) values ('ip_salt', encode(extensions.gen_random_bytes(24), 'hex')) on conflict do nothing;
create index if not exists players_reg_ip_idx on gog.players (reg_ip);
create table if not exists gog.sessions (
  token_hash bytea primary key,
  player_id  bigint not null references gog.players(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_player on gog.sessions (player_id);
create table if not exists gog.throttle (
  bucket text primary key, n int not null, since timestamptz not null
);
alter table gog.players  enable row level security;
alter table gog.sessions enable row level security;
alter table gog.throttle enable row level security;
revoke all on all tables in schema gog from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on all tables in schema gog from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on all tables in schema gog from authenticated; end if;
end $$;

-- ------------------------------------------------------- funcoes internas
-- Reconstroi a build so com campos conhecidos e valores limitados; nunca guarda texto livre do cliente.
create or replace function gog._clean_build(b jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare o jsonb; w jsonb; a jsonb; g jsonb := '{}'::jsonb; it jsonb; sl text;
begin
  if b is null or jsonb_typeof(b) <> 'object' or length(b::text) > 3000 then return null; end if;
  o := jsonb_build_object('skin', least(greatest(coalesce((b->>'skin')::int, 0), 0), 9));
  w := b->'weapon';
  if jsonb_typeof(w) = 'object' and (w->>'id') ~ '^[a-z]_[a-z]{2,10}$' then
    o := o || jsonb_build_object('weapon', jsonb_build_object('id', w->>'id',
      'lv', least(greatest(coalesce((w->>'lv')::int, 0), 0), 12), 'st', least(greatest(coalesce((w->>'st')::int, 0), 0), 3)));
  end if;
  a := b->'attr';
  if jsonb_typeof(a) = 'object' then
    o := o || jsonb_build_object('attr', jsonb_build_object(
      'vit', least(greatest(coalesce((a->>'vit')::int, 0), 0), 99999), 'str', least(greatest(coalesce((a->>'str')::int, 0), 0), 99999),
      'agi', least(greatest(coalesce((a->>'agi')::int, 0), 0), 99999), 'per', least(greatest(coalesce((a->>'per')::int, 0), 0), 99999)));
  end if;
  if jsonb_typeof(b->'gear') = 'object' then
    foreach sl in array array['head', 'chest', 'boots', 'amulet'] loop
      it := b->'gear'->sl;
      if jsonb_typeof(it) = 'object' then
        g := g || jsonb_build_object(sl, jsonb_build_object('r', least(greatest(coalesce((it->>'r')::int, 0), 0), 4),
          'e', least(greatest(coalesce((it->>'e')::int, 0), 0), 10), 'st', least(greatest(coalesce((it->>'st')::int, 0), 0), 3),
          'sp', left(regexp_replace(coalesce(it->>'sp', ''), '[^[:alpha:]]', '', 'g'), 14)));
      end if;
    end loop;
    o := o || jsonb_build_object('gear', g);
  end if;
  return o;
exception when others then
  return null;
end $$;

create or replace function gog._new_session(p_player bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare t text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  delete from gog.sessions where player_id = p_player and expires_at < now();
  -- no maximo 5 sessoes ativas por conta
  delete from gog.sessions where token_hash in (
    select token_hash from gog.sessions where player_id = p_player order by created_at desc offset 4);
  insert into gog.sessions (token_hash, player_id, expires_at)
  values (extensions.digest(decode(t, 'hex'), 'sha256'), p_player, now() + interval '30 days');
  return t;
end $$;

create or replace function gog._auth(p_token text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare pid bigint;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then return null; end if;
  select player_id into pid from gog.sessions
   where token_hash = extensions.digest(decode(p_token, 'hex'), 'sha256') and expires_at > now();
  return pid;
end $$;

-- ------------------------------------------------------------ API publica
create or replace function public.gog_register(p_nick text, p_proof text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; cnt int; since timestamptz; hdr json; ip text; iph text;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_nick'); end if;
  if p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if lower(p_nick) in ('admin', 'administrator', 'moderator', 'mod', 'system', 'support', 'staff', 'null', 'undefined', 'guardiansofgold') then
    return jsonb_build_object('ok', false, 'error', 'nick_taken');
  end if;
  -- no maximo 5 contas por rede (IP): usa o cabecalho do Cloudflare/Supabase, so guarda um HMAC
  begin hdr := nullif(current_setting('request.headers', true), '')::json; exception when others then hdr := null; end;
  ip := btrim(coalesce(nullif(hdr->>'cf-connecting-ip', ''), nullif(split_part(coalesce(hdr->>'x-forwarded-for', ''), ',', -1), ''), nullif(hdr->>'x-real-ip', ''), ''));
  if ip <> '' then
    iph := encode(extensions.hmac(ip, (select v from gog.secrets where k = 'ip_salt'), 'sha256'), 'hex');
    if (select count(*) from gog.players where reg_ip = iph) >= 5 then return jsonb_build_object('ok', false, 'error', 'ip_limit'); end if;
  end if;
  -- limite global de registos: 30 por 10 minutos (trava criacao em massa)
  insert into gog.throttle as t (bucket, n, since) values ('register', 1, now())
  on conflict (bucket) do update set
    n = case when t.since < now() - interval '10 minutes' then 1 else t.n + 1 end,
    since = case when t.since < now() - interval '10 minutes' then now() else t.since end
  returning n into cnt;
  if cnt > 30 then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
  if exists (select 1 from gog.players where nick_key = lower(p_nick)) then return jsonb_build_object('ok', false, 'error', 'nick_taken'); end if;
  begin
    insert into gog.players (nick, nick_key, pass_hash, reg_ip)
    values (p_nick, lower(p_nick), extensions.crypt(p_proof, extensions.gen_salt('bf', 12)), iph)
    returning id into pid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'nick_taken');
  end;
  return jsonb_build_object('ok', true, 'nick', p_nick, 'token', gog._new_session(pid));
end $$;

create or replace function public.gog_login(p_nick text, p_proof text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players; ok boolean; wait int;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' or p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  select * into v from gog.players where nick_key = lower(p_nick) for update;
  if not found then
    perform extensions.crypt(p_proof, extensions.gen_salt('bf', 12));   -- mesmo custo: nao revela se o nick existe
    return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  if v.locked_until is not null and v.locked_until > now() then
    perform extensions.crypt(p_proof, extensions.gen_salt('bf', 12));
    return jsonb_build_object('ok', false, 'error', 'locked', 'wait', ceil(extract(epoch from v.locked_until - now()))::int);
  end if;
  ok := extensions.crypt(p_proof, v.pass_hash) = v.pass_hash;
  if ok then
    update gog.players set failed = 0, locked_until = null where id = v.id;
    return jsonb_build_object('ok', true, 'nick', v.nick, 'token', gog._new_session(v.id));
  end if;
  wait := case when v.failed + 1 >= 5 then least(3600, 30 * (2 ^ least(v.failed + 1 - 5, 7))::int) else 0 end;
  update gog.players set failed = v.failed + 1, locked_until = case when wait > 0 then now() + make_interval(secs => wait) end where id = v.id;
  return jsonb_build_object('ok', false, 'error', 'bad_login');
end $$;

create or replace function public.gog_logout(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if p_token ~ '^[0-9a-f]{64}$' then
    delete from gog.sessions where token_hash = extensions.digest(decode(p_token, 'hex'), 'sha256');
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gog_delete(p_token text, p_proof text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  select * into v from gog.players where id = pid for update;
  if extensions.crypt(p_proof, v.pass_hash) <> v.pass_hash then return jsonb_build_object('ok', false, 'error', 'bad_login'); end if;
  delete from gog.players where id = pid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gog_submit(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pid bigint; v gog.players; first_time boolean; dt double precision;
  n_level int; n_kills bigint; n_gold bigint; n_bosses int; n_raids int; n_w int[]; n_cls text; o_w int[]; i int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  if v.submitted_at is not null and v.submitted_at > now() - interval '20 seconds' then
    return jsonb_build_object('ok', false, 'error', 'slow');
  end if;
  begin
    n_level  := (p->>'level')::int;   n_kills := (p->>'kills')::bigint; n_gold := (p->>'gold')::bigint;
    n_bosses := (p->>'bosses')::int;  n_raids := (p->>'raids')::int;
    n_w := array[(p->>'w0')::int, (p->>'w1')::int, (p->>'w2')::int, (p->>'w3')::int, (p->>'w4')::int, (p->>'w5')::int];
    n_cls := p->>'cls';
  exception when others then
    return jsonb_build_object('ok', false, 'error', 'bad_data');
  end;
  if n_cls is null or n_cls not in ('knight', 'archer', 'mage') or least(n_level, n_bosses, n_raids) < 0 or least(n_kills, n_gold) < 0 or least(n_w[1], n_w[2], n_w[3], n_w[4], n_w[5], n_w[6]) < 0 then
    return jsonb_build_object('ok', false, 'error', 'bad_data');
  end if;
  first_time := v.submitted_at is null;
  dt := least(greatest(extract(epoch from now() - coalesce(v.submitted_at, v.created_at)), 20), 7 * 86400);
  o_w := array[v.w0, v.w1, v.w2, v.w3, v.w4, v.w5];
  -- limites de plausibilidade (o 1.o envio usa tetos fixos, os seguintes dependem do tempo passado)
  if first_time then
    if n_level > 300 or n_kills > 500000 or n_gold > 50000000 or n_bosses > 5000 or n_raids > 1000 or greatest(n_w[1], n_w[2], n_w[3], n_w[4], n_w[5], n_w[6]) > 300 then
      return jsonb_build_object('ok', false, 'error', 'implausible');
    end if;
  else
    if n_level > v.level + 5 + dt / 15 or n_kills > v.kills + 40 + dt * 8 or n_gold > v.gold + 20000 + dt * 500
       or n_bosses > v.bosses + 5 + dt / 15 or n_raids > v.raids + 2 + dt / 60 then
      return jsonb_build_object('ok', false, 'error', 'implausible');
    end if;
    for i in 1..6 loop
      if n_w[i] > o_w[i] + 5 + dt / 8 then return jsonb_build_object('ok', false, 'error', 'implausible'); end if;
    end loop;
  end if;
  update gog.players set
    cls = n_cls, build = coalesce(gog._clean_build(p->'build'), build), level = greatest(level, n_level), kills = greatest(kills, n_kills), gold = greatest(gold, n_gold),
    bosses = greatest(bosses, n_bosses), raids = greatest(raids, n_raids),
    w0 = greatest(w0, n_w[1]), w1 = greatest(w1, n_w[2]), w2 = greatest(w2, n_w[3]), w3 = greatest(w3, n_w[4]), w4 = greatest(w4, n_w[5]), w5 = greatest(w5, n_w[6]),
    submitted_at = now(), updated_at = now()
  where id = pid;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gog_board(p_stat text, p_limit int default 20, p_token text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare col text; lim int := least(greatest(coalesce(p_limit, 20), 1), 50); rows jsonb; me jsonb; pid bigint; mine bigint;
begin
  col := case p_stat when 'level' then 'level' when 'kills' then 'kills' when 'gold' then 'gold' when 'bosses' then 'bosses' when 'raids' then 'raids'
                     when 'wave0' then 'w0' when 'wave1' then 'w1' when 'wave2' then 'w2' when 'wave3' then 'w3' when 'wave4' then 'w4' when 'wave5' then 'w5' end;
  if col is null then return jsonb_build_object('ok', false, 'error', 'bad_stat'); end if;
  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object('rank', r, 'nick', nick, 'cls', cls, 'value', v, 'lv', lv, 'skin', skin) order by r), '[]'::jsonb) from (
      select nick, cls, level as lv, coalesce((build->>'skin')::int, 0) as skin, %1$I::bigint as v, rank() over (order by %1$I desc, updated_at asc) as r
      from gog.players where %1$I > 0 order by %1$I desc, updated_at asc limit %2$s) s$q$, col, lim) into rows;
  pid := gog._auth(p_token);
  if pid is not null then
    execute format('select %I::bigint from gog.players where id = $1', col) into mine using pid;
    if mine > 0 then
      execute format('select jsonb_build_object(''rank'', 1 + count(*), ''value'', $2::bigint) from gog.players where %I > $2', col) into me using pid, mine;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'rows', rows, 'me', me);
end $$;

create or replace function public.gog_nick_free(p_nick text) returns jsonb
language sql security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'free', not exists (select 1 from gog.players where nick_key = lower(p_nick)));
$$;

-- ------------------------------------------------------------ permissoes
do $$
declare f text;
begin
  foreach f in array array[
    'public.gog_register(text,text)', 'public.gog_login(text,text)', 'public.gog_logout(text)', 'public.gog_delete(text,text)',
    'public.gog_submit(text,jsonb)', 'public.gog_board(text,int,text)', 'public.gog_nick_free(text)',
    'gog._new_session(bigint)', 'gog._auth(text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
  end loop;
  foreach f in array array[
    'public.gog_register(text,text)', 'public.gog_login(text,text)', 'public.gog_logout(text)', 'public.gog_delete(text,text)',
    'public.gog_submit(text,jsonb)', 'public.gog_board(text,int,text)', 'public.gog_nick_free(text)'] loop
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;

-- ====================================================== save na nuvem (v2)
-- Podes voltar a correr este ficheiro inteiro: tudo e idempotente.
alter table gog.players add column if not exists save     jsonb;
alter table gog.players add column if not exists save_rev int not null default 0;
alter table gog.players add column if not exists save_at  timestamptz;
alter table gog.players add column if not exists save_dev text;

create or replace function public.gog_save_get(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid;
  return jsonb_build_object('ok', true, 'rev', v.save_rev, 'save', v.save, 'dev', v.save_dev);
end $$;

create or replace function public.gog_save_put(p_token text, p_save jsonb, p_rev int, p_dev text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; newrev int;
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
  update gog.players set save = p_save, save_rev = save_rev + 1, save_at = now(), save_dev = left(p_dev, 32) where id = pid returning save_rev into newrev;
  return jsonb_build_object('ok', true, 'rev', newrev);
end $$;

-- apagar o progresso do jogo (mantem a conta); tambem limpa as pontuacoes do ranking
create or replace function public.gog_save_reset(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; newrev int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  update gog.players set save = null, save_rev = save_rev + 1, save_at = null, save_dev = null, build = null,
    level = 0, kills = 0, gold = 0, bosses = 0, raids = 0, w0 = 0, w1 = 0, w2 = 0, w3 = 0, w4 = 0, w5 = 0, submitted_at = null, updated_at = now()
  where id = pid returning save_rev into newrev;
  return jsonb_build_object('ok', true, 'rev', newrev);
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.gog_save_get(text)', 'public.gog_save_put(text,jsonb,int,text)', 'public.gog_save_reset(text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;

-- ====================================================== perfil publico (v3)
create or replace function public.gog_profile(p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_nick'); end if;
  select * into v from gog.players where nick_key = lower(p_nick);
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'nick', v.nick, 'cls', v.cls, 'level', v.level, 'kills', v.kills, 'gold', v.gold, 'bosses', v.bosses, 'raids', v.raids,
    'waves', jsonb_build_array(v.w0, v.w1, v.w2, v.w3, v.w4, v.w5), 'build', v.build);
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.gog_profile(text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
  execute 'revoke all on function gog._clean_build(jsonb) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function gog._clean_build(jsonb) from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on function gog._clean_build(jsonb) from authenticated'; end if;
end $$;
