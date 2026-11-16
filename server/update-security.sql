-- SEGURANCA (auditoria): corre no SQL Editor do Supabase. Idempotente: podes correr mais vezes.
-- 1) gog_submit: o ranking so aceita contas com save verificado no servidor (antes qualquer conta nova forjava nivel/ouro/ondas).
-- 2) Anti-batota: as folgas fixas por save passam a depender do tempo desde o save anterior (gravar a cada poucos segundos ja nao multiplica o limite),
--    o intervalo minimo entre saves passa de 3 para 10 s, e crescem os controlos de armas, pedras e copias.
-- 3) Auto-Raid: o ouro extra so conta se o save mostrar os 1000 diamantes gastos por uso, com teto por uso (o campo ar.gold ja nao abre o limite).
-- 4) Login: 20 tentativas por minuto por rede e as falhas expiram em 1 h (ninguem fica bloqueado para sempre); gog_nick_free tem limite de pedidos.
-- Nota: se o anti-batota estiver desligado (anticheat-off.sql), o patch fica na copia _check_save_real e aplica-se quando o ligares.

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

create or replace function public.gog_nick_free(p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare iph text := gog._ip();
begin
  if iph is not null and not gog._rate('nick:' || iph, 30, 60) then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
  return jsonb_build_object('ok', true, 'free', not exists (select 1 from gog.players where nick_key = lower(coalesce(p_nick, ''))));
end $$;
do $$ begin
  execute 'revoke all on function public.gog_nick_free(text) from public';
  if exists (select 1 from pg_roles where rolname = 'anon') then execute 'grant execute on function public.gog_nick_free(text) to anon'; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute 'grant execute on function public.gog_nick_free(text) to authenticated'; end if;
end $$;

do $m$
declare def text; nd text; oid regprocedure;
begin
  oid := to_regprocedure('gog._check_save(jsonb,jsonb,double precision,bigint)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$sl double precision$q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$declare k text; val jsonb;$q$, $q$declare sl double precision := least(1, dt / 60); k text; val jsonb;$q$);
      nd := replace(nd, $q$if lv1 > lv0 + 8 + dt / 10 then$q$, $q$if lv1 > lv0 + greatest(5, 8 * sl) + dt / 10 then$q$);
      nd := replace(nd, $q$'kills') + 100 + dt * 12$q$, $q$'kills') + greatest(100, 100 * sl) + dt * 12$q$);
      nd := replace(nd, $q$'bosses') + 10 + dt / 8$q$, $q$'bosses') + greatest(5, 10 * sl) + dt / 8$q$);
      nd := replace(nd, $q$'guard') + 2 + dt / 60$q$, $q$'guard') + greatest(2, 2 * sl) + dt / 60$q$);
      nd := replace(nd, $q$'fuses') + 5 + dt / 20$q$, $q$'fuses') + greatest(5, 5 * sl) + dt / 20$q$);
      nd := replace(nd, $q$+ 160000 + dt * 2000$q$, $q$+ greatest(80000, 160000 * sl) + dt * 2000$q$);
      nd := replace(nd, $q$greatest(0, gog._n(nw, 'ar', 'gold') - gog._n(o, 'ar', 'gold'))$q$, $q$gog._ar_gold(o, nw)$q$);
      nd := replace(nd, $q$+ 6 + dt / 8 then return 'waves'$q$, $q$+ greatest(3, 6 * sl) + dt / 8 then return 'waves'$q$);
      nd := replace(nd, $q$if r1 > r0 + 3 + dt / 45 then return 'raids'; end if;$q$, $q$if r1 > r0 + greatest(2, 3 * sl) + dt / 45 then return 'raids'; end if;
    -- crescimento de armas, pedras e copias (antes so se verificava o valor maximo de cada uma)
    if gog._tot(nw->'wl') > gog._tot(o->'wl') + greatest(6, 12 * sl) + dt / 10 then return 'growth:wl'; end if;
    if gog._tot(nw->'stones') > gog._tot(o->'stones') + greatest(60, 200 * sl) + dt / 2 then return 'growth:stones'; end if;
    if gog._tot(nw->'wst') > gog._tot(o->'wst') + greatest(150, 200 * sl) + dt / 2 then return 'growth:copies'; end if;$q$);
      nd := replace(nd, $q$+ 10 + 80 + gog._rw_gems(o, nw);$q$, $q$+ greatest(40, 90 * sl) + gog._rw_gems(o, nw);$q$);
      nd := replace(nd, $q$if g1 > g0 + allow + refund then return 'gems'; end if;$q$, $q$if g1 > g0 + allow + refund then return 'gems'; end if;
    -- cada uso do Auto-Raid custa 1000 diamantes: o save tem de os mostrar gastos (senao o ouro do Auto-Raid nao conta)
    if gog._n(nw, 'ar', 'n') > gog._n(o, 'ar', 'n') and g1 > g0 + allow + refund - 1000 * least(5, gog._n(nw, 'ar', 'n') - gog._n(o, 'ar', 'n')) then return 'ar'; end if;$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
  oid := to_regprocedure('gog._check_save_real(jsonb,jsonb,double precision,bigint)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$sl double precision$q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$declare k text; val jsonb;$q$, $q$declare sl double precision := least(1, dt / 60); k text; val jsonb;$q$);
      nd := replace(nd, $q$if lv1 > lv0 + 8 + dt / 10 then$q$, $q$if lv1 > lv0 + greatest(5, 8 * sl) + dt / 10 then$q$);
      nd := replace(nd, $q$'kills') + 100 + dt * 12$q$, $q$'kills') + greatest(100, 100 * sl) + dt * 12$q$);
      nd := replace(nd, $q$'bosses') + 10 + dt / 8$q$, $q$'bosses') + greatest(5, 10 * sl) + dt / 8$q$);
      nd := replace(nd, $q$'guard') + 2 + dt / 60$q$, $q$'guard') + greatest(2, 2 * sl) + dt / 60$q$);
      nd := replace(nd, $q$'fuses') + 5 + dt / 20$q$, $q$'fuses') + greatest(5, 5 * sl) + dt / 20$q$);
      nd := replace(nd, $q$+ 160000 + dt * 2000$q$, $q$+ greatest(80000, 160000 * sl) + dt * 2000$q$);
      nd := replace(nd, $q$greatest(0, gog._n(nw, 'ar', 'gold') - gog._n(o, 'ar', 'gold'))$q$, $q$gog._ar_gold(o, nw)$q$);
      nd := replace(nd, $q$+ 6 + dt / 8 then return 'waves'$q$, $q$+ greatest(3, 6 * sl) + dt / 8 then return 'waves'$q$);
      nd := replace(nd, $q$if r1 > r0 + 3 + dt / 45 then return 'raids'; end if;$q$, $q$if r1 > r0 + greatest(2, 3 * sl) + dt / 45 then return 'raids'; end if;
    -- crescimento de armas, pedras e copias (antes so se verificava o valor maximo de cada uma)
    if gog._tot(nw->'wl') > gog._tot(o->'wl') + greatest(6, 12 * sl) + dt / 10 then return 'growth:wl'; end if;
    if gog._tot(nw->'stones') > gog._tot(o->'stones') + greatest(60, 200 * sl) + dt / 2 then return 'growth:stones'; end if;
    if gog._tot(nw->'wst') > gog._tot(o->'wst') + greatest(150, 200 * sl) + dt / 2 then return 'growth:copies'; end if;$q$);
      nd := replace(nd, $q$+ 10 + 80 + gog._rw_gems(o, nw);$q$, $q$+ greatest(40, 90 * sl) + gog._rw_gems(o, nw);$q$);
      nd := replace(nd, $q$if g1 > g0 + allow + refund then return 'gems'; end if;$q$, $q$if g1 > g0 + allow + refund then return 'gems'; end if;
    -- cada uso do Auto-Raid custa 1000 diamantes: o save tem de os mostrar gastos (senao o ouro do Auto-Raid nao conta)
    if gog._n(nw, 'ar', 'n') > gog._n(o, 'ar', 'n') and g1 > g0 + allow + refund - 1000 * least(5, gog._n(nw, 'ar', 'n') - gog._n(o, 'ar', 'n')) then return 'ar'; end if;$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
end $m$;

do $m$
declare def text; nd text; oid regprocedure;
begin
  oid := to_regprocedure('public.gog_save_put(text,jsonb,int,text)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$interval '10 seconds'$q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$v.save_at > now() - interval '3 seconds'$q$, $q$v.save_at > now() - interval '10 seconds'$q$);
      nd := replace(nd, $q$interval '3 seconds')), 3), 7 * 86400)$q$, $q$interval '10 seconds')), 10), 7 * 86400)$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
