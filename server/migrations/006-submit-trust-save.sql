-- Ranking (gog_submit): deixa de recusar envios com 'implausible' ("Progresso recusado pelo servidor (valores inesperados)").
-- Os valores do ranking ja vem do save verificado pelo servidor (gog_save_put), por isso os limites de crescimento entre envios
-- so davam falsos alarmes (ex.: muito ouro numa missao com o x2 de fim de semana). Troca cada recusa por "nao faz nada".
do $$
declare def text;
begin
  def := pg_get_functiondef('public.gog_submit(text,jsonb)'::regprocedure);
  if position('''implausible''' in def) > 0 then
    execute replace(def, 'return jsonb_build_object(''ok'', false, ''error'', ''implausible'');', 'null;');
  end if;
end $$;
