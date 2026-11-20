-- Encantar especial passa pelo servidor: cobra o ouro e os diamantes e sorteia o efeito (gog_buy com p_what = 'spec').
-- Corre isto uma vez no Supabase (SQL Editor). Pode correr-se mais do que uma vez sem problema.
create or replace function public.gog_buy(p_token text, p_what text, p_n int default 0, p_s text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; s jsonb; gold numeric; gems numeric; cg numeric := 0; cd numeric := 0; slots int; own jsonb; ar jsonb; newrev int;
  cls text; wid text; arr jsonb; pets jsonb; pk text; nm text; lvr int[] := array[1, 6, 12, 30, 50]; ok_req boolean;
  it jsonb; it2 jsonb; sl text; bi int; ee numeric; lvl numeric; ok2 boolean; dn boolean; resn text; t text;
  sk text; sb numeric; sp numeric; sf numeric; scap numeric; sv numeric; ir int; iil numeric; irr numeric;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_what is null or p_what not in ('bag', 'lo', 'ar', 'wpn', 'pet', 'petname', 'refine', 'spec') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
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
  elsif p_what in ('refine', 'spec') then   -- refinar ou encantar especial um item (equipado ou na mochila): preco e sorteio no servidor
    begin it := p_s::jsonb; exception when others then return jsonb_build_object('ok', false, 'error', 'bad_request'); end;
    if jsonb_typeof(it) <> 'object' or (it->>'slot') not in ('head', 'chest', 'boots', 'amulet') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
    sl := null; bi := null;
    foreach t in array array['head', 'chest', 'boots', 'amulet'] loop if s->'gear'->t = it then sl := t; exit; end if; end loop;
    if sl is null and jsonb_typeof(s->'bag') = 'array' then
      select (e.ord - 1)::int into bi from jsonb_array_elements(s->'bag') with ordinality as e(x, ord) where e.x = it order by e.ord limit 1;
    end if;
    if sl is null and bi is null then return jsonb_build_object('ok', false, 'error', 'sync'); end if;   -- o servidor ainda nao tem este item (grava e tenta outra vez)
    ee := gog._n(it, 'ench'); lvl := gog._n(s, 'pl', 'lv');
    if p_what = 'spec' then   -- encantar especial: ouro + diamantes; sorteia um efeito diferente do atual (como rollSpec em js/90-equipment.js)
      ir := gog._n(it, 'r')::int; iil := gog._n(it, 'il'); irr := gog._n(it, 'rr');
      if ir < 0 or ir > 4 or iil < 1 or iil > 120 then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
      cg := round(150 * (1 + iil * .2) * (1 + ir * .4) * (1 + irr * .15) * (1 + lvl * .05));
      cd := 4 * (1 + ir + floor(irr / 2));
      select k into sk from unnest(array['burn', 'slow', 'ls', 'crit', 'gf', 'xpb', 'dr', 'dmg', 'poi', 'elec', 'cdmg', 'skc']) k where k is distinct from (it->'spec'->>'k') order by random() limit 1;
      sb := case sk when 'dmg' then 2.5 when 'crit' then 1.5 when 'ls' then .8 when 'dr' then 1 when 'gf' then 3 when 'xpb' then 3 when 'skc' then 3 else 6 end;
      sp := case sk when 'dmg' then .25 when 'crit' then .1 when 'ls' then .05 when 'dr' then .08 when 'gf' then .3 when 'xpb' then .3 when 'skc' then .2 else .5 end;
      sf := case sk when 'dmg' then .85 when 'xpb' then .5 when 'ls' then .35 else 1 end;
      scap := case when sk in ('burn', 'slow', 'poi', 'elec') then 35 when sk in ('xpb', 'skc') then 20 else 45 end;
      sv := round(((sb + sp * iil) * (.75 + .5 * random()::numeric) * (1 + .1 * (ir + 1)) * sf * (case when ir + 1 = 4 then .85 else 1 end))::numeric, 1);
      sv := least(scap, round(sv * 1.5, 1));
      it2 := it || jsonb_build_object('rr', irr + 1, 'spec', jsonb_build_object('k', sk, 'nm', case sk when 'burn' then 'Ígneo' when 'slow' then 'Gélido' when 'ls' then 'Vampírico' when 'crit' then 'Letal' when 'gf' then 'Próspero' when 'xpb' then 'Sábio' when 'dr' then 'Protetor' when 'dmg' then 'Poderoso' when 'poi' then 'Venenoso' when 'elec' then 'Elétrico' when 'cdmg' then 'Brutal' else 'Veloz' end, 'v', sv));
      resn := 'ok';
    else
    if ee < 0 or ee >= 10 or ee >= floor(lvl / 4) then return jsonb_build_object('ok', false, 'error', 'state'); end if;
    cg := round(45 * (1 + gog._n(it, 'il') * .25) * (1 + gog._n(it, 'r') * .5) * (ee + 1) * (1 + lvl * .05));
    ok2 := random() * 100 < (array[100, 90, 80, 70, 60, 50, 40, 30, 22, 15])[ee::int + 1];
    dn := not ok2 and ee >= 6 and random() < .3;
    resn := case when ok2 then 'ok' when dn then 'down' else 'fail' end;
    it2 := jsonb_set(it, '{ench}', to_jsonb(ee + case when ok2 then 1 when dn then -1 else 0 end));
    end if;
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
  return jsonb_build_object('ok', true, 'rev', newrev, 'gold', gold - cg, 'gems', gems - cd, 'paid', gog._n(s, 'ar', 'paid'), 'cost', cg, 'costd', cd, 'res', resn, 'item', case when p_what = 'spec' then it2 end);
end $$;
