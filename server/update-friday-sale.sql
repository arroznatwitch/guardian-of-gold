-- Sexta-feira (hora de Portugal): -20% em todas as compras cobradas pelo servidor (gog_buy: mochilas, 3.a build, Auto-Raid,
-- armas, pets, nome do pet e refinar). O jogo mostra e desconta o mesmo preco. Corre no SQL Editor do Supabase.
do $$
declare def text; nd text;
  a_ref text := E'    if gold < cg then return jsonb_build_object(''ok'', false, ''error'', ''funds''); end if;\n';
  a_fin text := E'  if gold < cg or gems < cd then return jsonb_build_object(''ok'', false, ''error'', ''funds''); end if;';
  sale text := E'  if extract(isodow from now() at time zone ''Europe/Lisbon'') = 5 then cg := round(cg * .8); cd := round(cd * .8); end if;   -- sexta: -20%\n';
begin
  def := pg_get_functiondef('public.gog_buy(text,text,int,text)'::regprocedure);
  if position('Europe/Lisbon' in def) > 0 then raise notice 'ja estava aplicado'; return; end if;
  if position(a_fin in def) = 0 then raise exception 'gog_buy diferente do esperado: nada mudou'; end if;
  nd := replace(def, a_ref, '');   -- o refinar deixa a verificacao do saldo para o fim (ja com o desconto)
  nd := replace(nd, a_fin, sale || a_fin);
  execute nd;
end $$;
