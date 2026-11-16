-- O perfil publico (atributos, arma) vem da coluna gog.players.build, que o jogo envia em gog_submit. Corrigir o save NAO a muda.
-- Esta atualizacao: o servidor ignora atributos impossiveis para o nivel no perfil publico. Corre no SQL Editor do Supabase.
do $$
declare def text; a text := E'  nb := gog._clean_build(p->''build'');
'; add text := E'  if nb is not null and jsonb_typeof(nb->''attr'') = ''object'' and coalesce((nb->''attr''->>''vit'')::numeric, 0) + coalesce((nb->''attr''->>''str'')::numeric, 0) + coalesce((nb->''attr''->>''agi'')::numeric, 0) + coalesce((nb->''attr''->>''per'')::numeric, 0) > 4 * n_level + 1240 then nb := nb - ''attr''; end if;
';
begin
  def := pg_get_functiondef('public.gog_submit(text,jsonb)'::regprocedure);
  if position('4 * n_level + 1240' in def) = 0 and position(a in def) > 0 then execute replace(def, a, a || add); end if;
end $$;

-- corrigir o perfil publico de alguem (exemplo: GrysHGG): atributos, nivel da arma, titulo
--   update gog.players set level = 71, build = jsonb_set(jsonb_set(coalesce(build, '{}'::jsonb) - 'title', '{attr}', '{"vit":0,"str":156,"agi":0,"per":0}'::jsonb), '{weapon,lv}', '11'::jsonb) where nick = 'GrysHGG';
