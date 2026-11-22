-- Abates (e bosses, ondas, raids, niveis, pedras, copias) so entram no save NO FIM da missao, mas o jogo grava a meio da missao (tempo de jogo).
-- O servidor media o limite desde a ultima gravacao (segundos), e no fim de uma missao longa os milhares de abates pareciam instantaneos:
-- 'kills' a jogadores legitimos (ex.: Nunorr). Agora conta desde a ultima vez que subiram (kt, escrito so pelo servidor no gog_save_put).
create or replace function gog._check_save(o jsonb, nw jsonb, dt double precision, p_root bigint) returns text
language plpgsql security definer set search_path = '' as $$
declare sl double precision := least(1, dt / 60); k text; val jsonb; oval jsonb; n_claim int := 0; allow numeric; lv0 numeric; lv1 numeric; i int; j int; g0 numeric; g1 numeric; t text; s0 numeric; s1 numeric; r0 numeric; r1 numeric; refund numeric := 0; c text; dts double precision;
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
    -- abates, bosses, ondas, raids, niveis, pedras e copias so entram no save NO FIM da missao, mas o jogo grava a meio (tempo de jogo):
    -- por isso contam desde a ultima vez que subiram (kt, escrito pelo servidor), nao desde a ultima gravacao. Sem kt: desde a ultima gravacao
    dts := least(greatest(dt, case when o ? 'kt' and jsonb_typeof(o->'kt') = 'number' then extract(epoch from now()) - (o->>'kt')::numeric else 0 end), 7 * 86400);
    lv0 := gog._n(o, 'pl', 'lv'); g0 := gog._n(o, 'gems');
    if lv1 > lv0 + greatest(5, 8 * sl) + dts / 10 then return 'level'; end if;
    if gog._n(nw, 'stats', 'kills') > gog._n(o, 'stats', 'kills') + greatest(100, 100 * sl) + dts * 12 then return 'kills'; end if;
    if gog._n(nw, 'stats', 'bosses') > gog._n(o, 'stats', 'bosses') + greatest(5, 10 * sl) + dts / 8 then return 'bosses'; end if;
    if gog._n(nw, 'stats', 'guard') > gog._n(o, 'stats', 'guard') + greatest(2, 2 * sl) + dts / 60 then return 'guard'; end if;
    if gog._n(nw, 'stats', 'fuses') > gog._n(o, 'stats', 'fuses') + greatest(5, 5 * sl) + dt / 20 then return 'fuses'; end if;
    if gog._n(nw, 'gold') > gog._n(o, 'gold') + gog._gcred(o, dt) + dt * 2000 + gog._rw_gold(o, nw) + gog._ar_gold(o, nw) then return 'gold'; end if;
    if gog._n(nw, 'stats', 'spent') > gog._n(o, 'stats', 'spent') + gog._n(o, 'gold') + gog._gcred(o, dt) + dt * 2000 + gog._rw_gold(o, nw) + gog._ar_gold(o, nw) then return 'spent'; end if;
    s0 := 0; s1 := 0; r0 := 0; r1 := 0;
    for i in 0..5 loop
      if gog._nv(gog._idx(nw->'farmBest', i)) > gog._nv(gog._idx(o->'farmBest', i)) + greatest(3, 6 * sl) + dts / 8 then return 'waves'; end if;
      s0 := s0 + gog._nv(gog._idx(o->'pres', i)); s1 := s1 + gog._nv(gog._idx(nw->'pres', i));
      for j in 0..4 loop
        r0 := r0 + gog._nv(gog._idx(gog._idx(o->'raids', i), j)); r1 := r1 + gog._nv(gog._idx(gog._idx(nw->'raids', i), j));
      end loop;
    end loop;
    if s1 > s0 + 1 + dts / 120 then return 'prestige'; end if;
    if r1 > r0 + greatest(2, 3 * sl) + dts / 45 then return 'raids'; end if;
    -- crescimento de armas, pedras e copias (antes so se verificava o valor maximo de cada uma)
    if gog._tot(nw->'wl') > gog._tot(o->'wl') + greatest(6, 12 * sl) + dt / 10 then return 'growth:wl'; end if;
    if gog._tot(nw->'stones') > gog._tot(o->'stones') + greatest(60, 200 * sl) + dts / 2 then return 'growth:stones'; end if;
    if gog._tot(nw->'wst') > gog._tot(o->'wst') + greatest(150, 200 * sl) + dts / 2 then return 'growth:copies'; end if;
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

-- gog_save_put: guarda kt (a linha e injetada, para nao apagar as protecoes enforce ja aplicadas a funcao)
do $mig$
declare def text; a text := E'  update gog.players set save = p_save, char_cls = coalesce(char_cls, c), save_rev = save_rev + 1, save_at = now()'; chk text := E'  if v.save is not null then   -- kt: quando os abates/bosses/raids subiram pela ultima vez (so o servidor o escreve; ver gog._check_save)
    p_save := case when gog._n(p_save, ''stats'', ''kills'') > gog._n(v.save, ''stats'', ''kills'') or gog._n(p_save, ''stats'', ''bosses'') > gog._n(v.save, ''stats'', ''bosses'') or gog._raids_total(p_save) > gog._raids_total(v.save) then jsonb_set(p_save, ''{kt}'', to_jsonb(floor(extract(epoch from now())))) when v.save ? ''kt'' then jsonb_set(p_save, ''{kt}'', v.save->''kt'') else p_save - ''kt'' end;
  end if;
';
begin
  def := pg_get_functiondef('public.gog_save_put(text,jsonb,integer,text)'::regprocedure);
  if position('''{kt}''' in def) = 0 and position(a in def) > 0 then execute replace(def, a, chk || a); end if;
  if position('''{kt}''' in pg_get_functiondef('public.gog_save_put(text,jsonb,integer,text)'::regprocedure)) = 0 then raise exception 'gog_save_put: nao foi possivel juntar o kt'; end if;
end $mig$;

-- saves que ja existem: kt = hora da ultima gravacao (a missao que estiver a decorrer conta desde ai)
update gog.players set save = jsonb_set(save, '{kt}', to_jsonb(floor(extract(epoch from save_at))))
 where save is not null and save_at is not null and jsonb_typeof(save) = 'object' and not (save ? 'kt');

-- as violacoes destas regras nos ultimos 14 dias eram falsos alarmes: deixam de contar
update gog.violations set counted = false
 where counted and at > now() - interval '14 days' and kind in ('kills', 'bosses', 'guard', 'waves', 'prestige', 'raids', 'level', 'growth:stones', 'growth:copies');
