-- O ranking (nivel, abates, ouro, bosses, raids, ondas) vinha do que o CLIENTE envia e so podia subir (greatest), por isso um save local adulterado
-- ficava no ranking mesmo depois de corrigires o save no servidor. Agora gog_submit usa o save guardado no servidor e o ranking pode descer.
-- Corre no SQL Editor do Supabase.
do $$
declare def text; a1 text := E'  first_time := v.submitted_at is null;
'; ov text; r text[]; i int;
begin
  ov := $o$  if v.save is not null then   -- o ranking usa o save verificado no servidor, nunca o que o cliente diz (e pode descer, nao so subir)
    n_level := greatest(1, gog._n(v.save, 'pl', 'lv'))::int; n_kills := gog._n(v.save, 'stats', 'kills')::bigint; n_gold := gog._n(v.save, 'stats', 'gold')::bigint;
    n_bosses := gog._n(v.save, 'stats', 'bosses')::int; n_raids := gog._raids_total(v.save)::int;
    n_w := array[gog._nv(gog._idx(v.save->'farmBest', 0))::int, gog._nv(gog._idx(v.save->'farmBest', 1))::int, gog._nv(gog._idx(v.save->'farmBest', 2))::int, gog._nv(gog._idx(v.save->'farmBest', 3))::int, gog._nv(gog._idx(v.save->'farmBest', 4))::int, gog._nv(gog._idx(v.save->'farmBest', 5))::int];
  end if;
$o$;
  def := pg_get_functiondef('public.gog_submit(text,jsonb)'::regprocedure);
  if position('o ranking usa o save verificado' in def) = 0 and position(a1 in def) > 0 then
    def := replace(def, a1, a1 || ov);
    def := replace(def, 'level = greatest(level, n_level)', 'level = n_level');
    def := replace(def, 'kills = greatest(kills, n_kills)', 'kills = n_kills');
    def := replace(def, 'gold = greatest(gold, n_gold)', 'gold = n_gold');
    def := replace(def, 'bosses = greatest(bosses, n_bosses)', 'bosses = n_bosses');
    def := replace(def, 'raids = greatest(raids, n_raids)', 'raids = n_raids');
    for i in 0..5 loop def := replace(def, 'w' || i || ' = greatest(w' || i || ', n_w[' || (i + 1) || '])', 'w' || i || ' = n_w[' || (i + 1) || ']'); end loop;
    execute def;
  end if;
end $$;

-- repor JA a linha do ranking de alguem a partir do save (exemplo: GrysHGG), sem esperar pelo proximo envio:
--   update gog.players set level = greatest(1, (save->'pl'->>'lv')::int), kills = coalesce((save->'stats'->>'kills')::bigint, 0), gold = coalesce((save->'stats'->>'gold')::bigint, 0), bosses = coalesce((save->'stats'->>'bosses')::int, 0) where nick = 'GrysHGG';