end $m$;

do $m$
declare def text; nd text; oid regprocedure;
begin
  oid := to_regprocedure('public.gog_submit(text,jsonb)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$'no_save'$q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$  first_time := v.submitted_at is null;$q$, $q$  if v.save is null then return jsonb_build_object('ok', false, 'error', 'no_save'); end if;   -- o ranking so aceita contas com save verificado no servidor
  first_time := v.submitted_at is null;$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
end $m$;

do $m$
declare def text; nd text; oid regprocedure;
begin
  oid := to_regprocedure('public.gog_login(text,text)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$gog._rate($q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$declare v gog.players; a gog.players; ok boolean; wait int;$q$, $q$declare v gog.players; a gog.players; ok boolean; wait int; iph text;$q$);
      nd := replace(nd, $q$  select * into v from gog.players where nick_key = lower(p_nick) for update;$q$, $q$  iph := gog._ip();   -- no maximo 20 tentativas por minuto por rede (cada uma custa um bcrypt)
  if iph is not null and not gog._rate('login:' || iph, 20, 60) then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
  select * into v from gog.players where nick_key = lower(p_nick) for update;$q$);
      nd := replace(nd, $q$  wait := case when a.failed + 1 >= 5$q$, $q$  if a.fail_at is null or a.fail_at < now() - interval '1 hour' then a.failed := 0; end if;   -- as falhas expiram: ninguem fica bloqueado para sempre por tentativas alheias
  wait := case when a.failed + 1 >= 5$q$);
      nd := replace(nd, $q$update gog.players set failed = a.failed + 1, locked_until$q$, $q$update gog.players set failed = a.failed + 1, fail_at = now(), locked_until$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
end $m$;
