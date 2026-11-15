-- DESLIGAR O ANTI-CHEAT (correr uma vez no SQL Editor do Supabase)
-- 1) ver o que disparou o ban (opcional, corre antes):
--      select at, kind, detail from gog.violations order by at desc limit 10;
-- 2) reativa as contas banidas pelo anti-cheat e limpa o registo
update gog.players set active = true, inactive_at = null
 where coalesce(owner, id) in (select root from gog.violations);
delete from gog.violations;
-- 3) a verificacao passa a nao recusar nem banir nada (a original fica guardada como _check_save_real)
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'gog' and p.proname = '_check_save')
     and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'gog' and p.proname = '_check_save_real') then
    alter function gog._check_save(jsonb, jsonb, double precision, bigint) rename to _check_save_real;
  end if;
end $$;
create or replace function gog._check_save(o jsonb, nw jsonb, dt double precision, p_root bigint) returns text
language sql stable security definer set search_path = '' as $$ select null::text $$;
