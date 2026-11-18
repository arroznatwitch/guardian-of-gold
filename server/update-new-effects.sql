-- Efeitos especiais novos nos itens: Veneno (poi) e Eletricidade (elec), com o mesmo teto da Queimadura/Gelo (35%).
-- Sem isto o servidor trata estes itens como forjados. Corre no SQL Editor do Supabase ANTES de publicar a build 45.
do $$
declare d text;
begin
  d := pg_get_functiondef('gog._item_stat_bad(jsonb)'::regprocedure);
  if position('''poi''' in d) > 0 then raise notice '_item_stat_bad: ja atualizado'; return; end if;
  d := replace(d, 'when kk in (''burn'', ''slow'') then 35', 'when kk in (''burn'', ''slow'', ''poi'', ''elec'') then 35');
  if position('''poi''' in d) = 0 then raise exception '_item_stat_bad: texto nao encontrado'; end if;
  execute d;
end $$;
