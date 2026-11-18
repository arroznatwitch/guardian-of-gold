-- ISENTAR DO ANTI-BATOTA AS CONTAS QUE JA EXISTEM (correr uma vez no SQL Editor do Supabase)
-- As contas que existem agora deixam de ser verificadas (o save e sempre aceite, sem ocorrencias nem bans).
-- As contas criadas depois disto continuam a ser verificadas normalmente.
-- Funciona quer o anti-batota esteja ligado quer desligado (anticheat-off.sql): no fim fica LIGADO para as contas novas.
create table if not exists gog.ac_exempt (root bigint primary key references gog.players(id) on delete cascade, at timestamptz not null default now());
alter table gog.ac_exempt enable row level security;
revoke all on gog.ac_exempt from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on gog.ac_exempt from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on gog.ac_exempt from authenticated; end if;
end $$;
-- todas as contas atuais (a conta principal; os personagens extra usam a mesma)
insert into gog.ac_exempt (root) select distinct coalesce(owner, id) from gog.players on conflict do nothing;
-- a verificacao original fica guardada como _check_save_real; _check_save passa a saltar as contas isentas
do $$ begin
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'gog' and p.proname = '_check_save_real') then
    alter function gog._check_save(jsonb, jsonb, double precision, bigint) rename to _check_save_real;
  end if;
end $$;
create or replace function gog._check_save(o jsonb, nw jsonb, dt double precision, p_root bigint) returns text
language sql stable security definer set search_path = '' as $$
  select case when exists (select 1 from gog.ac_exempt e where e.root = p_root) then null::text else gog._check_save_real(o, nw, dt, p_root) end
$$;
revoke all on function gog._check_save(jsonb, jsonb, double precision, bigint) from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function gog._check_save(jsonb, jsonb, double precision, bigint) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function gog._check_save(jsonb, jsonb, double precision, bigint) from authenticated; end if;
end $$;
-- (opcional) reativar tambem as contas que o anti-batota ja tinha desativado e limpar o registo:
-- update gog.players set active = true, inactive_at = null where coalesce(owner, id) in (select root from gog.violations);
-- delete from gog.violations;
-- Para tirar uma conta da lista: delete from gog.ac_exempt where root = (select id from gog.players where nick_key = lower('NICK'));
-- Ver quantas estao isentas: select count(*) from gog.ac_exempt;
