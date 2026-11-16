-- SEGURANCA 2: corre no SQL Editor do Supabase (depois de update-security.sql). Idempotente.
-- 1) Ouro: cada conta tem um credito de ouro (ate 500 000, regenera 500/s) alem do ritmo normal; gravar muitas vezes ja nao multiplica a folga fixa por gravacao.
-- 2) Itens novos ou alterados com estatisticas impossiveis para o nivel e a raridade (ex.: vida de 1 000 000) contam como ocorrencia.
-- 3) Se o anti-batota estiver desligado, o patch fica na copia _check_save_real.

-- ------------------------------------------------------------ seguranca 2: credito de ouro, itens novos, encantar
-- credito de ouro: alem do ritmo normal (dt * 2000 por segundo) cada conta tem um credito ate 500 000 que regenera 500/s; gravar mais vezes ja nao multiplica a folga
create or replace function gog._gcred(o jsonb, dt double precision) returns numeric
language plpgsql immutable set search_path = '' as $$
begin
  if o ? 'gcred' then return least(500000, greatest(0, gog._n(o, 'gcred')) + dt * 500); end if;
  return 500000;
end $$;

-- limites das estatisticas de um item (formulas do jogo sem os nerfs, com folga): so apanha valores forjados
create or replace function gog._item_stat_bad(it jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare sl text := it->>'slot'; r numeric := gog._n(it, 'r'); il numeric := gog._n(it, 'il'); mb numeric; a jsonb; kk text; b numeric; p numeric; cap numeric;
begin
  if jsonb_typeof(it) <> 'object' then return false; end if;
  if sl = 'ring' then return gog._n(it, 'main', 'v') > 17; end if;
  mb := case sl when 'head' then (30 + 8 * il) * (1 + .24 * r) when 'chest' then (50 + 12 * il) * (1 + .24 * r) when 'boots' then (3 + .25 * il) * (1 + .2 * r) when 'amulet' then (3 + .35 * il) * (1 + .2 * r) end;
  if mb is null then return true; end if;
  if gog._n(it, 'main', 'v') > mb * 1.3 + 2 then return true; end if;
  if jsonb_typeof(it->'aff') = 'array' then
    if jsonb_array_length(it->'aff') > 4 then return true; end if;
    for a in select x from jsonb_array_elements(it->'aff') x loop
      kk := a->>'k'; b := null;
      select s.b, s.p into b, p from (values ('hp', 12, 3), ('dmg', 2.5, .25), ('spd', 1.5, .12), ('cdr', 1.5, .12), ('crit', 1.5, .1), ('ls', .8, .05), ('dr', 1, .08), ('gf', 3, .3), ('xpb', 3, .3)) s(k, b, p) where s.k = kk;
      if b is null then return true; end if;
      if gog._n(a, 'v') > (b + p * il) * 1.25 * (1 + .1 * r) * 1.3 + 1 then return true; end if;
    end loop;
  end if;
  if jsonb_typeof(it->'spec') = 'object' then
    kk := it->'spec'->>'k';
    cap := case when kk in ('burn', 'slow') then 35 when kk = 'xpb' then 20 when kk in ('ls', 'crit', 'gf', 'dr', 'dmg') then 45 end;
    if cap is null or gog._n(it, 'spec', 'v') > cap + 0.5 then return true; end if;
  end if;
  return false;
end $$;

-- itens novos ou alterados (que o save anterior do servidor nao tinha tal e qual) com estatisticas impossiveis
create or replace function gog._items_new_bad(o jsonb, nw jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare oi jsonb := '[]'::jsonb; it jsonb;
begin
  if jsonb_typeof(o->'bag') = 'array' then oi := o->'bag'; end if;
  if jsonb_typeof(o->'gear') = 'object' then oi := oi || coalesce((select jsonb_agg(e.value) from jsonb_each(o->'gear') e), '[]'::jsonb); end if;
  for it in select e.value from jsonb_each(case when jsonb_typeof(nw->'gear') = 'object' then nw->'gear' else '{}'::jsonb end) e
            union all select x from jsonb_array_elements(case when jsonb_typeof(nw->'bag') = 'array' then nw->'bag' else '[]'::jsonb end) x loop
    if jsonb_typeof(it) = 'object' and not (oi @> jsonb_build_array(it)) and gog._item_stat_bad(it) then return true; end if;
  end loop;
  return false;
end $$;

-- soma dos niveis de encantamento de todos os itens (equipados e na mochila)
create or replace function gog._ench_sum(s jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare r numeric := 0; e jsonb;
begin
  if jsonb_typeof(s->'gear') = 'object' then for e in select x.value from jsonb_each(s->'gear') x loop if jsonb_typeof(e) = 'object' then r := r + greatest(0, gog._n(e, 'ench')); end if; end loop; end if;
  if jsonb_typeof(s->'bag') = 'array' then for e in select x from jsonb_array_elements(s->'bag') x loop if jsonb_typeof(e) = 'object' then r := r + greatest(0, gog._n(e, 'ench')); end if; end loop; end if;
  return r;
end $$;

do $$
declare f text;
begin
  foreach f in array array['gog._gcred(jsonb,double precision)', 'gog._item_stat_bad(jsonb)', 'gog._items_new_bad(jsonb,jsonb)', 'gog._ench_sum(jsonb)'] loop
    execute format('revoke all on function %s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); end if;
  end loop;
end $$;

do $m$
declare def text; nd text; oid regprocedure;
begin
  oid := to_regprocedure('gog._check_save(jsonb,jsonb,double precision,bigint)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$gog._gcred($q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$greatest(80000, 160000 * sl)$q$, $q$gog._gcred(o, dt)$q$);
      nd := replace(nd, $q$  if gog._sane(nw) is not null then return gog._sane(nw); end if;$q$, $q$  if o is not null and gog._items_new_bad(o, nw) then return 'items:stats'; end if;   -- itens novos com estatisticas impossiveis para o nivel e a raridade
  if gog._sane(nw) is not null then return gog._sane(nw); end if;$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
  oid := to_regprocedure('gog._check_save_real(jsonb,jsonb,double precision,bigint)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$gog._gcred($q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$greatest(80000, 160000 * sl)$q$, $q$gog._gcred(o, dt)$q$);
      nd := replace(nd, $q$  if gog._sane(nw) is not null then return gog._sane(nw); end if;$q$, $q$  if o is not null and gog._items_new_bad(o, nw) then return 'items:stats'; end if;   -- itens novos com estatisticas impossiveis para o nivel e a raridade
  if gog._sane(nw) is not null then return gog._sane(nw); end if;$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
end $m$;

do $m$
declare def text; nd text; oid regprocedure;
begin
  oid := to_regprocedure('public.gog_save_put(text,jsonb,integer,text)');
  if oid is not null then
    def := pg_get_functiondef(oid);
    if position($q$gcred$q$ in def) = 0 then
      nd := def;
      nd := replace(nd, $q$declare pid bigint; v gog.players; newrev int; c text; reason text; banned boolean; pts numeric;$q$, $q$declare pid bigint; v gog.players; newrev int; c text; reason text; banned boolean; pts numeric; dtv double precision;$q$);
      nd := replace(nd, $q$  reason := gog._check_save(v.save, p_save, least(greatest(extract(epoch from now() - coalesce(v.save_at, now() - interval '10 seconds')), 10), 7 * 86400), coalesce(v.owner, v.id));$q$, $q$  dtv := least(greatest(extract(epoch from now() - coalesce(v.save_at, now() - interval '10 seconds')), 10), 7 * 86400);
  reason := gog._check_save(v.save, p_save, dtv, coalesce(v.owner, v.id));$q$);
      nd := replace(nd, $q$  update gog.players set save = p_save, char_cls = coalesce(char_cls, c)$q$, $q$  if v.save is not null then   -- credito de ouro (o servidor escreve-o, o cliente nao o controla)
    p_save := jsonb_set(p_save, '{gcred}', to_jsonb(greatest(0, gog._gcred(v.save, dtv) - greatest(0, gog._n(p_save, 'gold') - gog._n(v.save, 'gold') - gog._rw_gold(v.save, p_save) - gog._ar_gold(v.save, p_save) - dtv * 2000))));
  else p_save := jsonb_set(p_save, '{gcred}', to_jsonb(500000)); end if;
  update gog.players set save = p_save, char_cls = coalesce(char_cls, c)$q$);
      if nd <> def then execute nd; end if;
    end if;
  end if;
end $m$;
