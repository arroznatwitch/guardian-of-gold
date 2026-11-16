-- COMPRAS NO SERVIDOR (parte 2, so DEPOIS de todos terem o jogo atualizado e de teres corrido update-server-shop.sql):
-- 1) gog_save_put recusa ('outdated') saves em que a mochila sobe, a 3.a build passa a comprada ou ar.n passa de ar.paid: so gog_buy o pode fazer.
-- 2) a criacao de guilda antiga (sem cobranca no servidor) deixa de funcionar: so gog_guild_found.
do $$
declare def text; a text := E'  if p_rev <> v.save_rev then'; chk text := E'  if v.save is not null and (gog._n(p_save, ''bagSlots'') > gog._n(v.save, ''bagSlots'') or gog._nv(gog._idx(p_save->''lo''->''own'', 2)) > gog._nv(gog._idx(v.save->''lo''->''own'', 2)) or gog._n(p_save, ''ar'', ''n'') > gog._n(p_save, ''ar'', ''paid'')) then return jsonb_build_object(''ok'', false, ''error'', ''outdated''); end if;   -- compras so pelo servidor (gog_buy)\n';
begin
  def := pg_get_functiondef('public.gog_save_put(text,jsonb,integer,text)'::regprocedure);
  if position('''bagSlots''' in def) = 0 and position(a in def) > 0 then execute replace(def, a, chk || a); end if;
end $$;

-- a criacao de guilda sem cobranca no servidor deixa de funcionar: a original passa a interna (gog._guild_create) e so gog_guild_found a usa
do $$
begin
  if to_regprocedure('gog._guild_create(text,text,text)') is null then
    alter function public.gog_guild_create(text, text, text) set schema gog;
    alter function gog.gog_guild_create(text, text, text) rename to _guild_create;
    execute replace(pg_get_functiondef('public.gog_guild_found(text,text,text)'::regprocedure), 'public.gog_guild_create(', 'gog._guild_create(');
    revoke all on function gog._guild_create(text, text, text) from public;
    if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function gog._guild_create(text, text, text) from anon; end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function gog._guild_create(text, text, text) from authenticated; end if;
  end if;
end $$;
create or replace function public.gog_guild_create(p_token text, p_name text, p_tag text) returns jsonb
language sql security definer set search_path = '' as $$ select jsonb_build_object('ok', false, 'error', 'outdated') $$;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then grant execute on function public.gog_guild_create(text, text, text) to anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then grant execute on function public.gog_guild_create(text, text, text) to authenticated; end if;
end $$;
