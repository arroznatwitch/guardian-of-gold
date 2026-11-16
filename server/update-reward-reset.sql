-- Corrige "Progresso recusado" depois do reset das recompensas por nivel: ao voltar a resgatar desde o nivel 1,
-- o servidor so contava os niveis novos (chestDone) e recusava os diamantes/ouro. Agora um reset (rwv a subir) permite resgatar tudo.
-- Corre no SQL Editor do Supabase. Funciona com o anti-cheat ligado ou desligado.

create or replace function gog._rw_levels(o jsonb, nw jsonb) returns int
language sql immutable set search_path = '' as $$
  select greatest(0, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int - case when coalesce(gog._n(nw, 'rwv'), 0) > coalesce(gog._n(o, 'rwv'), 0) then 0 else coalesce(gog._n(o, 'chestDone'), 0)::int end)
$$;
create or replace function gog._rw_gold(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(sum(100 + 45 * l + 0.4 * l * l), 0) * 1.2 from generate_series(least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int - gog._rw_levels(o, nw) + 1, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int) l
$$;
create or replace function gog._rw_gems(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$ select 8 * gog._rw_levels(o, nw)::numeric $$;


do $$
declare f text; def text;
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('+ 75 * n_claim + 10 + 80;' in def) > 0 then
      def := replace(def, '+ 75 * n_claim + 10 + 80;', '+ 75 * n_claim + 10 + 80 + gog._rw_gems(o, nw);');
    end if;
    if position('+ 80000 + dt * 2000' in def) > 0 then
      def := replace(def, '+ 80000 + dt * 2000', '+ 160000 + dt * 2000 + gog._rw_gold(o, nw)');
    end if;
    execute def;
  end loop;
end $$;

-- reativa contas banidas pelo anti-cheat (so as que tem ocorrencias registadas) e limpa o registo
update gog.players set active = true, inactive_at = null where coalesce(owner, id) in (select root from gog.violations);
delete from gog.violations;
