-- Diamantes ganhos a jogar deixam de fazer o servidor recusar o save: o limite por gravacao passa a contar as raids ganhas,
-- os baus da Torre e as missoes diarias que o proprio save prova (antes era so ~90, e uma subida longa na Torre ou um save atrasado passava disso).
-- Corre no SQL Editor do Supabase. Pode correr-se mais do que uma vez.
-- diamantes dos baus da Torre (a cada 5 andares: 3 + andar/5) nos andares subidos entre dois saves; num dia novo a Torre recomeca no andar 1
create or replace function gog._tw_gems(o jsonb, nw jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare lo int; hi int; r numeric := 0; f int;
begin
  if jsonb_typeof(nw->'tw') <> 'object' then return 0; end if;
  hi := least(greatest(coalesce(gog._n(nw, 'tw', 'f'), 1), 1), 2000)::int;
  lo := case when jsonb_typeof(o->'tw') = 'object' and coalesce(o->'tw'->>'d', '') = coalesce(nw->'tw'->>'d', '') then least(greatest(coalesce(gog._n(o, 'tw', 'f'), 1), 1), 2000)::int else 1 end;
  for f in lo..hi - 1 loop if f % 5 = 0 then r := r + 3 + floor(f / 5); end if; end loop;
  return r;
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

do $$
begin
  revoke all on function gog._tw_gems(jsonb, jsonb) from public;
  if exists (select 1 from pg_roles where rolname = 'anon') then revoke all on function gog._tw_gems(jsonb, jsonb) from anon; end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then revoke all on function gog._tw_gems(jsonb, jsonb) from authenticated; end if;
end $$;
