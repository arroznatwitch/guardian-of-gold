-- CORRIGE O CODIGO "backpack" (correr no SQL Editor do Supabase)
-- 1) as mochilas nunca descem no servidor: um save antigo (outro separador/dispositivo ou "usar este save" no conflito) ja nao as tira
create or replace function gog._save_bags() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o int; n int;
begin
  if new.save is null or jsonb_typeof(new.save) <> 'object' or old.save is null or jsonb_typeof(old.save) <> 'object' then return new; end if;
  o := least(5, greatest(1, coalesce(gog._n(old.save, 'bagSlots'), 1)))::int;
  n := least(5, greatest(1, coalesce(gog._n(new.save, 'bagSlots'), 1)))::int;
  if n < o then new.save := jsonb_set(new.save, '{bagSlots}', to_jsonb(o)); end if;
  return new;
end $$;
revoke all on function gog._save_bags() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function gog._save_bags() from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function gog._save_bags() from authenticated; end if;
end $$;
drop trigger if exists save_bags on gog.players;
create trigger save_bags before update of save on gog.players for each row execute function gog._save_bags();
-- 2) repoe as 5 mochilas a todos os personagens das contas que ja usaram o codigo (e sobe a revisao para o jogo carregar o save do servidor)
update gog.players p set save = jsonb_set(p.save, '{bagSlots}', to_jsonb(5)), save_rev = p.save_rev + 1
 where p.save is not null and jsonb_typeof(p.save) = 'object' and coalesce(gog._n(p.save, 'bagSlots'), 1) < 5
   and coalesce(p.owner, p.id) in (select root from gog.promo_used where code = 'backpack');
-- ver quem ja usou o codigo e quantas mochilas tem:
-- select p.nick, p.save->>'bagSlots' bags from gog.players p where coalesce(p.owner, p.id) in (select root from gog.promo_used where code = 'backpack');
