-- Pontos de atributo: o reset unico das recompensas por nivel (rwv 3, 16/11) deixou resgatar as recompensas desde o nivel 1 sem tirar
-- os pontos ja ganhos, por isso jogadores legitimos ficaram com ate 5 pontos por nivel e o servidor (4 por nivel) desativava a conta
-- logo a primeira ('abs:attrs', ex.: Nunorr). Agora o limite e 5 por nivel, e so o absurdo (mais do dobro) bane logo; passar um pouco
-- conta como violacao normal. As violacoes 'abs:attrs' de contas cujos personagens cabem no limite novo deixam de contar.
-- pontos de atributo: limite e total. 3 por nivel + as recompensas por nivel (ate 1 por nivel), que o reset unico das recompensas (rwv 3, 16/11)
-- deixou resgatar duas vezes, por isso ate 5 por nivel; mais os comprados (max. 1200) e folga
create or replace function gog._attr_lim(s jsonb) returns numeric
language sql immutable set search_path = '' as $$ select 5 * coalesce(gog._n(s, 'pl', 'lv'), 1) + least(coalesce(gog._n(s, 'buyN'), 0), 1200) + 40 $$;
create or replace function gog._attr_tot(s jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce((select sum(case when e.value ~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then e.value::numeric else 1e12 end)
                   from jsonb_each_text(case when jsonb_typeof(s->'attr') = 'object' then s->'attr' else '{}'::jsonb end) e), 0) + coalesce(gog._n(s, 'pts'), 0)
$$;
revoke all on function gog._attr_lim(jsonb) from public; revoke all on function gog._attr_tot(jsonb) from public;


create or replace function gog._sane(s jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare b jsonb; it jsonb; lim numeric; tot numeric;
begin
  lim := gog._attr_lim(s);
  if gog._n(s, 'pts') < 0 or gog._n(s, 'buyN') < 0 or gog._n(s, 'pts') > 100000 then return 'abs:neg'; end if;
  if jsonb_typeof(s->'lo'->'b') = 'array' then   -- builds guardadas (loadouts)
    for b in select x from jsonb_array_elements(s->'lo'->'b') x loop
      if jsonb_typeof(b->'attr') = 'object' then
        select coalesce(sum(case when e.value ~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then e.value::numeric else 1e12 end), 0) into tot from jsonb_each_text(b->'attr') e;
        if tot > 2 * lim then return 'abs:attrs'; elsif tot > lim then return 'attrs'; end if;   -- so o absurdo bane logo
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
  -- atributos: os pontos distribuidos + por gastar nunca passam do limite (gog._attr_lim). So o absurdo (mais do dobro, ou compras acima de 1200) bane logo;
  -- passar um pouco conta como violacao normal (3 = conta desativada), para um erro de contas nunca banir um jogador legitimo de uma vez
  if coalesce(gog._n(nw, 'buyN'), 0) > 1200 or gog._attr_tot(nw) > 2 * gog._attr_lim(nw) then return 'abs:attrs'; end if;
  if gog._attr_tot(nw) > gog._attr_lim(nw) then return 'attrs'; end if;
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
    allow := 10 * greatest(0, floor(lv1 / 10) - floor(lv0 / 10)) + 5 * greatest(0, gog._n(nw, 'chestDone') - gog._n(o, 'chestDone')) + 75 * n_claim + greatest(40, 90 * sl) + gog._rw_gems(o, nw)
      + 5 * greatest(0, r1 - r0) + gog._tw_gems(o, nw) + 8 * greatest(0, gog._n(nw, 'daily', 'n') - gog._n(o, 'daily', 'n'));   -- o que o save prova: raids ganhas (ate 5 cada), baus da Torre e missoes diarias (3 + bonus 5)
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
  -- sem limites de crescimento: os valores acima ja vem do save verificado pelo servidor (gog_save_put); os limites so davam falsos 'implausible' (ex.: x2 de fim de semana)
  nb := gog._clean_build(p->'build');
  nb := gog._truth_build(nb, v.save);
  if nb is not null and jsonb_typeof(nb->'attr') = 'object' and coalesce((nb->'attr'->>'vit')::numeric, 0) + coalesce((nb->'attr'->>'str')::numeric, 0) + coalesce((nb->'attr'->>'agi')::numeric, 0) + coalesce((nb->'attr'->>'per')::numeric, 0) > 5 * n_level + 1240 then nb := nb - 'attr'; end if;   -- atributos impossiveis para o nivel: nao entram no perfil publico
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

update gog.violations vv set counted = false
 where vv.kind = 'abs:attrs' and vv.counted
   and not exists (select 1 from gog.players p where coalesce(p.owner, p.id) = vv.root and p.save is not null and gog._attr_tot(p.save) > gog._attr_lim(p.save));
