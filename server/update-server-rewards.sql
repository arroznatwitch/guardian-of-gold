-- PARTE 1 (recompensas): resgate das recompensas por nivel calculado no servidor (gog_claim_rewards). Corre no SQL Editor do Supabase.
-- O jogo novo usa esta funcao; se ela nao existir, usa o resgate local de antes (por isso e seguro instalar antes ou depois de atualizar o jogo).
-- Ainda NAO impede o resgate local (isso e o passo seguinte, server/enforce-server-rewards.sql, para correr uma semana depois, quando todos tiverem o jogo novo).

-- Recompensas por nivel calculadas NO SERVIDOR: o jogo pede "resgata ate ao nivel N" e o servidor decide o ouro, os diamantes, os pontos e as pedras
-- (formulas iguais a levelReward() no jogo). Devolve tambem a descricao dos itens e das copias de arma, que o jogo gera.
create or replace function public.gog_claim_rewards(p_token text, p_up_to int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pid bigint; v gog.players; lv int; cd int; tgt int; l int; r int; g numeric := 0; gm numeric := 0; pt numeric := 0; st numeric[] := array[0, 0, 0, 0, 0];
  items jsonb := '[]'::jsonb; wp jsonb := '[]'::jsonb; ns jsonb; newrev int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  if v.save is null then return jsonb_build_object('ok', false, 'error', 'no_save'); end if;
  lv := least(gog._n(v.save, 'pl', 'lv'), 120)::int; cd := greatest(0, least(gog._n(v.save, 'chestDone'), 120))::int;
  tgt := least(coalesce(p_up_to, 0), lv, 120);
  if tgt <= cd then return jsonb_build_object('ok', true, 'n', 0, 'rev', v.save_rev, 'chestDone', cd); end if;
  for l in (cd + 1)..tgt loop
    g := g + round(100 + 45 * l + 0.4 * l * l);
    pt := pt + case when l % 10 = 0 then 4 when l % 5 = 0 then 2 when l % 2 = 0 then 1 else 0 end;
    gm := gm + case when l % 10 = 0 then 15 when l % 5 = 0 then 5 else 0 end;
    if l % 4 = 0 then r := least(4, l / 25); st[r + 1] := st[r + 1] + case when l % 20 = 0 then 2 else 1 end; end if;
    if l % 5 = 0 then items := items || jsonb_build_array(jsonb_build_object('l', l, 'slot', (array['head', 'chest', 'boots', 'amulet'])[((l / 5 - 1) % 4) + 1], 'r', least(4, l / 20 + case when l % 10 = 0 then 1 else 0 end), 'il', least(120, l))); end if;
    if l % 10 = 5 then wp := wp || jsonb_build_array(jsonb_build_object('l', l, 'tier', least(4, l / 15))); end if;
  end loop;
  ns := jsonb_build_array(gog._n(v.save, 'stones', '0') + st[1], gog._n(v.save, 'stones', '1') + st[2], gog._n(v.save, 'stones', '2') + st[3], gog._n(v.save, 'stones', '3') + st[4], gog._n(v.save, 'stones', '4') + st[5]);
  update gog.players set save_rev = save_rev + 1,
    save = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(save,
      '{gold}', to_jsonb(least(2147483647, gog._n(save, 'gold') + g))), '{gems}', to_jsonb(gog._n(save, 'gems') + gm)), '{pts}', to_jsonb(gog._n(save, 'pts') + pt)),
      '{chestDone}', to_jsonb(tgt)), '{stones}', ns)
  where id = pid returning save_rev into newrev;   -- save_at nao muda: os limites de crescimento dependem dele
  return jsonb_build_object('ok', true, 'n', tgt - cd, 'from', cd + 1, 'rev', newrev, 'chestDone', tgt, 'gold', g, 'gems', gm, 'pts', pt, 'stones', to_jsonb(st), 'items', items, 'wpn', wp);
end $$;
