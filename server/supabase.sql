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
alter table gog.players add column if not exists uid uuid not null default gen_random_uuid();   -- identidade da conta: o save local fica ligado a este id (nao ao nick)
alter table gog.players add column if not exists owner bigint references gog.players(id) on delete cascade;   -- personagem extra: aponta para o personagem principal da conta
alter table gog.players add column if not exists char_cls text check (char_cls in ('knight', 'archer', 'mage'));   -- classe do personagem (uma por conta; fixa depois do 1.o save)
create index if not exists players_owner_idx on gog.players (owner);
alter table gog.players add column if not exists gender text not null default 'm';   -- 'm' ou 'f' (so muda o aspeto)
alter table gog.players add column if not exists country text;                       -- codigo ISO de 2 letras (bandeira)
alter table gog.players add column if not exists active boolean not null default true;   -- false = conta desativada (so o administrador mexe nisto)
alter table gog.players add column if not exists inactive_at timestamptz;
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
  if (b->>'title') ~ '^[a-z0-9]{3,12}$' then o := o || jsonb_build_object('title', b->>'title'); end if;   -- titulo de conquista (so um codigo curto)
  w := b->'weapon';
  if jsonb_typeof(w) = 'object' and (w->>'id') ~ '^[a-z]_[a-z]{2,10}$' then
    o := o || jsonb_build_object('weapon', jsonb_build_object('id', w->>'id',
      'lv', least(greatest(coalesce((w->>'lv')::int, 0), 0), 20), 'st', least(greatest(coalesce((w->>'st')::int, 0), 0), 3)));
  end if;
  if jsonb_typeof(b->'pet') = 'object' and (b->'pet'->>'id') in ('dog', 'chicken', 'bird') then
    o := o || jsonb_build_object('pet', jsonb_build_object('id', b->'pet'->>'id',
      'lv', least(greatest(case when (b->'pet'->>'lv') ~ '^[0-9]{1,3}$' then (b->'pet'->>'lv')::int else 1 end, 1), 30),
      'name', case when gog._text_ok(b->'pet'->>'name') then left(btrim(regexp_replace(coalesce(b->'pet'->>'name', ''), '[^A-Za-z0-9 _-]', '', 'g')), 12) else '' end));
  end if;
  a := b->'attr';
  if jsonb_typeof(a) = 'object' then
    o := o || jsonb_build_object('attr', jsonb_build_object(
      'vit', least(greatest(coalesce((a->>'vit')::int, 0), 0), 99999), 'str', least(greatest(coalesce((a->>'str')::int, 0), 0), 99999),
      'agi', least(greatest(coalesce((a->>'agi')::int, 0), 0), 99999), 'per', least(greatest(coalesce((a->>'per')::int, 0), 0), 99999)));
  end if;
  if jsonb_typeof(b->'gear') = 'object' then
    foreach sl in array array['head', 'chest', 'boots', 'amulet', 'ring'] loop
      it := b->'gear'->sl;
      if jsonb_typeof(it) = 'object' then
        g := g || jsonb_build_object(sl, jsonb_build_object('r', least(greatest(coalesce((it->>'r')::int, 0), 0), 4),
          'e', least(greatest(coalesce((it->>'e')::int, 0), 0), 10), 'st', least(greatest(coalesce((it->>'st')::int, 0), 0), 3),
          'sp', left(regexp_replace(coalesce(it->>'sp', ''), '[^[:alpha:]]', '', 'g'), 14))
          || case when sl = 'ring' then jsonb_build_object('g', least(greatest(coalesce((it->>'g')::int, 0), 0), 3)) else '{}'::jsonb end);   -- o anel guarda a cor da gema (0-3)
      end if;
    end loop;
    o := o || jsonb_build_object('gear', g);
  end if;
  if jsonb_typeof(b->'stats') = 'object' then   -- estatisticas calculadas (so para mostrar no perfil): so numeros, com limites
    a := '{}'::jsonb;
    foreach sl in array array['hp', 'dr', 'dm', 'cr', 'cx', 'as', 'sp', 'bu', 'fr', 'xp', 'gf', 'po', 'ls', 'el', 'cd'] loop
      if jsonb_typeof(b->'stats'->sl) = 'number' then a := a || jsonb_build_object(sl, round(least(greatest((b->'stats'->>sl)::numeric, -100000), 10000000), 2)); end if;
    end loop;
    o := o || jsonb_build_object('stats', a);
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
  select s.player_id into pid from gog.sessions s join gog.players p on p.id = s.player_id
   where s.token_hash = extensions.digest(decode(p_token, 'hex'), 'sha256') and s.expires_at > now() and p.active;
  return pid;
end $$;

-- ------------------------------------------------------------ seguranca: limites de pedidos e ajudas (update-security)
alter table gog.players add column if not exists fail_at timestamptz;   -- ultima tentativa de login falhada (o contador de falhas expira ao fim de 1 h)

-- HMAC do IP do pedido (nunca o IP em claro); null se nao ha cabecalho
create or replace function gog._ip() returns text
language plpgsql security definer set search_path = '' as $$
declare hdr json; ip text;
begin
  begin hdr := nullif(current_setting('request.headers', true), '')::json; exception when others then hdr := null; end;
  ip := btrim(coalesce(nullif(hdr->>'cf-connecting-ip', ''), nullif(split_part(coalesce(hdr->>'x-forwarded-for', ''), ',', -1), ''), nullif(hdr->>'x-real-ip', ''), ''));
  if ip = '' then return null; end if;
  return encode(extensions.hmac(ip, (select v from gog.secrets where k = 'ip_salt'), 'sha256'), 'hex');
end $$;

