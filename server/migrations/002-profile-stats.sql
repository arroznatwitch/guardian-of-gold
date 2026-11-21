-- Perfil publico: passar o rato nos atributos mostra as estatisticas (vida, dano, critico, ...).
-- O jogo envia um bloco 'stats' na build; o servidor so guarda numeros conhecidos, com limites. Corre no SQL Editor do Supabase.
do $$
declare d text;
begin
  d := pg_get_functiondef('gog._clean_build(jsonb)'::regprocedure);
  if position('''cx''' in d) > 0 then raise notice '_clean_build: ja atualizado'; return; end if;
  d := replace(d, chr(13), '');   -- a funcao pode ter sido criada a partir do Windows (fins de linha CRLF): tira-se o carater CR da funcao e deste ficheiro, para o texto coincidir em qualquer caso
  d := replace(d, replace(E'  return o;
exception', chr(13), ''), replace(E'  if jsonb_typeof(b->''stats'') = ''object'' then   -- estatisticas calculadas (so para mostrar no perfil): so numeros, com limites
    a := ''{}''::jsonb;
    foreach sl in array array[''hp'', ''dr'', ''dm'', ''cr'', ''cx'', ''as'', ''sp'', ''bu'', ''fr'', ''xp'', ''gf'', ''po'', ''ls'', ''el'', ''cd''] loop
      if jsonb_typeof(b->''stats''->sl) = ''number'' then a := a || jsonb_build_object(sl, round(least(greatest((b->''stats''->>sl)::numeric, -100000), 10000000), 2)); end if;
    end loop;
    o := o || jsonb_build_object(''stats'', a);
  end if;
  return o;
exception', chr(13), ''));
  if position('''cx''' in d) = 0 then raise exception '_clean_build: texto nao encontrado'; end if;
  execute d;
end $$;
