-- Shop / Auto-Raid: o ouro de uma Auto-Raid (muitas raids de uma vez) pode passar o limite de ouro por gravacao.
-- O jogo guarda o ouro recebido em save.ar.gold e o servidor soma a diferenca ao limite. Corre no SQL Editor do Supabase
-- (precisa do update-gold-allowance.sql / update-reward-reset.sql ja corridos; funciona com o anti-cheat ligado ou desligado).
do $$
declare f text; def text;
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('gog._rw_gold(o, nw)' in def) > 0 and position('''ar'', ''gold''' in def) = 0 then
      execute replace(def, '+ gog._rw_gold(o, nw)', '+ gog._rw_gold(o, nw) + greatest(0, gog._n(nw, ''ar'', ''gold'') - gog._n(o, ''ar'', ''gold''))');
    end if;
  end loop;
end $$;