-- limite de pedidos: true se ainda cabe (mx pedidos por secs segundos neste balde)
create or replace function gog._rate(b text, mx int, secs int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare cnt int;
begin
  insert into gog.throttle as t (bucket, n, since) values (b, 1, now())
  on conflict (bucket) do update set
    n = case when t.since < now() - make_interval(secs => secs) then 1 else t.n + 1 end,
    since = case when t.since < now() - make_interval(secs => secs) then now() else t.since end
  returning n into cnt;
  if random() < 0.01 then delete from gog.throttle where since < now() - interval '1 day' and bucket <> 'register'; end if;
  return cnt <= mx;
end $$;

-- soma todos os numeros de um json (objetos/listas ate 4 niveis)
create or replace function gog._tot(j jsonb, d int default 0) returns numeric
language plpgsql immutable set search_path = '' as $$
declare r numeric := 0; e jsonb;
begin
  if d > 4 then return 0; end if;
  if jsonb_typeof(j) = 'array' then
    for e in select x from jsonb_array_elements(j) x loop r := r + gog._tot(e, d + 1); end loop;
  elsif jsonb_typeof(j) = 'object' then
    for e in select x.value from jsonb_each(j) x loop r := r + gog._tot(e, d + 1); end loop;
  else r := gog._nv(j);
  end if;
  return r;
end $$;

-- ouro extra que o Auto-Raid pode explicar: so se o contador de usos subiu (cada uso custa 1000 diamantes, conferido em _check_save), no maximo 1 000 000 por uso
create or replace function gog._ar_gold(o jsonb, nw jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
begin
  return case when gog._n(nw, 'ar', 'n') > gog._n(o, 'ar', 'n')
    then least(greatest(0, gog._n(nw, 'ar', 'gold') - gog._n(o, 'ar', 'gold')), 1000000 * least(5, gog._n(nw, 'ar', 'n') - gog._n(o, 'ar', 'n'))) else 0 end;
end $$;

do $$
declare f text;
begin
  foreach f in array array['gog._ip()', 'gog._rate(text,int,int)', 'gog._tot(jsonb,int)', 'gog._ar_gold(jsonb,jsonb)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
  end loop;
end $$;

-- ------------------------------------------------------------ API publica
drop function if exists public.gog_register(text, text);
create or replace function public.gog_register(p_nick text, p_proof text, p_gender text default 'm', p_country text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; cnt int; since timestamptz; hdr json; ip text; iph text;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_nick'); end if;
  if not gog._text_ok(p_nick) then return jsonb_build_object('ok', false, 'error', 'bad_word'); end if;
  if p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if p_gender is null or p_gender not in ('m', 'f') or (p_country is not null and p_country !~ '^[A-Z]{2}$') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if lower(p_nick) in ('admin', 'administrator', 'moderator', 'mod', 'system', 'support', 'staff', 'null', 'undefined', 'guardiansofgold') then
    return jsonb_build_object('ok', false, 'error', 'nick_taken');
  end if;
  -- no maximo 20 contas por rede (IP): usa o cabecalho do Cloudflare/Supabase, so guarda um HMAC
  begin hdr := nullif(current_setting('request.headers', true), '')::json; exception when others then hdr := null; end;
  ip := btrim(coalesce(nullif(hdr->>'cf-connecting-ip', ''), nullif(split_part(coalesce(hdr->>'x-forwarded-for', ''), ',', -1), ''), nullif(hdr->>'x-real-ip', ''), ''));
  if ip <> '' then
    iph := encode(extensions.hmac(ip, (select v from gog.secrets where k = 'ip_salt'), 'sha256'), 'hex');
    if (select count(*) from gog.players where reg_ip = iph) >= 20 then return jsonb_build_object('ok', false, 'error', 'ip_limit'); end if;
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
    insert into gog.players (nick, nick_key, pass_hash, reg_ip, gender, country)
    values (p_nick, lower(p_nick), extensions.crypt(p_proof, extensions.gen_salt('bf', 12)), iph, p_gender, p_country)
    returning id into pid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'nick_taken');
  end;
  return jsonb_build_object('ok', true, 'nick', p_nick, 'token', gog._new_session(pid), 'gender', p_gender, 'country', p_country);
end $$;

create or replace function public.gog_login(p_nick text, p_proof text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players; a gog.players; ok boolean; wait int; iph text;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' or p_proof is null or p_proof !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  iph := gog._ip();   -- no maximo 20 tentativas por minuto por rede (cada uma custa um bcrypt)
  if iph is not null and not gog._rate('login:' || iph, 20, 60) then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
  select * into v from gog.players where nick_key = lower(p_nick) for update;
  if not found then
    perform extensions.crypt(p_proof, extensions.gen_salt('bf', 12));   -- mesmo custo: nao revela se o nick existe
    return jsonb_build_object('ok', false, 'error', 'bad_login');
  end if;
  -- a conta e o personagem principal: a palavra-passe e o bloqueio por tentativas vivem nele
  if v.owner is not null then select * into a from gog.players where id = v.owner for update; else a := v; end if;
  if a.locked_until is not null and a.locked_until > now() then
    perform extensions.crypt(p_proof, extensions.gen_salt('bf', 12));
    return jsonb_build_object('ok', false, 'error', 'locked', 'wait', ceil(extract(epoch from a.locked_until - now()))::int);
  end if;
  ok := extensions.crypt(p_proof, a.pass_hash) = a.pass_hash;
  if ok and (not v.active or not a.active) then return jsonb_build_object('ok', false, 'error', 'inactive'); end if;
  if ok then
    update gog.players set failed = 0, locked_until = null where id = a.id;
    return jsonb_build_object('ok', true, 'nick', v.nick, 'token', gog._new_session(v.id), 'gender', v.gender, 'country', v.country);
  end if;
  if a.fail_at is null or a.fail_at < now() - interval '1 hour' then a.failed := 0; end if;   -- as falhas expiram: ninguem fica bloqueado para sempre por tentativas alheias
  wait := case when a.failed + 1 >= 5 then least(3600, 30 * (2 ^ least(a.failed + 1 - 5, 7))::int) else 0 end;
  update gog.players set failed = a.failed + 1, fail_at = now(), locked_until = case when wait > 0 then now() + make_interval(secs => wait) end where id = a.id;
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

-- Os jogadores nao podem apagar a conta. O administrador desativa/reativa com gog.set_active (ver docs/ONLINE.md).
drop function if exists public.gog_delete(text, text);
create or replace function gog.set_active(p_nick text, p_active boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare pid bigint;
begin
  select coalesce(owner, id) into pid from gog.players where nick_key = lower(p_nick);
  if pid is null then return 'not_found'; end if;
  update gog.players set active = p_active, inactive_at = case when p_active then null else now() end where coalesce(owner, id) = pid;   -- a conta inteira (todos os personagens)
  if not p_active then delete from gog.sessions where player_id in (select id from gog.players where coalesce(owner, id) = pid); end if;
  return case when p_active then 'reactivated' else 'deactivated' end;
end $$;
revoke all on function gog.set_active(text, boolean) from public;

-- o perfil publico usa o save VERIFICADO no servidor (atributos e nivel da arma), nunca o que o cliente diz
create or replace function gog._truth_build(nb jsonb, sv jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare a jsonb; wid text;
begin
  if nb is null or sv is null then return nb; end if;
  a := sv->'attr';
  if jsonb_typeof(a) = 'object' then
    nb := nb || jsonb_build_object('attr', jsonb_build_object('vit', least(greatest(gog._n(a, 'vit'), 0), 99999)::int, 'str', least(greatest(gog._n(a, 'str'), 0), 99999)::int,
                                                              'agi', least(greatest(gog._n(a, 'agi'), 0), 99999)::int, 'per', least(greatest(gog._n(a, 'per'), 0), 99999)::int));
  end if;
  wid := nb->'weapon'->>'id';
  if wid is not null and jsonb_typeof(sv->'wl') = 'object' then nb := jsonb_set(nb, '{weapon,lv}', to_jsonb(least(greatest(gog._n(sv->'wl', wid), 0), 20)::int)); end if;
  return nb;
end $$;

create or replace function public.gog_submit(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pid bigint; v gog.players; first_time boolean; dt double precision;
  n_level int; n_kills bigint; n_gold bigint; n_bosses int; n_raids int; n_w int[]; n_cls text; o_w int[]; i int; nb jsonb;
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
  if v.save is null then return jsonb_build_object('ok', false, 'error', 'no_save'); end if;   -- o ranking so aceita contas com save verificado no servidor
  first_time := v.submitted_at is null;
  if v.save is not null then   -- o ranking usa o save verificado no servidor, nunca o que o cliente diz (e pode descer, nao so subir)
    n_level := greatest(1, gog._n(v.save, 'pl', 'lv'))::int; n_kills := gog._n(v.save, 'stats', 'kills')::bigint; n_gold := gog._n(v.save, 'stats', 'gold')::bigint;
    n_bosses := gog._n(v.save, 'stats', 'bosses')::int; n_raids := gog._raids_total(v.save)::int;
    n_w := array[gog._nv(gog._idx(v.save->'farmBest', 0))::int, gog._nv(gog._idx(v.save->'farmBest', 1))::int, gog._nv(gog._idx(v.save->'farmBest', 2))::int, gog._nv(gog._idx(v.save->'farmBest', 3))::int, gog._nv(gog._idx(v.save->'farmBest', 4))::int, gog._nv(gog._idx(v.save->'farmBest', 5))::int];
  end if;
  if v.save is not null then n_level := least(n_level, greatest(1, gog._n(v.save, 'pl', 'lv'))::int); end if;   -- o nivel publico nunca passa do nivel do save verificado
  dt := least(greatest(extract(epoch from now() - coalesce(v.submitted_at, v.created_at)), 20), 7 * 86400);
  o_w := array[v.w0, v.w1, v.w2, v.w3, v.w4, v.w5];
  -- limites de plausibilidade (o 1.o envio usa tetos fixos, os seguintes dependem do tempo passado)
  if first_time then
    if n_level > 300 or n_kills > 500000 or n_gold > 1000000000000 or n_bosses > 5000 or n_raids > 1000 or greatest(n_w[1], n_w[2], n_w[3], n_w[4], n_w[5], n_w[6]) > 300 then
      return jsonb_build_object('ok', false, 'error', 'implausible');
    end if;
  else
    if n_level > v.level + 10 + dt / 10 or n_kills > v.kills + 2000 + dt * 50 or n_gold > v.gold + 1000000 + dt * 5000
       or n_bosses > v.bosses + 100 + dt / 3 or n_raids > v.raids + 20 + dt / 10 then
      return jsonb_build_object('ok', false, 'error', 'implausible');
    end if;
    for i in 1..6 loop
      if n_w[i] > o_w[i] + 20 + dt / 2 then return jsonb_build_object('ok', false, 'error', 'implausible'); end if;
    end loop;
  end if;
  nb := gog._clean_build(p->'build');
  nb := gog._truth_build(nb, v.save);
  if nb is not null and jsonb_typeof(nb->'attr') = 'object' and coalesce((nb->'attr'->>'vit')::numeric, 0) + coalesce((nb->'attr'->>'str')::numeric, 0) + coalesce((nb->'attr'->>'agi')::numeric, 0) + coalesce((nb->'attr'->>'per')::numeric, 0) > 4 * n_level + 1240 then nb := nb - 'attr'; end if;   -- atributos impossiveis para o nivel: nao entram no perfil publico
  if nb is not null then
    nb := nb - 'title';   -- o titulo mostrado vem do save verificado, nunca do pedido
    if v.save is not null and coalesce(v.save->>'title', '') <> '' and gog._title_ok(v.save, coalesce(v.owner, v.id), v.save->>'title') then nb := nb || jsonb_build_object('title', v.save->>'title'); end if;
  end if;
  update gog.players set
    cls = n_cls, build = coalesce(nb, build), level = n_level, kills = n_kills, gold = n_gold,
    bosses = n_bosses, raids = n_raids,
    w0 = n_w[1], w1 = n_w[2], w2 = n_w[3], w3 = n_w[4], w4 = n_w[5], w5 = n_w[6],
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

create or replace function public.gog_nick_free(p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare iph text := gog._ip();
begin
  if iph is not null and not gog._rate('nick:' || iph, 30, 60) then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
  return jsonb_build_object('ok', true, 'free', not exists (select 1 from gog.players where nick_key = lower(coalesce(p_nick, ''))));
end $$;

-- ------------------------------------------------------------ permissoes
do $$
declare f text;
begin
  foreach f in array array[
    'public.gog_register(text,text,text,text)', 'public.gog_login(text,text)', 'public.gog_logout(text)',
    'public.gog_submit(text,jsonb)', 'public.gog_board(text,int,text)', 'public.gog_nick_free(text)',
    'gog._new_session(bigint)', 'gog._auth(text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
  end loop;
  foreach f in array array[
    'public.gog_register(text,text,text,text)', 'public.gog_login(text,text)', 'public.gog_logout(text)',
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
  return jsonb_build_object('ok', true, 'rev', v.save_rev, 'save', v.save, 'dev', v.save_dev, 'uid', v.uid, 'cls', v.char_cls,
    'taken', coalesce((select jsonb_agg(o.char_cls) from gog.players o where coalesce(o.owner, o.id) = coalesce(v.owner, v.id) and o.id <> v.id and o.char_cls is not null), '[]'::jsonb));
end $$;


-- ====================================================== anti-batota: o servidor valida o save
-- Rejeita saves com saltos impossiveis (ouro, diamantes, nivel...), conquistas que o save nao justifica e titulos que nao ganhaste.
-- Valores impossiveis banem a conta logo; os outros contam como ocorrencias (a 3.a a conta e desativada).
create table if not exists gog.violations (
  id bigserial primary key, root bigint not null references gog.players(id) on delete cascade,
  at timestamptz not null default now(), kind text not null, detail text, counted boolean not null default true);
alter table gog.violations enable row level security;
revoke all on gog.violations from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on gog.violations from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on gog.violations from authenticated; end if;
end $$;

create or replace function gog._nv(j jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare t text;
begin
  t := j #>> '{}';
  if t is not null and t ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then return t::numeric; end if;   -- qualquer tamanho/notacao cientifica (antes valores enormes davam 0 e passavam)
  return 0;
end $$;

create or replace function gog._n(j jsonb, variadic p text[]) returns numeric
language plpgsql immutable set search_path = '' as $$
declare t text;
begin
  t := j #>> p;
  if t is not null and t ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then return t::numeric; end if;   -- qualquer tamanho/notacao cientifica (antes valores enormes davam 0 e passavam)
  return 0;
end $$;

create or replace function gog._idx(j jsonb, i int) returns jsonb
language sql immutable set search_path = '' as $$
  select case jsonb_typeof(j) when 'array' then j -> i when 'object' then j -> i::text else null end;
$$;

-- confere se o save cumpre a condicao de uma conquista (os ids sao os do jogo)
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

-- cada titulo vem de uma conquista (o "beta" vem do codigo promocional)
create or replace function gog._title_ach(t text) returns text
language sql immutable set search_path = '' as $$
  select case t
    when 'reaper' then 'kills10000' when 'slayer' then 'kills50000' when 'treasure' then 'guard1' when 'tycoon' then 'spend100000'
    when 'veteran' then 'lv50' when 'legend' then 'lv100' when 'immortal' then 'lv120' when 'tireless' then 'farm25'
    when 'lord0' then 'wave0_50' when 'lord1' then 'wave1_50' when 'lord2' then 'wave2_50' when 'lord3' then 'wave3_50' when 'lord4' then 'wave4_50' when 'lord5' then 'wave5_50'
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
  return gog._nv(s->'ach'->a) = 2 and gog._ach_ok(a, s);
end $$;

-- devolve null se o save e plausivel, ou o motivo ('abs:...' = valor impossivel)
-- ----- validacao de saves (valores impossiveis = ban) e historico de saves -----
create or replace function gog._item_bad(it jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(it) = 'object' and (gog._n(it, 'il') > 125 or gog._n(it, 'il') < 0 or gog._n(it, 'ench') > 12 or gog._n(it, 'ench') < 0 or gog._n(it, 'st') > 3 or gog._n(it, 'st') < 0 or gog._n(it, 'r') > 4 or gog._n(it, 'r') < 0)
$$;
create or replace function gog._sane(s jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare b jsonb; it jsonb; lim numeric; tot numeric;
begin
  lim := 4 * gog._n(s, 'pl', 'lv') + least(gog._n(s, 'buyN'), 1200) + 40;   -- 3 pontos por nivel + ate 1 por nivel das recompensas por nivel + os comprados
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

-- recompensas por nivel resgatadas entre dois saves: normalmente so os niveis novos (chestDone sobe), mas num reset das recompensas
-- (rwv sobe) o jogador volta a resgatar desde o nivel 1, por isso conta-se desde o 1. Formulas = levelReward() no jogo, com folga.
create or replace function gog._rw_levels(o jsonb, nw jsonb) returns int
language sql immutable set search_path = '' as $$
  select greatest(0, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int - case when coalesce(gog._n(nw, 'rwv'), 0) > coalesce(gog._n(o, 'rwv'), 0) then 0 else coalesce(gog._n(o, 'chestDone'), 0)::int end)
$$;
create or replace function gog._rw_gold(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(sum(100 + 45 * l + 0.4 * l * l), 0) * 1.2 from generate_series(least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int - gog._rw_levels(o, nw) + 1, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int) l
$$;
create or replace function gog._rw_gems(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$ select 8 * gog._rw_levels(o, nw)::numeric $$;

create or replace function gog._check_save(o jsonb, nw jsonb, dt double precision, p_root bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare sl double precision := least(1, dt / 60); k text; val jsonb; oval jsonb; n_claim int := 0; allow numeric; lv0 numeric; lv1 numeric; i int; j int; g0 numeric; g1 numeric; t text; s0 numeric; s1 numeric; r0 numeric; r1 numeric; refund numeric := 0; c text;
begin
  -- valores impossiveis (ban imediato)
  if gog._n(nw, 'gold') > 2147483647 or gog._n(nw, 'gems') > 60000 or gog._n(nw, 'pl', 'lv') > 400 or gog._n(nw, 'stats', 'kills') > 5000000
     or gog._n(nw, 'stats', 'spent') > 1000000000000 or gog._n(nw, 'gold') < 0 or gog._n(nw, 'gems') < 0 or gog._n(nw, 'bagSlots') > 5 then
    return 'abs:values';
  end if;
  for i in 0..5 loop
    if gog._nv(gog._idx(nw->'farmBest', i)) > 2000 or gog._nv(gog._idx(nw->'pres', i)) > 5 then return 'abs:waves'; end if;
  end loop;
  if jsonb_typeof(nw->'pets'->'lv') = 'object' and exists (select 1 from jsonb_each(nw->'pets'->'lv') e where gog._nv(e.value) > 30) then return 'abs:pets'; end if;   -- os pets vao ate ao nivel 30
  lv1 := gog._n(nw, 'pl', 'lv'); g1 := gog._n(nw, 'gems');
  if gog._n(nw, 'chestDone') > lv1 + 1 then return 'chests'; end if;
  -- atributos: os pontos distribuidos + por gastar nunca passam de 3 por nivel + os pontos comprados (max. 1200); valores absurdos = ban imediato
  if (select coalesce(sum(case when e.value ~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then e.value::numeric else 1e12 end), 0)
        from jsonb_each_text(case when jsonb_typeof(nw->'attr') = 'object' then nw->'attr' else '{}'::jsonb end) e)
     + coalesce(gog._n(nw, 'pts'), 0) > 4 * coalesce(gog._n(nw, 'pl', 'lv'), 1) + least(coalesce(gog._n(nw, 'buyN'), 0), 1200) + 40
     or coalesce(gog._n(nw, 'buyN'), 0) > 1200 then
    return 'abs:attrs';
  end if;
  if o is not null and gog._items_new_bad(o, nw) then return 'items:stats'; end if;   -- itens novos com estatisticas impossiveis para o nivel e a raridade
  if gog._sane(nw) is not null then return gog._sane(nw); end if;   -- itens, niveis de arma, pedras, copias e builds guardadas
  -- conquistas: so as novas precisam de prova no proprio save
  if nw ? 'ach' and jsonb_typeof(nw->'ach') <> 'object' then return 'ach:format'; end if;
  for k, val in select e.key, e.value from jsonb_each(coalesce(nw->'ach', '{}'::jsonb)) e loop
    if val <> '1'::jsonb and val <> '2'::jsonb then return 'ach:' || left(k, 20); end if;
    oval := o -> 'ach' -> k;
    if oval is not null and gog._nv(oval) >= gog._nv(val) then continue; end if;
    if not gog._ach_ok(k, nw) then return 'ach:' || left(k, 20); end if;
    if val = '2'::jsonb then n_claim := n_claim + 1; end if;
  end loop;
  t := nw ->> 'title';
  if not gog._title_ok(nw, p_root, t) then return 'title:' || left(coalesce(t, ''), 20); end if;
  -- saltos impossiveis face ao save anterior (dt = segundos desde a gravacao anterior)
  if o is not null then
    lv0 := gog._n(o, 'pl', 'lv'); g0 := gog._n(o, 'gems');
    if lv1 > lv0 + greatest(5, 8 * sl) + dt / 10 then return 'level'; end if;
    if gog._n(nw, 'stats', 'kills') > gog._n(o, 'stats', 'kills') + greatest(100, 100 * sl) + dt * 12 then return 'kills'; end if;
    if gog._n(nw, 'stats', 'bosses') > gog._n(o, 'stats', 'bosses') + greatest(5, 10 * sl) + dt / 8 then return 'bosses'; end if;
    if gog._n(nw, 'stats', 'guard') > gog._n(o, 'stats', 'guard') + greatest(2, 2 * sl) + dt / 60 then return 'guard'; end if;
    if gog._n(nw, 'stats', 'fuses') > gog._n(o, 'stats', 'fuses') + greatest(5, 5 * sl) + dt / 20 then return 'fuses'; end if;
    if gog._n(nw, 'gold') > gog._n(o, 'gold') + gog._gcred(o, dt) + dt * 2000 + gog._rw_gold(o, nw) + gog._ar_gold(o, nw) then return 'gold'; end if;
    if gog._n(nw, 'stats', 'spent') > gog._n(o, 'stats', 'spent') + gog._n(o, 'gold') + gog._gcred(o, dt) + dt * 2000 + gog._rw_gold(o, nw) + gog._ar_gold(o, nw) then return 'spent'; end if;
    s0 := 0; s1 := 0; r0 := 0; r1 := 0;
    for i in 0..5 loop
      if gog._nv(gog._idx(nw->'farmBest', i)) > gog._nv(gog._idx(o->'farmBest', i)) + greatest(3, 6 * sl) + dt / 8 then return 'waves'; end if;
      s0 := s0 + gog._nv(gog._idx(o->'pres', i)); s1 := s1 + gog._nv(gog._idx(nw->'pres', i));
      for j in 0..4 loop
        r0 := r0 + gog._nv(gog._idx(gog._idx(o->'raids', i), j)); r1 := r1 + gog._nv(gog._idx(gog._idx(nw->'raids', i), j));
      end loop;
    end loop;
    if s1 > s0 + 1 + dt / 120 then return 'prestige'; end if;
    if r1 > r0 + greatest(2, 3 * sl) + dt / 45 then return 'raids'; end if;
    -- crescimento de armas, pedras e copias (antes so se verificava o valor maximo de cada uma)
    if gog._tot(nw->'wl') > gog._tot(o->'wl') + greatest(6, 12 * sl) + dt / 10 then return 'growth:wl'; end if;
    if gog._tot(nw->'stones') > gog._tot(o->'stones') + greatest(60, 200 * sl) + dt / 2 then return 'growth:stones'; end if;
    if gog._tot(nw->'wst') > gog._tot(o->'wst') + greatest(150, 200 * sl) + dt / 2 then return 'growth:copies'; end if;
    -- diamantes: so sobem por subir de nivel (a cada 10), baus, conquistas recebidas (max. 75 cada) e o codigo promocional
    allow := 10 * greatest(0, floor(lv1 / 10) - floor(lv0 / 10)) + 5 * greatest(0, gog._n(nw, 'chestDone') - gog._n(o, 'chestDone')) + 75 * n_claim + greatest(40, 90 * sl) + gog._rw_gems(o, nw);
    -- reembolso unico das skins removidas: so conta o que o save anterior provava ter comprado (300, 600 e 900 diamantes)
    if nw ? 'skRef' and not (o ? 'skRef') then
      foreach c in array array['knight', 'archer', 'mage'] loop
        for i in 2..(case when c = 'knight' then 4 else 3 end) loop
          if (o->'sk'->c->>i) = '1' then refund := refund + (array[0, 0, 300, 600, 900])[i + 1]; end if;
        end loop;
      end loop;
    end if;
    if g1 > g0 + allow + refund then return 'gems'; end if;
    -- cada uso do Auto-Raid custa 1000 diamantes: o save tem de os mostrar gastos (senao o ouro do Auto-Raid nao conta)
    if gog._n(nw, 'ar', 'paid') > gog._n(o, 'ar', 'paid') then return 'ar'; end if;   -- as compras pagas so o servidor as regista (gog_buy)
    if gog._n(nw, 'ar', 'n') > gog._n(o, 'ar', 'n') and g1 > g0 + allow + refund - 1000 * least(5, greatest(0, gog._n(nw, 'ar', 'n') - gog._n(o, 'ar', 'n') - greatest(0, gog._n(o, 'ar', 'paid') - gog._n(o, 'ar', 'n')))) then return 'ar'; end if;   -- usos ja pagos no servidor nao voltam a descer os diamantes
  end if;
  return null;
end $$;

-- regista a ocorrencia e desativa a conta (a 3.a ocorrencia ou logo, se o valor for impossivel); devolve true se baniu
create or replace function gog._violation(p_player bigint, p_kind text, p_detail text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_root bigint; last_at timestamptz; cnt int;
begin
  select coalesce(owner, id) into v_root from gog.players where id = p_player;
  select max(vv.at) into last_at from gog.violations vv where vv.root = v_root and vv.counted;
  insert into gog.violations (root, kind, detail, counted) values (v_root, left(p_kind, 40), left(p_detail, 400), last_at is null or last_at < now() - interval '10 minutes');   -- repeticoes seguidas (< 10 min) nao contam mais do que uma
  select count(*) into cnt from gog.violations vv where vv.root = v_root and vv.counted and vv.at > now() - interval '30 days';
  if p_kind like 'abs:%' or cnt >= 3 then
    update gog.players set active = false, inactive_at = now() where coalesce(owner, id) = v_root;
    delete from gog.sessions where player_id in (select id from gog.players where coalesce(owner, id) = v_root);
    return true;
  end if;
  return false;
end $$;

-- Recompensas por nivel calculadas NO SERVIDOR: o jogo pede "resgata ate ao nivel N" e o servidor decide o ouro, os diamantes, os pontos e as pedras
-- (formulas iguais a levelReward() no jogo). Devolve tambem a descricao dos itens e das copias de arma, que o jogo gera.
create or replace function public.gog_claim_rewards(p_token text, p_up_to int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pid bigint; v gog.players; lv int; cd int; tgt int; l int; r int; g numeric := 0; gm numeric := 0; pt numeric := 0; st numeric[] := array[0, 0, 0, 0, 0];
  items jsonb := '[]'::jsonb; wp jsonb := '[]'::jsonb; ns jsonb; newrev int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  if v.save is null then return jsonb_build_object('ok', false, 'error', 'no_save'); end if;
  lv := least(gog._n(v.save, 'pl', 'lv'), 120)::int; cd := greatest(0, least(gog._n(v.save, 'chestDone'), 120))::int;
  tgt := least(coalesce(p_up_to, 0), lv, 120);
  if tgt <= cd then return jsonb_build_object('ok', true, 'n', 0, 'rev', v.save_rev, 'chestDone', cd); end if;
  for l in (cd + 1)..tgt loop
    g := g + round(100 + 45 * l + 0.4 * l * l);
    pt := pt + case when l % 10 = 0 then 4 when l % 5 = 0 then 2 when l % 2 = 0 then 1 else 0 end;
    gm := gm + case when l % 10 = 0 then 15 when l % 5 = 0 then 5 else 0 end;
    if l % 4 = 0 then r := least(4, l / 25); st[r + 1] := st[r + 1] + case when l % 20 = 0 then 2 else 1 end; end if;
    if l % 5 = 0 then items := items || jsonb_build_array(jsonb_build_object('l', l, 'slot', (array['head', 'chest', 'boots', 'amulet'])[((l / 5 - 1) % 4) + 1], 'r', least(4, l / 20 + case when l % 10 = 0 then 1 else 0 end), 'il', least(120, l))); end if;
    if l % 10 = 5 then wp := wp || jsonb_build_array(jsonb_build_object('l', l, 'tier', least(4, l / 15))); end if;
  end loop;
  ns := jsonb_build_array(gog._n(v.save, 'stones', '0') + st[1], gog._n(v.save, 'stones', '1') + st[2], gog._n(v.save, 'stones', '2') + st[3], gog._n(v.save, 'stones', '3') + st[4], gog._n(v.save, 'stones', '4') + st[5]);
  update gog.players set save_rev = save_rev + 1,
    save = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(save,
      '{gold}', to_jsonb(least(2147483647, gog._n(save, 'gold') + g))), '{gems}', to_jsonb(gog._n(save, 'gems') + gm)), '{pts}', to_jsonb(gog._n(save, 'pts') + pt)),
      '{chestDone}', to_jsonb(tgt)), '{stones}', ns)
  where id = pid returning save_rev into newrev;   -- save_at nao muda: os limites de crescimento dependem dele
  return jsonb_build_object('ok', true, 'n', tgt - cd, 'from', cd + 1, 'rev', newrev, 'chestDone', tgt, 'gold', g, 'gems', gm, 'pts', pt, 'stones', to_jsonb(st), 'items', items, 'wpn', wp);
end $$;

create or replace function public.gog_save_put(p_token text, p_save jsonb, p_rev int, p_dev text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; newrev int; c text; reason text; banned boolean; pts numeric; dtv double precision;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_save is null or jsonb_typeof(p_save) <> 'object' or not (p_save ? 'cls') or p_rev is null then
    return jsonb_build_object('ok', false, 'error', 'bad_data');
  end if;
  if length(p_save::text) > 600000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  select * into v from gog.players where id = pid for update;
  if v.save is not null and gog._n(p_save, 'ep') <> gog._n(v.save, 'ep') then return jsonb_build_object('ok', false, 'error', 'epoch'); end if;   -- o admin repos este save: o save que o cliente tem (local) e antigo e nunca pode substituir o do servidor
  if p_rev <> v.save_rev then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'rev', v.save_rev, 'dev', v.save_dev);
  end if;
  if v.save_at is not null and v.save_at > now() - interval '10 seconds' then
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
  dtv := least(greatest(extract(epoch from now() - coalesce(v.save_at, now() - interval '10 seconds')), 10), 7 * 86400);
  reason := gog._check_save(v.save, p_save, dtv, coalesce(v.owner, v.id));
  if reason is not null then
    banned := gog._violation(pid, reason, reason);
    return jsonb_build_object('ok', false, 'error', case when banned then 'banned' else 'cheat' end);
  end if;
  if v.save is not null then   -- credito de ouro (o servidor escreve-o, o cliente nao o controla)
    p_save := jsonb_set(p_save, '{gcred}', to_jsonb(greatest(0, gog._gcred(v.save, dtv) - greatest(0, gog._n(p_save, 'gold') - gog._n(v.save, 'gold') - gog._rw_gold(v.save, p_save) - gog._ar_gold(v.save, p_save) - dtv * 2000))));
  else p_save := jsonb_set(p_save, '{gcred}', to_jsonb(500000)); end if;
  update gog.players set save = p_save, char_cls = coalesce(char_cls, c), save_rev = save_rev + 1, save_at = now(), save_dev = left(p_dev, 32) where id = pid returning save_rev into newrev;
  if v.save is not null then   -- guilda: os mobs, bosses e raids novos (ja validados acima) dao pontos a guilda
    pts := greatest(0, gog._n(p_save, 'stats', 'kills') - gog._n(v.save, 'stats', 'kills')) + 10 * greatest(0, gog._n(p_save, 'stats', 'bosses') - gog._n(v.save, 'stats', 'bosses')) + 60 * greatest(0, gog._raids_total(p_save) - gog._raids_total(v.save));
    if pts > 0 then perform gog._gcontrib(v.id, pts); end if;
  end if;
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
-- O nick nunca muda. So o sexo (aspeto) e o pais (bandeira) se podem editar.
create or replace function public.gog_set_profile(p_token text, p_gender text, p_country text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_gender is null or p_gender not in ('m', 'f') or (p_country is not null and p_country !~ '^[A-Z]{2}$') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  update gog.players set gender = p_gender, country = p_country where coalesce(owner, id) = (select coalesce(owner, id) from gog.players where id = pid);
  return jsonb_build_object('ok', true, 'gender', p_gender, 'country', p_country);
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

do $$
declare f text;
begin
  foreach f in array array['public.gog_profile(text)', 'public.gog_set_profile(text,text,text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
  execute 'revoke all on function gog._clean_build(jsonb) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'revoke all on function gog._clean_build(jsonb) from anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'revoke all on function gog._clean_build(jsonb) from authenticated'; end if;
end $$;

-- ====================================================== varios personagens por conta (um por classe)
create or replace function public.gog_chars(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; root bigint; rows jsonb;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select coalesce(owner, id) into root from gog.players where id = pid;
  select coalesce(jsonb_agg(jsonb_build_object('nick', nick, 'cls', char_cls, 'level', level, 'current', id = pid, 'main', id = root) order by id), '[]'::jsonb)
    into rows from gog.players where coalesce(owner, id) = root;
  return jsonb_build_object('ok', true, 'chars', rows);
end $$;

create or replace function public.gog_char_create(p_token text, p_cls text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; r gog.players; nid bigint; n int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_cls is null or p_cls not in ('knight', 'archer', 'mage') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_nick'); end if;
  if not gog._text_ok(p_nick) then return jsonb_build_object('ok', false, 'error', 'bad_word'); end if;
  if lower(p_nick) in ('admin', 'administrator', 'moderator', 'mod', 'system', 'support', 'staff', 'null', 'undefined', 'guardiansofgold') then return jsonb_build_object('ok', false, 'error', 'nick_taken'); end if;
  select * into r from gog.players where id = (select coalesce(owner, id) from gog.players where id = pid) for update;
  select count(*) into n from gog.players where coalesce(owner, id) = r.id;
  if n >= 3 then return jsonb_build_object('ok', false, 'error', 'too_many'); end if;
  if exists (select 1 from gog.players where coalesce(owner, id) = r.id and char_cls = p_cls) then return jsonb_build_object('ok', false, 'error', 'class_taken'); end if;
  if exists (select 1 from gog.players where nick_key = lower(p_nick)) then return jsonb_build_object('ok', false, 'error', 'nick_taken'); end if;
  begin
    insert into gog.players (nick, nick_key, pass_hash, owner, char_cls, cls, gender, country)
    values (p_nick, lower(p_nick), r.pass_hash, r.id, p_cls, p_cls, r.gender, r.country) returning id into nid;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'nick_taken');
  end;
  return jsonb_build_object('ok', true, 'nick', p_nick, 'token', gog._new_session(nid), 'gender', r.gender, 'country', r.country, 'cls', p_cls);
end $$;

create or replace function public.gog_char_switch(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; t gog.players;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_nick'); end if;
  select * into t from gog.players where nick_key = lower(p_nick) and coalesce(owner, id) = (select coalesce(owner, id) from gog.players where id = pid) and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'nick', t.nick, 'token', gog._new_session(t.id), 'gender', t.gender, 'country', t.country, 'cls', t.char_cls);
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.gog_chars(text)', 'public.gog_char_create(text,text,text)', 'public.gog_char_switch(text,text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;

-- personagens que ja existiam: a classe passa a ficar fixa
update gog.players set char_cls = save->>'cls' where char_cls is null and save is not null and save->>'cls' in ('knight', 'archer', 'mage');

-- ====================================================== codigos promocionais (cada codigo so se usa 1 vez por CONTA)
create table if not exists gog.promo (code text primary key, gems int not null default 0, title text);
create table if not exists gog.promo_used (root bigint not null references gog.players(id) on delete cascade, code text not null references gog.promo(code) on delete cascade, at timestamptz not null default now(), primary key (root, code));
alter table gog.promo enable row level security;
alter table gog.promo_used enable row level security;
revoke all on gog.promo, gog.promo_used from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on gog.promo, gog.promo_used from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on gog.promo, gog.promo_used from authenticated; end if;
end $$;
insert into gog.promo (code, gems, title) values ('beta', 10, 'beta') on conflict (code) do nothing;   -- titulo Beta Tester + 10 diamantes

alter table gog.promo add column if not exists bags int not null default 0;   -- mochilas desbloqueadas pelo codigo (ate 5)
alter table gog.promo add column if not exists expires_at timestamptz;          -- depois disto o codigo deixa de funcionar
create or replace function public.gog_redeem(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; root bigint; pr gog.promo; k text := lower(btrim(coalesce(p_code, ''))); newrev int; nb int := 0;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if k !~ '^[a-z0-9_]{1,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_code'); end if;
  select * into pr from gog.promo where code = k;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_code'); end if;
  if pr.expires_at is not null and now() >= pr.expires_at then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  select coalesce(owner, id) into root from gog.players where id = pid;   -- a conta e o personagem principal: todos os personagens partilham o mesmo uso
  begin
    insert into gog.promo_used (root, code) values (root, k);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'used');
  end;
  if pr.bags > 0 then   -- mochilas gratis: o servidor muda o save de todos os personagens da conta (o jogo nao pode subir bagSlots sozinho)
    nb := least(5, pr.bags);
    update gog.players set save = jsonb_set(save, '{bagSlots}', to_jsonb(greatest(nb, coalesce(gog._n(save, 'bagSlots'), 1)::int))), save_rev = save_rev + 1
     where coalesce(owner, id) = root and save is not null and jsonb_typeof(save) = 'object';
    select save_rev into newrev from gog.players where id = pid;
  end if;
  return jsonb_build_object('ok', true, 'gems', pr.gems, 'title', pr.title, 'bags', nb, 'rev', newrev);
end $$;
insert into gog.promo (code, gems, title, bags, expires_at) values ('backpack', 0, null, 5, timestamptz '2026-11-22 00:00:00 Europe/Lisbon') on conflict (code) do nothing;   -- 5 mochilas gratis ate ao fim de 21/11/2026
do $$
declare f text := 'public.gog_redeem(text,text)';
begin
  execute format('revoke all on function %s from public', f);
  if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
end $$;

do $$
declare f text;
begin
  foreach f in array array['gog._nv(jsonb)', 'gog._n(jsonb,text[])', 'gog._idx(jsonb,int)', 'gog._ach_ok(text,jsonb)', 'gog._title_ach(text)', 'gog._title_ok(jsonb,bigint,text)',
    'gog._check_save(jsonb,jsonb,double precision,bigint)', 'gog._violation(bigint,text,text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
  end loop;
end $$;


-- ====================================================== guildas (sem chat; os pontos vem do progresso dos membros)
-- Regras: nivel 40 para criar (15 000 ouro + 100 diamantes), ate 10 membros, so lider e membros, nivel maximo 40.
-- A guilda sobe sozinha com os mobs (1), bosses (10) e raids (60) de cada membro; cada nivel da 1 ponto que so o lider gasta
-- em 4 melhorias (XP, ouro, drops e atributos), cada uma ate ao nivel 10.
create table if not exists gog.guilds (
  id bigserial primary key, name text not null, name_key text not null unique, tag text not null, tag_key text not null unique,
  leader bigint not null references gog.players(id) on delete cascade, created_at timestamptz not null default now(),
  xp bigint not null default 0, p_xp int not null default 0, p_gold int not null default 0, p_drop int not null default 0, p_attr int not null default 0);
alter table gog.guilds add column if not exists color int not null default 0;     -- 0..7
alter table gog.guilds add column if not exists emblem int not null default 0;    -- 0..11
alter table gog.guilds add column if not exists motto text not null default '';   -- ate 40 caracteres, filtrado
create table if not exists gog.guild_members (
  root bigint primary key references gog.players(id) on delete cascade, guild_id bigint not null references gog.guilds(id) on delete cascade,
  joined_at timestamptz not null default now(), contrib bigint not null default 0);
create table if not exists gog.guild_left (root bigint primary key references gog.players(id) on delete cascade, at timestamptz not null default now());
alter table gog.players add column if not exists guild_at timestamptz;   -- limite de velocidade das acoes de guilda
alter table gog.guilds enable row level security; alter table gog.guild_members enable row level security; alter table gog.guild_left enable row level security;
revoke all on gog.guilds, gog.guild_members, gog.guild_left from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on gog.guilds, gog.guild_members, gog.guild_left from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on gog.guilds, gog.guild_members, gog.guild_left from authenticated; end if;
end $$;

-- filtro de palavras proibidas (ingles e portugues): troca numeros/simbolos por letras, junta letras repetidas e procura
create or replace function gog._norm(t text) returns text language sql immutable set search_path = '' as $$
  select regexp_replace(translate(translate(lower(coalesce(t, '')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'), '0134578@$!|', 'oieastbasii'), '[^a-z]', '', 'g');
$$;
create or replace function gog._text_ok(t text) returns boolean
language plpgsql immutable set search_path = '' as $$
declare n text; c text; w text; cw text; tok text;
begin
  n := gog._norm(t);
  c := regexp_replace(n, '(.)\1+', '\1', 'g');
  foreach w in array array['nigg', 'nigr', 'niga', 'fagg', 'cunt', 'kkk', 'hitler', 'nazi', 'whore', 'slut', 'bitch', 'fuck', 'shit', 'pussy', 'retard', 'tranny', 'rapist',
    'porn', 'blowjob', 'caralho', 'merda', 'paneleiro', 'buceta', 'filhodaputa', 'arrombad', 'punheta', 'cabrao'] loop
    cw := regexp_replace(w, '(.)\1+', '\1', 'g');
    if position(w in n) > 0 or (length(cw) >= 4 and position(cw in c) > 0) then return false; end if;
  end loop;
  foreach tok in array regexp_split_to_array(lower(coalesce(t, '')), '[ _-]+') loop
    tok := gog._norm(tok);
    if tok = any (array['cock', 'dick', 'coon', 'spic', 'kike', 'chink', 'fag', 'cum', 'ass', 'anus', 'tit', 'tits', 'puta', 'putas', 'cona', 'cu', 'viado', 'foda', 'fodase', 'vadia', 'sex']) then return false; end if;
  end loop;
  return true;
end $$;

create or replace function gog._raids_total(s jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare i int; j int; r numeric := 0;
begin
  for i in 0..5 loop for j in 0..4 loop r := r + gog._nv(gog._idx(gog._idx(s->'raids', i), j)); end loop; end loop;
  return r;
end $$;

-- xp acumulada necessaria para cada nivel (ate ao 40: cerca de 6 milhoes de pontos no total)
create or replace function gog._gneed(l int) returns bigint language sql immutable set search_path = '' as $$ select (4000 + 1500 * (l - 1) + 250 * (l - 1) * (l - 1))::bigint $$;
create or replace function gog._glevel(p_xp bigint) returns int
language plpgsql immutable set search_path = '' as $$
declare l int := 1; rem bigint := p_xp;
begin
  while l < 40 and rem >= gog._gneed(l) loop rem := rem - gog._gneed(l); l := l + 1; end loop;
  return l;
end $$;
create or replace function gog._gcap() returns bigint language sql immutable set search_path = '' as $$ select coalesce(sum(gog._gneed(l)), 0) from generate_series(1, 39) l $$;

create or replace function gog._gcontrib(p_root bigint, pts numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare gid bigint;
begin
  update gog.guild_members set contrib = contrib + pts::bigint where root = p_root returning guild_id into gid;
  if gid is not null then update gog.guilds set xp = least(xp + pts::bigint, gog._gcap()) where id = gid; end if;
end $$;

create or replace function gog._ginfo(p_guild bigint, p_root bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare g gog.guilds; lvl int; rem bigint; l int; mem jsonb;
begin
  select * into g from gog.guilds where id = p_guild;
  if not found then return null; end if;
  lvl := gog._glevel(g.xp); rem := g.xp; l := 1;
  while l < lvl loop rem := rem - gog._gneed(l); l := l + 1; end loop;
  select coalesce(jsonb_agg(jsonb_build_object('nick', p.nick, 'cls', p.cls, 'level', p.level, 'contrib', m.contrib, 'leader', m.root = g.leader) order by (m.root = g.leader) desc, m.contrib desc, p.nick), '[]'::jsonb)
    into mem from gog.guild_members m join gog.players p on p.id = m.root where m.guild_id = g.id;
  return jsonb_build_object('id', g.id, 'name', g.name, 'tag', g.tag, 'level', lvl, 'xp', rem, 'need', case when lvl >= 40 then 0 else gog._gneed(lvl) end,
    'perks', jsonb_build_object('xp', g.p_xp, 'gold', g.p_gold, 'drop', g.p_drop, 'attr', g.p_attr), 'free', lvl - (g.p_xp + g.p_gold + g.p_drop + g.p_attr),
    'leader', g.leader = p_root, 'members', mem, 'color', g.color, 'emblem', g.emblem, 'motto', g.motto, 'leader_nick', (select p.nick from gog.players p where p.id = g.leader));
end $$;

-- ----- RPCs (todas com sessao; o servidor decide tudo) -----
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

create or replace function public.gog_guild_list(p_token text, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; rows jsonb;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'tag', s.tag, 'level', s.lv, 'members', s.n, 'leader', s.ln, 'color', s.color, 'emblem', s.emblem) order by s.xp desc, s.id), '[]'::jsonb) into rows from (
    select g.id, g.name, g.tag, g.xp, g.color, g.emblem, gog._glevel(g.xp) as lv, (select count(*) from gog.guild_members m where m.guild_id = g.id) as n, (select p.nick from gog.players p where p.id = g.leader) as ln
    from gog.guilds g order by g.xp desc, g.id limit 12 offset greatest(coalesce(p_offset, 0), 0)) s;
  return jsonb_build_object('ok', true, 'rows', rows);
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

do $$
declare f text;
begin
  foreach f in array array['gog._norm(text)', 'gog._text_ok(text)', 'gog._raids_total(jsonb)', 'gog._gneed(int)', 'gog._glevel(bigint)', 'gog._gcap()', 'gog._gcontrib(bigint,numeric)', 'gog._ginfo(bigint,bigint)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
  end loop;
  foreach f in array array['public.gog_guild_get(text)', 'public.gog_guild_list(text,int)', 'public.gog_guild_create(text,text,text)', 'public.gog_guild_join(text,bigint)', 'public.gog_guild_leave(text)',
    'public.gog_guild_kick(text,text)', 'public.gog_guild_transfer(text,text)', 'public.gog_guild_upgrade(text,text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;


-- ====================================================== guildas: personalizacao e ranking de guildas
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

-- ranking de guildas (publico, como o dos jogadores)
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

-- perfil publico de uma guilda
create or replace function public.gog_guild_public(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare info jsonb;
begin
  info := gog._ginfo(p_id, 0);
  if info is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'guild', info - 'free' - 'leader');
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.gog_guild_style(text,int,int,text)', 'public.gog_guild_board(text,int)', 'public.gog_guild_public(bigint)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;

-- ------------------------------------------------------- administradores (laboratorio de batalha do jogo)
-- gog.admins lista os nicks (em minusculas) que podem abrir o laboratorio. O cliente pergunta a gog_is_admin(token): o servidor responde
-- com base na sessao, por isso editar o jogo no browser nao chega para ver o laboratorio. O laboratorio nao grava nem envia nada.
create table if not exists gog.admins (nick_key text primary key);
alter table gog.admins enable row level security;
insert into gog.admins (nick_key) values ('admin') on conflict do nothing;

create or replace function public.gog_is_admin(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; n text;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select p.nick_key into n from gog.players p where p.id = pid;
  return jsonb_build_object('ok', true, 'admin', exists (select 1 from gog.admins a where a.nick_key = n));
end $$;

do $$
declare f text := 'public.gog_is_admin(text)';
begin
  execute format('revoke all on function %s from public', f);
  if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
end $$;

-- ------------------------------------------------------------ seguranca 2: credito de ouro, itens novos, encantar
-- credito de ouro: alem do ritmo normal (dt * 2000 por segundo) cada conta tem um credito ate 500 000 que regenera 500/s; gravar mais vezes ja nao multiplica a folga
create or replace function gog._gcred(o jsonb, dt double precision) returns numeric
language plpgsql immutable set search_path = '' as $$
begin
  if o ? 'gcred' then return least(500000, greatest(0, gog._n(o, 'gcred')) + dt * 500); end if;
  return 500000;
end $$;

-- limites das estatisticas de um item (formulas do jogo sem os nerfs, com folga): so apanha valores forjados
create or replace function gog._item_stat_bad(it jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare sl text := it->>'slot'; r numeric := gog._n(it, 'r'); il numeric := gog._n(it, 'il'); mb numeric; a jsonb; kk text; b numeric; p numeric; cap numeric;
begin
  if jsonb_typeof(it) <> 'object' then return false; end if;
  if sl = 'ring' then return gog._n(it, 'main', 'v') > 17; end if;
  mb := case sl when 'head' then (30 + 8 * il) * (1 + .24 * r) when 'chest' then (50 + 12 * il) * (1 + .24 * r) when 'boots' then (3 + .25 * il) * (1 + .2 * r) when 'amulet' then (3 + .35 * il) * (1 + .2 * r) end;
  if mb is null then return true; end if;
  if gog._n(it, 'main', 'v') > mb * 1.3 + 2 then return true; end if;
  if jsonb_typeof(it->'aff') = 'array' then
    if jsonb_array_length(it->'aff') > 4 then return true; end if;
    for a in select x from jsonb_array_elements(it->'aff') x loop
      kk := a->>'k'; b := null;
      select s.b, s.p into b, p from (values ('hp', 12, 3), ('dmg', 2.5, .25), ('spd', 1.5, .12), ('cdr', 1.5, .12), ('crit', 1.5, .1), ('ls', .8, .05), ('dr', 1, .08), ('gf', 3, .3), ('xpb', 3, .3)) s(k, b, p) where s.k = kk;
      if b is null then return true; end if;
      if gog._n(a, 'v') > (b + p * il) * 1.25 * (1 + .1 * r) * 1.3 + 1 then return true; end if;
    end loop;
  end if;
  if jsonb_typeof(it->'spec') = 'object' then
    kk := it->'spec'->>'k';
    cap := case when kk in ('burn', 'slow', 'poi', 'elec') then 35 when kk in ('xpb', 'skc') then 20 when kk in ('ls', 'crit', 'gf', 'dr', 'dmg', 'cdmg') then 45 end;
    if cap is null or gog._n(it, 'spec', 'v') > cap + 0.5 then return true; end if;
  end if;
  return false;
end $$;

-- itens novos ou alterados (que o save anterior do servidor nao tinha tal e qual) com estatisticas impossiveis
create or replace function gog._items_new_bad(o jsonb, nw jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare oi jsonb := '[]'::jsonb; it jsonb;
begin
  if jsonb_typeof(o->'bag') = 'array' then oi := o->'bag'; end if;
  if jsonb_typeof(o->'gear') = 'object' then oi := oi || coalesce((select jsonb_agg(e.value) from jsonb_each(o->'gear') e), '[]'::jsonb); end if;
  for it in select e.value from jsonb_each(case when jsonb_typeof(nw->'gear') = 'object' then nw->'gear' else '{}'::jsonb end) e
            union all select x from jsonb_array_elements(case when jsonb_typeof(nw->'bag') = 'array' then nw->'bag' else '[]'::jsonb end) x loop
    if jsonb_typeof(it) = 'object' and not (oi @> jsonb_build_array(it)) and gog._item_stat_bad(it) then return true; end if;
  end loop;
  return false;
end $$;

-- soma dos niveis de encantamento de todos os itens (equipados e na mochila)
create or replace function gog._ench_sum(s jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare r numeric := 0; e jsonb;
begin
  if jsonb_typeof(s->'gear') = 'object' then for e in select x.value from jsonb_each(s->'gear') x loop if jsonb_typeof(e) = 'object' then r := r + greatest(0, gog._n(e, 'ench')); end if; end loop; end if;
  if jsonb_typeof(s->'bag') = 'array' then for e in select x from jsonb_array_elements(s->'bag') x loop if jsonb_typeof(e) = 'object' then r := r + greatest(0, gog._n(e, 'ench')); end if; end loop; end if;
  return r;
end $$;

do $$
declare f text;
begin
  foreach f in array array['gog._gcred(jsonb,double precision)', 'gog._item_stat_bad(jsonb)', 'gog._items_new_bad(jsonb,jsonb)', 'gog._ench_sum(jsonb)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
  end loop;
end $$;

-- ====================================================== compras no servidor (gog_buy) e guilda paga no servidor
-- O servidor confere o preco e desconta ouro/diamantes no SEU save (nao confia no cliente). O jogo aplica o mesmo localmente e adota a revisao.
create or replace function gog._obj(j jsonb) returns jsonb
language sql immutable set search_path = '' as $$ select case when jsonb_typeof(j) = 'object' then j else '{}'::jsonb end $$;

create or replace function public.gog_buy(p_token text, p_what text, p_n int default 0, p_s text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; s jsonb; gold numeric; gems numeric; cg numeric := 0; cd numeric := 0; slots int; own jsonb; ar jsonb; newrev int;
  cls text; wid text; arr jsonb; pets jsonb; pk text; nm text; lvr int[] := array[1, 6, 12, 30, 50]; ok_req boolean;
  it jsonb; it2 jsonb; sl text; bi int; ee numeric; lvl numeric; ok2 boolean; dn boolean; resn text; t text;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_what is null or p_what not in ('bag', 'lo', 'ar', 'wpn', 'pet', 'petname', 'refine') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if not gog._rate('buy:' || pid, 120, 60) then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
  select * into v from gog.players where id = pid for update;
  if v.save is null then return jsonb_build_object('ok', false, 'error', 'no_save'); end if;
  s := v.save; gold := gog._n(s, 'gold'); gems := gog._n(s, 'gems');
  if p_what = 'bag' then   -- mochila: a seguinte, pela ordem (2.a 10 000 ouro, 3.a 25 000, 4.a 200 diamantes, 5.a 300)
    slots := greatest(1, gog._n(s, 'bagSlots'))::int;
    if p_n is null or p_n < 2 or p_n > 5 or p_n <> slots + 1 then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    if p_n = 2 then cg := 10000; elsif p_n = 3 then cg := 25000; elsif p_n = 4 then cd := 200; else cd := 300; end if;
    s := jsonb_set(s, '{bagSlots}', to_jsonb(p_n));
  elsif p_what = 'lo' then   -- 3.a build (200 diamantes)
    own := case when jsonb_typeof(s->'lo'->'own') = 'array' then s->'lo'->'own' else '[1,0,0]'::jsonb end;
    if gog._nv(own->2) = 1 then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    cd := 200;
    own := jsonb_build_array(1, case when gog._nv(own->1) = 1 then 1 else 0 end, 1);
    s := jsonb_set(s, '{lo}', gog._obj(s->'lo') || jsonb_build_object('own', own));
  elsif p_what = 'ar' then   -- Auto-Raid (1000 diamantes): ar.paid conta as compras pagas; o jogo so pode gastar ar.n ate ar.paid
    ar := case when jsonb_typeof(s->'ar') = 'object' then s->'ar' else '{"n":0,"gold":0}'::jsonb end;
    if gog._n(ar, 'paid') - gog._n(ar, 'n') >= 5 then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    cd := 1000;
    s := jsonb_set(s, '{ar}', ar || jsonb_build_object('paid', gog._n(ar, 'paid') + 1));
  elsif p_what = 'wpn' then   -- arma da loja (posicao 1 a 4): preco e requisitos como no jogo
    cls := s->>'cls';
    if cls is null or cls not in ('knight', 'archer', 'mage') or p_n is null or p_n < 1 or p_n > 4 then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
    arr := case when jsonb_typeof(s->'own'->cls) = 'array' then s->'own'->cls else '[1,0,0,0,0]'::jsonb end;
    if gog._nv(arr->p_n) = 1 then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    ok_req := gog._n(s, 'pl', 'lv') >= lvr[p_n + 1]
      and case p_n when 2 then gog._nv(gog._idx(gog._idx(s->'raids', 0), 0)) > 0 when 3 then gog._nv(gog._idx(gog._idx(s->'raids', 5), 0)) > 0 when 4 then gog._nv(gog._idx(gog._idx(s->'raids', 5), 1)) > 0 else true end;
    if not ok_req then return jsonb_build_object('ok', false, 'error', 'req'); end if;
    cg := (array[0, 600, 2700, 10500, 30000])[p_n + 1];
    wid := (case cls when 'knight' then array['k_sword', 'k_axe', 'k_spear', 'k_hammer', 'k_blade'] when 'archer' then array['a_bow', 'a_triple', 'a_cross', 'a_fire', 'a_dark'] else array['m_fire', 'm_ice', 'm_bolt', 'm_arcane', 'm_dark'] end)[p_n + 1];
    arr := (select jsonb_agg(case when i = 0 or i = p_n then 1 else gog._nv(arr->i) end order by i) from generate_series(0, 4) i);
    s := jsonb_set(s, '{own}', gog._obj(s->'own') || jsonb_build_object(cls, arr));
    if jsonb_typeof(s->'wst'->wid) = 'array' then s := jsonb_set(s, array['wst', wid], jsonb_set(s->'wst'->wid, '{0}', to_jsonb(greatest(1, gog._n(s, 'wst', wid, '0'))))); end if;
    s := jsonb_set(s, '{eq}', gog._obj(s->'eq') || jsonb_build_object(cls, p_n));
  elsif p_what = 'pet' then   -- comprar um pet (cao gratis, galinha 50 000, passaro 65 000 de ouro)
    pk := p_s;
    if pk is null or pk not in ('dog', 'chicken', 'bird') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
    pets := gog._obj(s->'pets');
    if gog._nv(gog._obj(pets->'own')->pk) = 1 then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    cg := case pk when 'dog' then 0 when 'chicken' then 50000 else 65000 end;
    pets := pets || jsonb_build_object('own', gog._obj(pets->'own') || jsonb_build_object(pk, 1), 'lv', gog._obj(pets->'lv') || jsonb_build_object(pk, 1), 'xp', gog._obj(pets->'xp') || jsonb_build_object(pk, 0));
    if coalesce(pets->>'eq', '') = '' then pets := pets || jsonb_build_object('eq', pk); end if;
    s := jsonb_set(s, '{pets}', pets);
  elsif p_what = 'refine' then   -- refinar um item (equipado ou na mochila): preco, hipotese de sucesso e sorteio no servidor
    begin it := p_s::jsonb; exception when others then return jsonb_build_object('ok', false, 'error', 'bad_request'); end;
    if jsonb_typeof(it) <> 'object' or (it->>'slot') not in ('head', 'chest', 'boots', 'amulet') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
    sl := null; bi := null;
    foreach t in array array['head', 'chest', 'boots', 'amulet'] loop if s->'gear'->t = it then sl := t; exit; end if; end loop;
    if sl is null and jsonb_typeof(s->'bag') = 'array' then
      select (e.ord - 1)::int into bi from jsonb_array_elements(s->'bag') with ordinality as e(x, ord) where e.x = it order by e.ord limit 1;
    end if;
    if sl is null and bi is null then return jsonb_build_object('ok', false, 'error', 'sync'); end if;   -- o servidor ainda nao tem este item (grava e tenta outra vez)
    ee := gog._n(it, 'ench'); lvl := gog._n(s, 'pl', 'lv');
    if ee < 0 or ee >= 10 or ee >= floor(lvl / 4) then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    cg := round(45 * (1 + gog._n(it, 'il') * .25) * (1 + gog._n(it, 'r') * .5) * (ee + 1) * (1 + lvl * .05));
    ok2 := random() * 100 < (array[100, 90, 80, 70, 60, 50, 40, 30, 22, 15])[ee::int + 1];
    dn := not ok2 and ee >= 6 and random() < .3;
    resn := case when ok2 then 'ok' when dn then 'down' else 'fail' end;
    it2 := jsonb_set(it, '{ench}', to_jsonb(ee + case when ok2 then 1 when dn then -1 else 0 end));
    if sl is not null then s := jsonb_set(s, array['gear', sl], it2); else s := jsonb_set(s, array['bag', bi::text], it2); end if;
  else   -- petname: mudar o nome de um pet (50 diamantes); p_n = 0 cao, 1 galinha, 2 passaro
    if p_n is null or p_n < 0 or p_n > 2 then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
    pk := (array['dog', 'chicken', 'bird'])[p_n + 1]; nm := btrim(coalesce(p_s, ''));
    if nm !~ '^[A-Za-z0-9 _-]{1,12}$' then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
    if not gog._text_ok(nm) then return jsonb_build_object('ok', false, 'error', 'bad_word'); end if;
    pets := gog._obj(s->'pets');
    if gog._nv(gog._obj(pets->'own')->pk) <> 1 or coalesce(gog._obj(pets->'names')->>pk, '') = nm then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    cd := 50;
    pets := pets || jsonb_build_object('names', gog._obj(pets->'names') || jsonb_build_object(pk, nm));
    s := jsonb_set(s, '{pets}', pets);
  end if;
  if extract(isodow from now() at time zone 'Europe/Lisbon') = 5 then cg := round(cg * .8); cd := round(cd * .8); end if;   -- sexta: -20%
  if gold < cg or gems < cd then return jsonb_build_object('ok', false, 'error', 'funds'); end if;
  s := jsonb_set(s, '{gold}', to_jsonb(gold - cg));
  s := jsonb_set(s, '{gems}', to_jsonb(gems - cd));
  if cg > 0 then s := jsonb_set(s, '{stats}', gog._obj(s->'stats') || jsonb_build_object('spent', gog._n(s, 'stats', 'spent') + cg)); end if;
  update gog.players set save = s, save_rev = save_rev + 1 where id = pid returning save_rev into newrev;   -- save_at nao muda: os limites de crescimento dependem dele
  return jsonb_build_object('ok', true, 'rev', newrev, 'gold', gold - cg, 'gems', gems - cd, 'paid', gog._n(s, 'ar', 'paid'), 'cost', cg, 'res', resn);
end $$;

-- mudar o perfil: a bandeira so se muda por aqui (a 1.a e gratis; mudar custa 250 diamantes, cobrados no save do servidor)
create or replace function public.gog_profile_set(p_token text, p_gender text, p_country text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; cur text; cost numeric := 0; s jsonb; r jsonb; newrev int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  select country into cur from gog.players where id = coalesce(v.owner, v.id);
  if cur is not null and p_country is distinct from cur then cost := 250; end if;
  if cost > 0 and (v.save is null or gog._n(v.save, 'gems') < cost) then return jsonb_build_object('ok', false, 'error', 'funds'); end if;
  r := public.gog_set_profile(p_token, p_gender, p_country);
  if not coalesce((r->>'ok')::boolean, false) or cost = 0 then return r; end if;
  s := jsonb_set(v.save, '{gems}', to_jsonb(gog._n(v.save, 'gems') - cost));
  update gog.players set save = s, save_rev = save_rev + 1 where id = pid returning save_rev into newrev;
  return r || jsonb_build_object('rev', newrev, 'gems', gog._n(s, 'gems'));
end $$;

-- cria a guilda e cobra o custo (15 000 ouro + 100 diamantes) no save do servidor
create or replace function public.gog_guild_found(p_token text, p_name text, p_tag text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; r jsonb; s jsonb; newrev int;
begin
  r := public.gog_guild_create(p_token, p_name, p_tag);
  if not coalesce((r->>'ok')::boolean, false) then return r; end if;
  pid := gog._auth(p_token);
  select save into s from gog.players where id = pid for update;
  s := jsonb_set(s, '{gold}', to_jsonb(gog._n(s, 'gold') - 15000));
  s := jsonb_set(s, '{gems}', to_jsonb(gog._n(s, 'gems') - 100));
  s := jsonb_set(s, '{stats}', (case when jsonb_typeof(s->'stats') = 'object' then s->'stats' else '{}'::jsonb end) || jsonb_build_object('spent', gog._n(s, 'stats', 'spent') + 15000));
  update gog.players set save = s, save_rev = save_rev + 1 where id = pid returning save_rev into newrev;
  return r || jsonb_build_object('rev', newrev, 'gold', gog._n(s, 'gold'), 'gems', gog._n(s, 'gems'));
end $$;

do $$
declare f text;
begin
  foreach f in array array['public.gog_buy(text,text,int,text)', 'public.gog_profile_set(text,text,text)', 'public.gog_guild_found(text,text,text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;

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

-- ===== tempo de jogo (save.pt) controlado pelo servidor (igual a update-play-time.sql) =====
-- Tempo de jogo (save.pt, em segundos) controlado pelo servidor.
-- O jogo conta o tempo e envia-o no save, mas o servidor nunca deixa o valor subir mais do que o tempo real
-- que passou desde o ultimo save (+60 s de folga). Se alguem alterar o valor, fica cortado, sem ban.
-- Funciona com qualquer versao do gog_save_put (e um trigger na tabela). Corre no SQL Editor do Supabase.
create or replace function gog._save_pt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o numeric; n numeric; lim numeric;
begin
  if new.save is null or jsonb_typeof(new.save) <> 'object' then return new; end if;
  o := case when old.save is not null and jsonb_typeof(old.save->'pt') = 'number' then greatest((old.save->>'pt')::numeric, 0) else 0 end;
  n := case when jsonb_typeof(new.save->'pt') = 'number' then greatest((new.save->>'pt')::numeric, 0) else o end;
  lim := o + greatest(extract(epoch from now() - coalesce(old.save_at, now())), 0) + 60;
  if n > lim then n := lim; end if;
  new.save := jsonb_set(new.save, '{pt}', to_jsonb(round(n)));
  return new;
end $$;
revoke all on function gog._save_pt() from public, anon, authenticated;
drop trigger if exists save_pt on gog.players;
create trigger save_pt before update of save on gog.players for each row execute function gog._save_pt();
