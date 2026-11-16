-- PARTE 1b (so DEPOIS de todos terem o jogo atualizado): impede resgatar recompensas por nivel no cliente.
-- gog_save_put passa a recusar ('outdated', sem contar como violacao) qualquer save em que chestDone SOBE: so a funcao gog_claim_rewards o pode subir.
-- Corre no SQL Editor do Supabase.
do $$
declare def text; a text := E'  if p_rev <> v.save_rev then'; chk text := E'  if v.save is not null and gog._n(p_save, ''chestDone'') > gog._n(v.save, ''chestDone'') then return jsonb_build_object(''ok'', false, ''error'', ''outdated''); end if;   -- chestDone so sobe pelo servidor (gog_claim_rewards)\n';
begin
  def := pg_get_functiondef('public.gog_save_put(text,jsonb,integer,text)'::regprocedure);
  if position('''outdated''' in def) = 0 and position(a in def) > 0 then execute replace(def, a, chk || a); end if;
end $$;
