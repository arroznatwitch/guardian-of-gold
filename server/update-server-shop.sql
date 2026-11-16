-- COMPRAS NO SERVIDOR (parte 1, sem risco): corre no SQL Editor do Supabase. Idempotente.
-- gog_buy: mochilas, 3.a build e Auto-Raid pagas no servidor (confere o preco e desconta no save dele). gog_guild_found: cria a guilda e cobra no servidor.
-- Os jogos antigos continuam a funcionar (compram localmente). Para o servidor RECUSAR compras locais, corre depois enforce-server-shop.sql (uma semana depois de todos atualizarem).
-- Corre update-security.sql antes (precisa de gog._rate e de gog._ar_gold).

-- ====================================================== compras no servidor (gog_buy) e guilda paga no servidor
-- O servidor confere o preco e desconta ouro/diamantes no SEU save (nao confia no cliente). O jogo aplica o mesmo localmente e adota a revisao.
create or replace function public.gog_buy(p_token text, p_what text, p_n int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; s jsonb; gold numeric; gems numeric; cg numeric := 0; cd numeric := 0; slots int; own jsonb; ar jsonb; newrev int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_what is null or p_what not in ('bag', 'lo', 'ar') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if not gog._rate('buy:' || pid, 30, 60) then return jsonb_build_object('ok', false, 'error', 'busy'); end if;
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
    s := jsonb_set(s, '{lo}', (case when jsonb_typeof(s->'lo') = 'object' then s->'lo' else '{}'::jsonb end) || jsonb_build_object('own', own));
  else   -- Auto-Raid (1000 diamantes): ar.paid conta as compras pagas; o jogo so pode gastar ar.n ate ar.paid
    ar := case when jsonb_typeof(s->'ar') = 'object' then s->'ar' else '{"n":0,"gold":0}'::jsonb end;
    if gog._n(ar, 'paid') - gog._n(ar, 'n') >= 5 then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    cd := 1000;
    s := jsonb_set(s, '{ar}', ar || jsonb_build_object('paid', gog._n(ar, 'paid') + 1));
  end if;
  if gold < cg or gems < cd then return jsonb_build_object('ok', false, 'error', 'funds'); end if;
  s := jsonb_set(s, '{gold}', to_jsonb(gold - cg));
  s := jsonb_set(s, '{gems}', to_jsonb(gems - cd));
  if cg > 0 then s := jsonb_set(s, '{stats}', (case when jsonb_typeof(s->'stats') = 'object' then s->'stats' else '{}'::jsonb end) || jsonb_build_object('spent', gog._n(s, 'stats', 'spent') + cg)); end if;
  update gog.players set save = s, save_rev = save_rev + 1 where id = pid returning save_rev into newrev;   -- save_at nao muda: os limites de crescimento dependem dele
  return jsonb_build_object('ok', true, 'rev', newrev, 'gold', gold - cg, 'gems', gems - cd, 'paid', gog._n(s, 'ar', 'paid'));
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
  foreach f in array array['public.gog_buy(text,text,int)', 'public.gog_guild_found(text,text,text)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
  end loop;
end $$;

-- compras de Auto-Raid antigas contam como pagas (para a regra ar.n <= ar.paid do enforce-server-shop.sql)
update gog.players set save = jsonb_set(save, '{ar}', (save->'ar') || jsonb_build_object('paid', coalesce((save->'ar'->>'n')::numeric, 0)))
 where jsonb_typeof(save->'ar') = 'object' and not (save->'ar' ? 'paid') and (save->'ar'->>'n') ~ '^[0-9]+$';

do $m$
declare nd text; def text; oid regprocedure;
begin
  foreach oid in array array[to_regprocedure('gog._check_save(jsonb,jsonb,double precision,bigint)'), to_regprocedure('gog._check_save_real(jsonb,jsonb,double precision,bigint)')] loop
    if oid is not null then
      def := pg_get_functiondef(oid);
      if position($q$'ar', 'paid'$q$ in def) = 0 then
        nd := replace(def, $q$if gog._n(nw, 'ar', 'n') > gog._n(o, 'ar', 'n') and g1 > g0 + allow + refund - 1000 * least(5, gog._n(nw, 'ar', 'n') - gog._n(o, 'ar', 'n')) then return 'ar'; end if;$q$, $q$if gog._n(nw, 'ar', 'paid') > gog._n(o, 'ar', 'paid') then return 'ar'; end if;   -- as compras pagas so o servidor as regista (gog_buy)
    if gog._n(nw, 'ar', 'n') > gog._n(o, 'ar', 'n') and g1 > g0 + allow + refund - 1000 * least(5, greatest(0, gog._n(nw, 'ar', 'n') - gog._n(o, 'ar', 'n') - greatest(0, gog._n(o, 'ar', 'paid') - gog._n(o, 'ar', 'n')))) then return 'ar'; end if;   -- usos ja pagos no servidor nao voltam a descer os diamantes$q$);
        if nd <> def then execute nd; end if;
      end if;
    end if;
  end loop;
end $m$;
