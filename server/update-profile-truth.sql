-- O perfil publico passava a mostrar o que o CLIENTE envia (e o nivel nunca descia: level = greatest(level, ...)), por isso um save adulterado
-- repunha os valores falsos a cada envio. Agora gog_submit usa o save guardado no servidor: atributos e nivel da arma vem do save, e o nivel
-- enviado nunca passa do nivel do save. Corre no SQL Editor do Supabase.

-- o perfil publico usa o save VERIFICADO no servidor (atributos e nivel da arma), nunca o que o cliente diz
create or replace function gog._truth_build(nb jsonb, sv jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare a jsonb; wid text;
begin
  if nb is null or sv is null then return nb; end if;
  a := sv->'attr';
  if jsonb_typeof(a) = 'object' then
    nb := nb || jsonb_build_object('attr', jsonb_build_object('vit', least(greatest(gog._n(a, 'vit'), 0), 99999)::int, 'str', least(greatest(gog._n(a, 'str'), 0), 99999)::int,
                                                              'agi', least(greatest(gog._n(a, 'agi'), 0), 99999)::int, 'per', least(greatest(gog._n(a, 'per'), 0), 99999)::int));
  end if;
  wid := nb->'weapon'->>'id';
  if wid is not null and jsonb_typeof(sv->'wl') = 'object' then nb := jsonb_set(nb, '{weapon,lv}', to_jsonb(least(greatest(gog._n(sv->'wl', wid), 0), 20)::int)); end if;
  return nb;
end $$;

do $$
declare def text; a1 text := E'  first_time := v.submitted_at is null;
'; a2 text := E'  nb := gog._clean_build(p->''build'');
';
begin
  def := pg_get_functiondef('public.gog_submit(text,jsonb)'::regprocedure);
  if position('gog._truth_build' in def) = 0 and position(a1 in def) > 0 and position(a2 in def) > 0 then
    def := replace(def, a1, a1 || E'  if v.save is not null then n_level := least(n_level, greatest(1, gog._n(v.save, ''pl'', ''lv''))::int); end if;
');
    def := replace(def, a2, a2 || E'  nb := gog._truth_build(nb, v.save);
');
    execute def;
  end if;
end $$;

-- depois de corrigires o save de alguem, repoe tambem o perfil (nivel e build):
--   update gog.players set level = 71, build = jsonb_set(jsonb_set(coalesce(build, '{}'::jsonb) - 'title', '{attr}', '{"vit":0,"str":156,"agi":0,"per":0}'::jsonb), '{weapon,lv}', '11'::jsonb) where nick = 'GrysHGG';
