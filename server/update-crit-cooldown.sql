-- Encantamentos especiais novos: Brutal (cdmg, dano critico, ate 45%) e Veloz (skc, recarga da habilidade, ate 20%).
-- Sem isto o servidor trata estes itens como forjados. Corre no SQL Editor do Supabase ANTES de publicar a build 52.
do $$
declare d text;
begin
  d := pg_get_functiondef('gog._item_stat_bad(jsonb)'::regprocedure);
  if position('''cdmg''' in d) > 0 then raise notice '_item_stat_bad: ja atualizado'; return; end if;
  d := replace(d, 'when kk = ''xpb'' then 20', 'when kk in (''xpb'', ''skc'') then 20');
  d := replace(d, '(''ls'', ''crit'', ''gf'', ''dr'', ''dmg'') then 45', '(''ls'', ''crit'', ''gf'', ''dr'', ''dmg'', ''cdmg'') then 45');
  if position('''cdmg''' in d) = 0 or position('''skc''' in d) = 0 then raise exception '_item_stat_bad: texto nao encontrado'; end if;
  execute d;
end $$;
