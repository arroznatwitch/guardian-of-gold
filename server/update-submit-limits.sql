-- Corrige "Progresso recusado pelo servidor (valores inesperados)" (erro 'implausible' do envio para o ranking, gog_submit).
-- Os limites de crescimento entre dois envios eram muito apertados (ex.: ouro 20 000 + 500/s) e, depois de dias sem enviar,
-- o progresso real ultrapassava-os e o envio ficava recusado para sempre. Corre no SQL Editor do Supabase.

do $$
declare def text;
begin
  def := pg_get_functiondef('public.gog_submit(text,jsonb)'::regprocedure);
  def := replace(def, 'v.level + 5 + dt / 15', 'v.level + 10 + dt / 10');
  def := replace(def, 'v.kills + 40 + dt * 8', 'v.kills + 2000 + dt * 50');
  def := replace(def, 'v.gold + 20000 + dt * 500', 'v.gold + 1000000 + dt * 5000');
  def := replace(def, 'v.bosses + 5 + dt / 15', 'v.bosses + 100 + dt / 3');
  def := replace(def, 'v.raids + 2 + dt / 60', 'v.raids + 20 + dt / 10');
  def := replace(def, 'o_w[i] + 5 + dt / 8', 'o_w[i] + 20 + dt / 2');
  execute def;
end $$;
