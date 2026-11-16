-- Valida os atributos no servidor (um jogador editou o save e ficou com 1e55 de vida). Pontos totais <= 3 x (nivel - 1) + pontos comprados (max. 1200) + 30;
-- se passar, ban imediato ('abs:attrs'). Corre no SQL Editor do Supabase. Funciona com o anti-cheat ligado ou desligado
-- (se estiver DESLIGADO a regra so passa a valer depois de correres server/anticheat-on.sql).
do $$
declare f text; def text; anchor text := E'  -- conquistas: so as novas precisam de prova no proprio save'; rule text;
begin
  rule := $r$  -- atributos: os pontos distribuidos + por gastar nunca passam de 3 por nivel + os pontos comprados (max. 1200); valores absurdos = ban imediato
  if (select coalesce(sum(case when e.value ~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then e.value::numeric else 1e12 end), 0)
        from jsonb_each_text(case when jsonb_typeof(nw->'attr') = 'object' then nw->'attr' else '{}'::jsonb end) e)
     + coalesce(gog._n(nw, 'pts'), 0) > 4 * coalesce(gog._n(nw, 'pl', 'lv'), 1) + least(coalesce(gog._n(nw, 'buyN'), 0), 1200) + 40
     or coalesce(gog._n(nw, 'buyN'), 0) > 1200 then
    return 'abs:attrs';
  end if;
$r$;
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position(anchor in def) > 0 and position('abs:attrs' in def) = 0 then
      execute replace(def, anchor, rule || anchor);
    end if;
  end loop;
end $$;
