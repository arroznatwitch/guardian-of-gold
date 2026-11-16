-- CORRECAO: a regra dos atributos bania jogadores LEGITIMOS. Os pontos totais = 3 por nivel + os pontos das recompensas por nivel (ate 1 por nivel)
-- + os comprados, e a regra so contava os 3 por nivel. Agora o limite e 4 x nivel + comprados (max. 1200) + 40.
-- Corre no SQL Editor do Supabase (funciona com o anti-cheat ligado ou desligado). A seguir reativa as contas banidas por 'abs:attrs' (ver o fim).
do $$
declare f text; def text;
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)', 'gog._sane(jsonb)', 'public.gog_submit(text,jsonb)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    def := replace(def, '3 * (coalesce(gog._n(nw, ''pl'', ''lv''), 1) - 1) + least(coalesce(gog._n(nw, ''buyN''), 0), 1200) + 30', '4 * coalesce(gog._n(nw, ''pl'', ''lv''), 1) + least(coalesce(gog._n(nw, ''buyN''), 0), 1200) + 40');
    def := replace(def, 'lim := 3 * (gog._n(s, ''pl'', ''lv'') - 1) + least(gog._n(s, ''buyN''), 1200) + 30;', 'lim := 4 * gog._n(s, ''pl'', ''lv'') + least(gog._n(s, ''buyN''), 1200) + 40;');
    def := replace(def, '3 * (n_level - 1) + 1230', '4 * n_level + 1240');
    execute def;
  end loop;
end $$;

-- ver quem foi banido por esta regra (antes de reativar):
--   select p.nick, v.kind, v.detail, v.at from gog.violations v join gog.players p on p.id = v.root where v.kind = 'abs:attrs' order by v.at desc;

-- reativar as contas banidas por 'abs:attrs' (TODAS menos o GrysHGG, que tinha mesmo atributos impossiveis) e limpar essas ocorrencias:
update gog.players set active = true, inactive_at = null
 where coalesce(owner, id) in (select v.root from gog.violations v where v.kind = 'abs:attrs')
   and coalesce(owner, id) <> (select coalesce(owner, id) from gog.players where nick = 'GrysHGG');
delete from gog.violations where kind = 'abs:attrs' and root <> (select coalesce(owner, id) from gog.players where nick = 'GrysHGG');
