-- Corrige "Progresso recusado pelo servidor": resgatar muitas recompensas por nivel de uma vez (e o evento/missoes diarias)
-- dava mais ouro do que o limite por gravacao (80 000). Passa a limite 160 000 + o ouro das recompensas por nivel resgatadas.
-- Corre no SQL Editor do Supabase. Funciona com o anti-cheat ligado ou desligado.

create or replace function gog._rw_gold(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(sum(100 + 45 * l + 0.4 * l * l), 0) * 1.2 from generate_series(coalesce(gog._n(o, 'chestDone'), 0)::int + 1, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int) l
$$;

do $$
declare f text; def text;
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('+ 80000 + dt * 2000' in def) > 0 then
      execute replace(def, '+ 80000 + dt * 2000', '+ 160000 + dt * 2000 + gog._rw_gold(o, nw)');
    end if;
  end loop;
end $$;

-- limpa as ocorrencias registadas e reativa contas banidas pelo anti-cheat (opcional)
delete from gog.violations;
update gog.players set active = true, inactive_at = null where not active and id in (select coalesce(owner, id) from gog.players);
