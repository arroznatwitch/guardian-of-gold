-- ENCANTAR ESPECIAL SO NO SERVIDOR (parte 2, so DEPOIS de todos terem o jogo atualizado (build 76 ou mais) e de teres corrido update-spec-server.sql):
-- gog_save_put recusa ('outdated') saves em que a soma das repeticoes do encantar especial (rr) dos itens sobe: so gog_buy (p_what = 'spec') o pode fazer.
-- Pode correr-se mais do que uma vez sem problema.
create or replace function gog._rr_sum(s jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare r numeric := 0; e jsonb;
begin
  if jsonb_typeof(s->'gear') = 'object' then for e in select x.value from jsonb_each(s->'gear') x loop if jsonb_typeof(e) = 'object' then r := r + greatest(0, gog._n(e, 'rr')); end if; end loop; end if;
  if jsonb_typeof(s->'bag') = 'array' then for e in select x from jsonb_array_elements(s->'bag') x loop if jsonb_typeof(e) = 'object' then r := r + greatest(0, gog._n(e, 'rr')); end if; end loop; end if;
  return r;
end $$;

do $$
declare def text; a text := E'  if p_rev <> v.save_rev then'; chk text := E'  if v.save is not null and gog._rr_sum(p_save) > gog._rr_sum(v.save) then return jsonb_build_object(''ok'', false, ''error'', ''outdated''); end if;   -- encantar especial so pelo servidor (gog_buy spec)\n';
begin
  def := pg_get_functiondef('public.gog_save_put(text,jsonb,integer,text)'::regprocedure);
  if position('_rr_sum' in def) = 0 and position(a in def) > 0 then execute replace(def, a, chk || a); end if;
end $$;
