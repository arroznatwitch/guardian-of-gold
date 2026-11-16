-- Epoca do save: quando repoes/corriges o save de um jogador pela base de dados, soma 1 a save.ep (ver exemplo no fim).
-- O servidor passa a recusar ('epoch') qualquer save com uma epoca diferente da guardada, e o jogo descarta o save local e carrega o da conta.
-- Assim o save local antigo/adulterado NUNCA volta a substituir o do servidor, mesmo que o jogador escolha "usar o local".
-- Corre no SQL Editor do Supabase.
do $$
declare def text; a text := E'  if p_rev <> v.save_rev then
    return jsonb_build_object(''ok'', false, ''error'', ''conflict'', ''rev'', v.save_rev, ''dev'', v.save_dev);'; chk text := E'  if v.save is not null and gog._n(p_save, ''ep'') <> gog._n(v.save, ''ep'') then return jsonb_build_object(''ok'', false, ''error'', ''epoch''); end if;
';
begin
  def := pg_get_functiondef('public.gog_save_put(text,jsonb,integer,text)'::regprocedure);
  if position('''epoch''' in def) = 0 and position(a in def) > 0 then execute replace(def, a, chk || a); end if;
end $$;

-- exemplo: depois de corrigires o save de alguem, sobe a epoca (acrescenta isto ao teu update):
--   save = jsonb_set(save, '{ep}', to_jsonb(coalesce((save->>'ep')::int, 0) + 1)), save_rev = save_rev + 1
