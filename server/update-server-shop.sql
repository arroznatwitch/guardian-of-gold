-- COMPRAS NO SERVIDOR (parte 1, sem risco): corre no SQL Editor do Supabase. Idempotente.
-- gog_buy (inclui refinar itens, com sorteio no servidor): mochilas, 3.a build, Auto-Raid, armas da loja, pets (comprar e mudar o nome) pagos no servidor; gog_profile_set cobra a mudanca de bandeira (confere o preco e desconta no save dele). gog_guild_found: cria a guilda e cobra no servidor.
-- Os jogos antigos continuam a funcionar (compram localmente). Para o servidor RECUSAR compras locais, corre depois enforce-server-shop.sql (uma semana depois de todos atualizarem).
-- Corre update-security.sql antes (precisa de gog._rate e de gog._ar_gold).

-- ====================================================== compras no servidor (gog_buy) e guilda paga no servidor
-- O servidor confere o preco e desconta ouro/diamantes no SEU save (nao confia no cliente). O jogo aplica o mesmo localmente e adota a revisao.
drop function if exists public.gog_buy(text, text, int);   -- assinatura antiga (sem o 4.o parametro)
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
    if gold < cg then return jsonb_build_object('ok', false, 'error', 'funds'); end if;
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
