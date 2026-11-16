-- =====================================================================================================
-- GUARDIANS OF GOLD - ATUALIZACAO DO SERVIDOR (TUDO NUM SO SQL)
-- Cola TUDO no SQL Editor do Supabase e corre uma vez. E seguro correr mais do que uma vez (cada passo so aplica o que falta).
-- Faz copia de seguranca antes. Ordem: funcoes -> anti-cheat ligado -> correcao do GrysHGG -> verificacao.
-- NOTA: o passo "guildas por personagem" faz cada classe ser um membro separado da guilda.
-- =====================================================================================================


-- ----------------------------------------------------------------------------------------------
-- update-daily.sql  (missoes diarias: conquistas daily*)
-- ----------------------------------------------------------------------------------------------
-- Missoes diarias: o servidor passa a aceitar as conquistas daily1/5/25/50/100/250 (prova: save.daily.n).
-- Corre no SQL Editor do Supabase (so substitui esta funcao).
create or replace function gog._ach_ok(id text, s jsonb) returns boolean
language plpgsql immutable set search_path = '' as $$
declare m text[]; n numeric; c int; k int; cl text;
begin
  m := regexp_match(id, '^(kills|boss|guard|spend|fuse)([0-9]+)$');
  if m is not null then
    return gog._n(s, 'stats', case m[1] when 'kills' then 'kills' when 'boss' then 'bosses' when 'guard' then 'guard' when 'spend' then 'spent' else 'fuses' end) >= m[2]::numeric;
  end if;
  m := regexp_match(id, '^lv([0-9]+)$');
  if m is not null then return gog._n(s, 'pl', 'lv') >= m[1]::numeric; end if;
  m := regexp_match(id, '^daily([0-9]+)$');   -- missoes diarias: so conta o que o save prova (contador d.n)
  if m is not null then return gog._n(s, 'daily', 'n') >= m[1]::numeric; end if;
  if id = 'bag5' then return gog._n(s, 'bagSlots') >= 5; end if;
  m := regexp_match(id, '^anv([0-9]+)$');
  if m is not null then
    return coalesce((select max(case when e.value ~ '^[0-9]{1,3}$' then e.value::numeric else 0 end) from jsonb_each_text(case when jsonb_typeof(s->'wl') = 'object' then s->'wl' else '{}'::jsonb end) e), 0) >= m[1]::numeric;
  end if;
  if id = 'rar3' then return gog._n(s, 'stats', 'rar') >= 3; end if;
  if id = 'rar4' then return gog._n(s, 'stats', 'rar') >= 4; end if;
  m := regexp_match(id, '^stars([0-9]+)$');
  if m is not null then
    return coalesce((select sum(gog._nv(e)) from jsonb_array_elements(case when jsonb_typeof(s->'pres') = 'array' then s->'pres' else '[]'::jsonb end) e), 0) >= m[1]::numeric;
  end if;
  m := regexp_match(id, '^presmax([0-5])$');
  if m is not null then return gog._nv(gog._idx(s->'pres', m[1]::int)) >= 5; end if;
  m := regexp_match(id, '^farm([0-9]+)$');
  if m is not null then
    n := m[1]::numeric;
    for k in 0..5 loop if gog._nv(gog._idx(s->'farmN', k)) < n then return false; end if; end loop;
    return true;
  end if;
  m := regexp_match(id, '^wave([0-5])_([0-9]+)$');
  if m is not null then return gog._nv(gog._idx(s->'farmBest', m[1]::int)) >= m[2]::numeric; end if;
  m := regexp_match(id, '^raid([0-4])$');
  if m is not null then
    c := 0;
    for k in 0..5 loop if gog._nv(gog._idx(gog._idx(s->'raids', k), m[1]::int)) > 0 then c := c + 1; end if; end loop;
    return c = 6;
  end if;
  m := regexp_match(id, '^ench(5|10)$');
  if m is not null then
    c := 0;
    foreach cl in array array['head', 'chest', 'boots', 'amulet'] loop
      if gog._n(s, 'gear', cl, 'ench') >= m[1]::numeric then c := c + 1; end if;
    end loop;
    return c = 4;
  end if;
  m := regexp_match(id, '^wmax([1-5])$');
  if m is not null then
    return (select count(*) from jsonb_each(case when jsonb_typeof(s->'wst') = 'object' then s->'wst' else '{}'::jsonb end) w
            where jsonb_typeof(w.value) = 'array' and gog._nv(w.value -> 3) > 0) >= m[1]::int;
  end if;
  if id in ('skin1', 'skin3') then
    c := 0;
    foreach cl in array array['knight', 'archer', 'mage'] loop
      if jsonb_typeof(s->'sk'->cl) = 'array' and jsonb_array_length(s->'sk'->cl) >= 6
         and not exists (select 1 from jsonb_array_elements(s->'sk'->cl) e where e <> '1'::jsonb) then c := c + 1; end if;
    end loop;
    return c >= case id when 'skin1' then 1 else 3 end;
  end if;
  return false;
end $$;

-- ----------------------------------------------------------------------------------------------
-- update-gold-allowance.sql  (limite de ouro por gravacao)
-- ----------------------------------------------------------------------------------------------
-- Corrige "Progresso recusado pelo servidor": resgatar muitas recompensas por nivel de uma vez (e o evento/missoes diarias)
-- dava mais ouro do que o limite por gravacao (80 000). Passa a limite 160 000 + o ouro das recompensas por nivel resgatadas.
-- Corre no SQL Editor do Supabase. Funciona com o anti-cheat ligado ou desligado.

create or replace function gog._rw_gold(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(sum(100 + 45 * l + 0.4 * l * l), 0) * 1.2 from generate_series(coalesce(gog._n(o, 'chestDone'), 0)::int + 1, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int) l
$$;

do $$
declare f text; def text;
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('+ 80000 + dt * 2000' in def) > 0 then
      execute replace(def, '+ 80000 + dt * 2000', '+ 160000 + dt * 2000 + gog._rw_gold(o, nw)');
    end if;
  end loop;
end $$;

-- reativa as contas banidas pelo anti-cheat (so as que tem ocorrencias registadas) e limpa o registo

-- ----------------------------------------------------------------------------------------------
-- update-reward-reset.sql  (reset das recompensas por nivel)
-- ----------------------------------------------------------------------------------------------
-- Corrige "Progresso recusado" depois do reset das recompensas por nivel: ao voltar a resgatar desde o nivel 1,
-- o servidor so contava os niveis novos (chestDone) e recusava os diamantes/ouro. Agora um reset (rwv a subir) permite resgatar tudo.
-- Corre no SQL Editor do Supabase. Funciona com o anti-cheat ligado ou desligado.

create or replace function gog._rw_levels(o jsonb, nw jsonb) returns int
language sql immutable set search_path = '' as $$
  select greatest(0, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int - case when coalesce(gog._n(nw, 'rwv'), 0) > coalesce(gog._n(o, 'rwv'), 0) then 0 else coalesce(gog._n(o, 'chestDone'), 0)::int end)
$$;
create or replace function gog._rw_gold(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(sum(100 + 45 * l + 0.4 * l * l), 0) * 1.2 from generate_series(least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int - gog._rw_levels(o, nw) + 1, least(coalesce(gog._n(nw, 'chestDone'), 0), 200)::int) l
$$;
create or replace function gog._rw_gems(o jsonb, nw jsonb) returns numeric
language sql immutable set search_path = '' as $$ select 8 * gog._rw_levels(o, nw)::numeric $$;


do $$
declare f text; def text;
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('+ 75 * n_claim + 10 + 80;' in def) > 0 then
      def := replace(def, '+ 75 * n_claim + 10 + 80;', '+ 75 * n_claim + 10 + 80 + gog._rw_gems(o, nw);');
    end if;
    if position('+ 80000 + dt * 2000' in def) > 0 then
      def := replace(def, '+ 80000 + dt * 2000', '+ 160000 + dt * 2000 + gog._rw_gold(o, nw)');
    end if;
    execute def;
  end loop;
end $$;

-- reativa contas banidas pelo anti-cheat (so as que tem ocorrencias registadas) e limpa o registo

-- ----------------------------------------------------------------------------------------------
-- update-attr-check.sql  (validacao dos atributos)
-- ----------------------------------------------------------------------------------------------
-- Valida os atributos no servidor (um jogador editou o save e ficou com 1e55 de vida). Pontos totais <= 3 x (nivel - 1) + pontos comprados (max. 1200) + 30;
-- se passar, ban imediato ('abs:attrs'). Corre no SQL Editor do Supabase. Funciona com o anti-cheat ligado ou desligado
-- (se estiver DESLIGADO a regra so passa a valer depois de correres server/anticheat-on.sql).
do $$
declare f text; def text; anchor text := E'  -- conquistas: so as novas precisam de prova no proprio save'; rule text;
begin
  rule := $r$  -- atributos: os pontos distribuidos + por gastar nunca passam de 3 por nivel + os pontos comprados (max. 1200); valores absurdos = ban imediato
  if (select coalesce(sum(case when e.value ~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then e.value::numeric else 1e12 end), 0)
        from jsonb_each_text(case when jsonb_typeof(nw->'attr') = 'object' then nw->'attr' else '{}'::jsonb end) e)
     + coalesce(gog._n(nw, 'pts'), 0) > 3 * (coalesce(gog._n(nw, 'pl', 'lv'), 1) - 1) + least(coalesce(gog._n(nw, 'buyN'), 0), 1200) + 30
     or coalesce(gog._n(nw, 'buyN'), 0) > 1200 then
    return 'abs:attrs';
  end if;
$r$;
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position(anchor in def) > 0 and position('abs:attrs' in def) = 0 then
      execute replace(def, anchor, rule || anchor);
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------------------------
-- update-hardening.sql  (_n/_nv sem falha de numeros gigantes, _sane e historico de saves)
-- ----------------------------------------------------------------------------------------------
-- Reforco do anti-cheat (um jogador editou o save: atributos 1e55, ouro inventado).
-- 1) gog._n / gog._nv passam a ler valores enormes e em notacao cientifica (antes devolviam 0 e as verificacoes deixavam-nos passar);
-- 2) gog._sane valida itens (nivel/encantamento/estrelas), niveis de arma, pedras, copias e as builds guardadas;
-- 3) historico de saves (gog.save_history): guarda o save anterior de cada personagem, no maximo 1 a cada 6 h, os 4 mais recentes.
-- Corre no SQL Editor do Supabase (precisa do update-attr-check.sql ja corrido). Para as regras valerem o anti-cheat tem de estar LIGADO (server/anticheat-on.sql).

create or replace function gog._n(j jsonb, variadic p text[]) returns numeric
language plpgsql immutable set search_path = '' as $$
declare t text;
begin
  t := j #>> p;
  if t is not null and t ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then return t::numeric; end if;   -- qualquer tamanho/notacao cientifica (antes valores enormes davam 0 e passavam)
  return 0;
end $$;

create or replace function gog._nv(j jsonb) returns numeric
language plpgsql immutable set search_path = '' as $$
declare t text;
begin
  t := j #>> '{}';
  if t is not null and t ~ '^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then return t::numeric; end if;   -- qualquer tamanho/notacao cientifica (antes valores enormes davam 0 e passavam)
  return 0;
end $$;

create or replace function gog._item_bad(it jsonb) returns boolean
language sql immutable set search_path = '' as $$
  select jsonb_typeof(it) = 'object' and (gog._n(it, 'il') > 125 or gog._n(it, 'il') < 0 or gog._n(it, 'ench') > 12 or gog._n(it, 'ench') < 0 or gog._n(it, 'st') > 3 or gog._n(it, 'st') < 0 or gog._n(it, 'r') > 4 or gog._n(it, 'r') < 0)
$$;
create or replace function gog._sane(s jsonb) returns text
language plpgsql immutable set search_path = '' as $$
declare b jsonb; it jsonb; lim numeric; tot numeric;
begin
  lim := 3 * (gog._n(s, 'pl', 'lv') - 1) + least(gog._n(s, 'buyN'), 1200) + 30;
  if gog._n(s, 'pts') < 0 or gog._n(s, 'buyN') < 0 or gog._n(s, 'pts') > 100000 then return 'abs:neg'; end if;
  if jsonb_typeof(s->'lo'->'b') = 'array' then   -- builds guardadas (loadouts)
    for b in select x from jsonb_array_elements(s->'lo'->'b') x loop
      if jsonb_typeof(b->'attr') = 'object' then
        select coalesce(sum(case when e.value ~ '^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$' then e.value::numeric else 1e12 end), 0) into tot from jsonb_each_text(b->'attr') e;
        if tot > lim then return 'abs:attrs'; end if;
      end if;
      if jsonb_typeof(b->'gear') = 'object' then for it in select e.value from jsonb_each(b->'gear') e loop if gog._item_bad(it) then return 'abs:items'; end if; end loop; end if;
    end loop;
  end if;
  if jsonb_typeof(s->'wl') = 'object' and exists (select 1 from jsonb_each_text(s->'wl') e where e.value !~ '^[0-9]{1,2}$' or e.value::numeric > 25) then return 'abs:wl'; end if;
  if jsonb_typeof(s->'stones') = 'array' and exists (select 1 from jsonb_array_elements_text(s->'stones') e where e !~ '^[0-9]{1,7}$') then return 'abs:stones'; end if;
  if jsonb_typeof(s->'wst') = 'object' and exists (select 1 from jsonb_each(s->'wst') w, jsonb_array_elements_text(case when jsonb_typeof(w.value) = 'array' then w.value else '[]'::jsonb end) e where e !~ '^[0-9]{1,7}$') then return 'abs:copies'; end if;
  if jsonb_typeof(s->'gear') = 'object' then for it in select e.value from jsonb_each(s->'gear') e loop if gog._item_bad(it) then return 'abs:items'; end if; end loop; end if;
  if jsonb_typeof(s->'bag') = 'array' then for it in select x from jsonb_array_elements(s->'bag') x loop if gog._item_bad(it) then return 'abs:items'; end if; end loop; end if;
  return null;
end $$;

-- historico de saves: guarda o save anterior de cada personagem (no maximo 1 a cada 6 h, os 4 mais recentes) para poder repor um save adulterado
create table if not exists gog.save_history (id bigserial primary key, player_id bigint not null references gog.players(id) on delete cascade, at timestamptz not null default now(), save jsonb not null);
create index if not exists save_history_idx on gog.save_history (player_id, at desc);
alter table gog.save_history enable row level security; revoke all on gog.save_history from public;
create or replace function gog._save_snap() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.save is not null and new.save is distinct from old.save and not exists (select 1 from gog.save_history h where h.player_id = old.id and h.at > now() - interval '6 hours') then
    insert into gog.save_history (player_id, save) values (old.id, old.save);
    delete from gog.save_history where player_id = old.id and id not in (select id from gog.save_history where player_id = old.id order by at desc limit 4);
  end if;
  return new;
end $$;
drop trigger if exists save_snap on gog.players;
create trigger save_snap before update of save on gog.players for each row execute function gog._save_snap();


do $$
declare f text; def text; a1 text := E'    return ''abs:attrs'';
  end if;
'; a2 text := E'  -- conquistas: so as novas precisam de prova no proprio save'; call text := E'  if gog._sane(nw) is not null then return gog._sane(nw); end if;
';
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('gog._sane' in def) = 0 then
      if position(a1 in def) > 0 then def := replace(def, a1, a1 || call);
      elsif position(a2 in def) > 0 then def := replace(def, a2, call || a2);
      else continue; end if;
      execute def;
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------------------------
-- update-autoraid.sql  (ouro da Auto-Raid)
-- ----------------------------------------------------------------------------------------------
-- Shop / Auto-Raid: o ouro de uma Auto-Raid (muitas raids de uma vez) pode passar o limite de ouro por gravacao.
-- O jogo guarda o ouro recebido em save.ar.gold e o servidor soma a diferenca ao limite. Corre no SQL Editor do Supabase
-- (precisa do update-gold-allowance.sql / update-reward-reset.sql ja corridos; funciona com o anti-cheat ligado ou desligado).
do $$
declare f text; def text;
begin
  foreach f in array array['gog._check_save_real(jsonb,jsonb,double precision,bigint)', 'gog._check_save(jsonb,jsonb,double precision,bigint)'] loop
    begin def := pg_get_functiondef(f::regprocedure); exception when undefined_function then continue; end;
    if position('gog._rw_gold(o, nw)' in def) > 0 and position('''ar'', ''gold''' in def) = 0 then
      execute replace(def, '+ gog._rw_gold(o, nw)', '+ gog._rw_gold(o, nw) + greatest(0, gog._n(nw, ''ar'', ''gold'') - gog._n(o, ''ar'', ''gold''))');
    end if;
  end loop;
end $$;

-- ----------------------------------------------------------------------------------------------
-- update-submit-limits.sql  (limites do envio para o ranking)
-- ----------------------------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------------------------
-- update-guild-alts.sql  (guildas por personagem)
-- ----------------------------------------------------------------------------------------------
-- Guildas: cada personagem (classe) e um membro separado (entra a parte e ocupa uma vaga).
-- Corre no SQL Editor do Supabase. Os membros atuais mantem-se (ficam associados ao personagem principal).

create or replace function public.gog_board(p_stat text, p_limit int default 20, p_token text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare col text; lim int := least(greatest(coalesce(p_limit, 20), 1), 50); rows jsonb; me jsonb; pid bigint; mine bigint;
begin
  col := case p_stat when 'level' then 'level' when 'kills' then 'kills' when 'gold' then 'gold' when 'bosses' then 'bosses' when 'raids' then 'raids'
                     when 'wave0' then 'w0' when 'wave1' then 'w1' when 'wave2' then 'w2' when 'wave3' then 'w3' when 'wave4' then 'w4' when 'wave5' then 'w5' end;
  if col is null then return jsonb_build_object('ok', false, 'error', 'bad_stat'); end if;
  execute format($q$
    select coalesce(jsonb_agg(jsonb_build_object('rank', r, 'nick', nick, 'cls', cls, 'value', v, 'lv', lv, 'skin', skin, 'title', title, 'gtag', gtag, 'gcol', gcol, 'gender', gender, 'country', country) order by r), '[]'::jsonb) from (
      select nick, cls, gender, country, level as lv, coalesce((build->>'skin')::int, 0) as skin, build->>'title' as title,
        (select g.tag from gog.guild_members gm join gog.guilds g on g.id = gm.guild_id where gm.root = gog.players.id) as gtag,
        (select g.color from gog.guild_members gm join gog.guilds g on g.id = gm.guild_id where gm.root = gog.players.id) as gcol, %1$I::bigint as v, rank() over (order by %1$I desc, updated_at asc) as r
      from gog.players where active and %1$I > 0 order by %1$I desc, updated_at asc limit %2$s) s$q$, col, lim) into rows;
  pid := gog._auth(p_token);
  if pid is not null then
    execute format('select %I::bigint from gog.players where id = $1', col) into mine using pid;
    if mine > 0 then
      execute format('select jsonb_build_object(''rank'', 1 + count(*), ''value'', $2::bigint) from gog.players where active and %I > $2', col) into me using pid, mine;
    end if;
  end if;
  return jsonb_build_object('ok', true, 'rows', rows, 'me', me);
end $$;

create or replace function public.gog_save_put(p_token text, p_save jsonb, p_rev int, p_dev text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; newrev int; c text; reason text; banned boolean; pts numeric;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_save is null or jsonb_typeof(p_save) <> 'object' or not (p_save ? 'cls') or p_rev is null then
    return jsonb_build_object('ok', false, 'error', 'bad_data');
  end if;
  if length(p_save::text) > 600000 then return jsonb_build_object('ok', false, 'error', 'too_big'); end if;
  select * into v from gog.players where id = pid for update;
  if p_rev <> v.save_rev then
    return jsonb_build_object('ok', false, 'error', 'conflict', 'rev', v.save_rev, 'dev', v.save_dev);
  end if;
  if v.save_at is not null and v.save_at > now() - interval '3 seconds' then
    return jsonb_build_object('ok', false, 'error', 'slow');
  end if;
  -- uma conta sem save so pode comecar com um personagem novo (nivel 1 ou 2, quase sem ouro): impede levar o progresso de outra conta
  if v.save is null and ((p_save->'pl'->>'lv') !~ '^[0-9]{1,6}$' or (p_save->'pl'->>'lv')::int > 2 or coalesce(p_save->>'gold', '0') !~ '^[0-9]{1,9}$' or coalesce(p_save->>'gold', '0')::bigint > 2000 or coalesce(p_save->>'gems', '0') !~ '^[0-9]{1,6}$' or coalesce(p_save->>'gems', '0')::int > 50) then
    return jsonb_build_object('ok', false, 'error', 'not_new');
  end if;
  -- cada personagem tem uma classe fixa e a conta so pode ter uma de cada classe
  c := p_save->>'cls';
  if c is null or c not in ('knight', 'archer', 'mage') then return jsonb_build_object('ok', false, 'error', 'bad_data'); end if;
  if v.char_cls is null then
    if exists (select 1 from gog.players o where coalesce(o.owner, o.id) = coalesce(v.owner, v.id) and o.id <> v.id and o.char_cls = c) then
      return jsonb_build_object('ok', false, 'error', 'class_taken');
    end if;
  elsif v.char_cls <> c then
    return jsonb_build_object('ok', false, 'error', 'wrong_class', 'cls', v.char_cls);
  end if;
  -- anti-batota: valores impossiveis, conquistas sem prova e titulos que nao ganhaste
  reason := gog._check_save(v.save, p_save, least(greatest(extract(epoch from now() - coalesce(v.save_at, now() - interval '3 seconds')), 3), 7 * 86400), coalesce(v.owner, v.id));
  if reason is not null then
    banned := gog._violation(pid, reason, reason);
    return jsonb_build_object('ok', false, 'error', case when banned then 'banned' else 'cheat' end);
  end if;
  update gog.players set save = p_save, char_cls = coalesce(char_cls, c), save_rev = save_rev + 1, save_at = now(), save_dev = left(p_dev, 32) where id = pid returning save_rev into newrev;
  if v.save is not null then   -- guilda: os mobs, bosses e raids novos (ja validados acima) dao pontos a guilda
    pts := greatest(0, gog._n(p_save, 'stats', 'kills') - gog._n(v.save, 'stats', 'kills')) + 10 * greatest(0, gog._n(p_save, 'stats', 'bosses') - gog._n(v.save, 'stats', 'bosses')) + 60 * greatest(0, gog._raids_total(p_save) - gog._raids_total(v.save));
    if pts > 0 then perform gog._gcontrib(v.id, pts); end if;
  end if;
  return jsonb_build_object('ok', true, 'rev', newrev);
end $$;

create or replace function public.gog_profile(p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v gog.players;
begin
  if p_nick is null or p_nick !~ '^[A-Za-z0-9_]{3,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_nick'); end if;
  select * into v from gog.players where nick_key = lower(p_nick) and active;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  return jsonb_build_object('ok', true, 'nick', v.nick, 'cls', v.cls, 'level', v.level, 'kills', v.kills, 'gold', v.gold, 'bosses', v.bosses, 'raids', v.raids,
    'waves', jsonb_build_array(v.w0, v.w1, v.w2, v.w3, v.w4, v.w5), 'build', v.build, 'gender', v.gender, 'country', v.country,
    'guild', (select jsonb_build_object('id', g.id, 'name', g.name, 'tag', g.tag, 'color', g.color, 'emblem', g.emblem) from gog.guild_members gm join gog.guilds g on g.id = gm.guild_id where gm.root = v.id),
    'account', (select o.nick from gog.players o where o.id = v.owner));   -- personagens extra mostram a conta principal
end $$;

create or replace function public.gog_guild_get(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; gid bigint; cd double precision;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select guild_id into gid from gog.guild_members where root = v_root;
  if gid is null then
    select greatest(0, extract(epoch from l.at + interval '24 hours' - now())) into cd from gog.guild_left l where l.root = v_root;
    return jsonb_build_object('ok', true, 'guild', null, 'cooldown', coalesce(cd, 0)::int);
  end if;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(gid, v_root));
end $$;

create or replace function public.gog_guild_create(p_token text, p_name text, p_tag text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; v_root bigint; nm text := btrim(coalesce(p_name, '')); tg text := btrim(coalesce(p_tag, '')); gid bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  if v.guild_at is not null and v.guild_at > now() - interval '2 seconds' then return jsonb_build_object('ok', false, 'error', 'slow'); end if;
  update gog.players set guild_at = now() where id = pid;
  v_root := v.id;   -- cada personagem (classe) e um membro separado da guilda
  if exists (select 1 from gog.guild_members where root = v_root) then return jsonb_build_object('ok', false, 'error', 'in_guild'); end if;
  if exists (select 1 from gog.guild_left where root = v_root and at > now() - interval '24 hours') then return jsonb_build_object('ok', false, 'error', 'cooldown'); end if;
  if nm !~ '^[A-Za-z0-9][A-Za-z0-9 _-]{1,14}[A-Za-z0-9]$' or tg !~ '^[A-Za-z0-9]{2,4}$' then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  if not gog._text_ok(nm) or not gog._text_ok(tg) or not gog._text_ok(nm || tg) then return jsonb_build_object('ok', false, 'error', 'bad_word'); end if;
  -- os requisitos veem-se no save guardado na nuvem (o jogo guarda antes de pedir)
  if gog._n(v.save, 'pl', 'lv') < 40 then return jsonb_build_object('ok', false, 'error', 'need_level'); end if;
  if gog._n(v.save, 'gold') < 15000 then return jsonb_build_object('ok', false, 'error', 'need_gold'); end if;
  if gog._n(v.save, 'gems') < 100 then return jsonb_build_object('ok', false, 'error', 'need_gems'); end if;
  begin
    insert into gog.guilds (name, name_key, tag, tag_key, leader) values (nm, lower(nm), upper(tg), lower(tg), v_root) returning id into gid;
  exception when unique_violation then return jsonb_build_object('ok', false, 'error', 'name_taken');
  end;
  insert into gog.guild_members (root, guild_id) values (v_root, gid);
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(gid, v_root));
end $$;

create or replace function public.gog_guild_join(p_token text, p_guild bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v gog.players; v_root bigint; n int;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  select * into v from gog.players where id = pid for update;
  if v.guild_at is not null and v.guild_at > now() - interval '2 seconds' then return jsonb_build_object('ok', false, 'error', 'slow'); end if;
  update gog.players set guild_at = now() where id = pid;
  v_root := v.id;   -- cada personagem (classe) e um membro separado da guilda
  if exists (select 1 from gog.guild_members where root = v_root) then return jsonb_build_object('ok', false, 'error', 'in_guild'); end if;
  if exists (select 1 from gog.guild_left where root = v_root and at > now() - interval '24 hours') then return jsonb_build_object('ok', false, 'error', 'cooldown'); end if;
  if gog._n(v.save, 'pl', 'lv') < 10 then return jsonb_build_object('ok', false, 'error', 'need_level_join'); end if;
  perform 1 from gog.guilds where id = p_guild for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select count(*) into n from gog.guild_members where guild_id = p_guild;
  if n >= 10 then return jsonb_build_object('ok', false, 'error', 'full'); end if;
  insert into gog.guild_members (root, guild_id) values (v_root, p_guild);
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(p_guild, v_root));
end $$;

create or replace function public.gog_guild_leave(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; gid bigint; g gog.guilds; nl bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select guild_id into gid from gog.guild_members where root = v_root;
  if gid is null then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  select * into g from gog.guilds where id = gid for update;
  delete from gog.guild_members where root = v_root;
  insert into gog.guild_left (root, at) values (v_root, now()) on conflict (root) do update set at = now();
  if g.leader = v_root then   -- o lider sai: passa para quem mais contribuiu; sem membros a guilda desaparece
    select root into nl from gog.guild_members where guild_id = gid order by contrib desc, joined_at limit 1;
    if nl is null then delete from gog.guilds where id = gid; else update gog.guilds set leader = nl where id = gid; end if;
  end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.gog_guild_kick(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; t bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  select m.root into t from gog.guild_members m join gog.players p on p.id = m.root where m.guild_id = g.id and p.nick_key = lower(coalesce(p_nick, ''));
  if t is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if t = v_root then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  delete from gog.guild_members where root = t;
  insert into gog.guild_left (root, at) values (t, now()) on conflict (root) do update set at = now();
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_transfer(p_token text, p_nick text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; t bigint;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  select m.root into t from gog.guild_members m join gog.players p on p.id = m.root where m.guild_id = g.id and p.nick_key = lower(coalesce(p_nick, ''));
  if t is null or t = v_root then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  update gog.guilds set leader = t where id = g.id;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_upgrade(p_token text, p_perk text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; info jsonb;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if p_perk is null or p_perk not in ('xp', 'gold', 'drop', 'attr') then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root for update of g2;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  if gog._glevel(g.xp) - (g.p_xp + g.p_gold + g.p_drop + g.p_attr) < 1 then return jsonb_build_object('ok', false, 'error', 'no_points'); end if;
  if (case p_perk when 'xp' then g.p_xp when 'gold' then g.p_gold when 'drop' then g.p_drop else g.p_attr end) >= 10 then return jsonb_build_object('ok', false, 'error', 'maxed'); end if;
  update gog.guilds set p_xp = p_xp + (p_perk = 'xp')::int, p_gold = p_gold + (p_perk = 'gold')::int, p_drop = p_drop + (p_perk = 'drop')::int, p_attr = p_attr + (p_perk = 'attr')::int where id = g.id;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_style(p_token text, p_color int, p_emblem int, p_motto text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; v_root bigint; g gog.guilds; mt text := btrim(coalesce(p_motto, ''));
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
  select g2.* into g from gog.guilds g2 join gog.guild_members m on m.guild_id = g2.id where m.root = v_root for update of g2;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_guild'); end if;
  if g.leader <> v_root then return jsonb_build_object('ok', false, 'error', 'not_leader'); end if;
  if p_color is null or p_color < 0 or p_color > 7 or p_emblem is null or p_emblem < 0 or p_emblem > 11 then return jsonb_build_object('ok', false, 'error', 'bad_request'); end if;
  if length(mt) > 40 or mt !~ '^[A-Za-z0-9 .,!?_''-]*$' then return jsonb_build_object('ok', false, 'error', 'bad_name'); end if;
  if mt <> '' and not gog._text_ok(mt) then return jsonb_build_object('ok', false, 'error', 'bad_word'); end if;
  update gog.guilds set color = p_color, emblem = p_emblem, motto = mt where id = g.id;
  return jsonb_build_object('ok', true, 'guild', gog._ginfo(g.id, v_root));
end $$;

create or replace function public.gog_guild_board(p_token text default null, p_offset int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare rows jsonb; mine bigint; v_root bigint; pid bigint;
begin
  select coalesce(jsonb_agg(jsonb_build_object('rank', s.r, 'id', s.id, 'name', s.name, 'tag', s.tag, 'level', s.lv, 'members', s.n, 'color', s.color, 'emblem', s.emblem, 'xp', s.xp) order by s.r), '[]'::jsonb) into rows from (
    select g.id, g.name, g.tag, g.xp, g.color, g.emblem, gog._glevel(g.xp) as lv, (select count(*) from gog.guild_members m where m.guild_id = g.id) as n, rank() over (order by g.xp desc, g.id) as r
    from gog.guilds g order by g.xp desc, g.id limit 14 offset greatest(coalesce(p_offset, 0), 0)) s;
  pid := gog._auth(p_token);
  if pid is not null then
    v_root := pid;   -- cada personagem (classe) e um membro separado da guilda
    select guild_id into mine from gog.guild_members where root = v_root;
  end if;
  return jsonb_build_object('ok', true, 'rows', rows, 'mine', mine);
end $$;

-- ----------------------------------------------------------------------------------------------
-- update-save-epoch.sql  (epoca do save (o save local antigo nunca substitui o do servidor))
-- ----------------------------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------------------------
-- update-profile-truth.sql  (perfil publico a partir do save do servidor)
-- ----------------------------------------------------------------------------------------------
-- O perfil publico passava a mostrar o que o CLIENTE envia (e o nivel nunca descia: level = greatest(level, ...)), por isso um save adulterado
-- repunha os valores falsos a cada envio. Agora gog_submit usa o save guardado no servidor: atributos e nivel da arma vem do save, e o nivel
-- enviado nunca passa do nivel do save. Corre no SQL Editor do Supabase.

-- o perfil publico usa o save VERIFICADO no servidor (atributos e nivel da arma), nunca o que o cliente diz
create or replace function gog._truth_build(nb jsonb, sv jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare a jsonb; wid text;
begin
  if nb is null or sv is null then return nb; end if;
  a := sv->'attr';
  if jsonb_typeof(a) = 'object' then
    nb := nb || jsonb_build_object('attr', jsonb_build_object('vit', least(greatest(gog._n(a, 'vit'), 0), 99999)::int, 'str', least(greatest(gog._n(a, 'str'), 0), 99999)::int,
                                                              'agi', least(greatest(gog._n(a, 'agi'), 0), 99999)::int, 'per', least(greatest(gog._n(a, 'per'), 0), 99999)::int));
  end if;
  wid := nb->'weapon'->>'id';
  if wid is not null and jsonb_typeof(sv->'wl') = 'object' then nb := jsonb_set(nb, '{weapon,lv}', to_jsonb(least(greatest(gog._n(sv->'wl', wid), 0), 20)::int)); end if;
  return nb;
end $$;

do $$
declare def text; a1 text := E'  first_time := v.submitted_at is null;
'; a2 text := E'  nb := gog._clean_build(p->''build'');
';
begin
  def := pg_get_functiondef('public.gog_submit(text,jsonb)'::regprocedure);
  if position('gog._truth_build' in def) = 0 and position(a1 in def) > 0 and position(a2 in def) > 0 then
    def := replace(def, a1, a1 || E'  if v.save is not null then n_level := least(n_level, greatest(1, gog._n(v.save, ''pl'', ''lv''))::int); end if;
');
    def := replace(def, a2, a2 || E'  nb := gog._truth_build(nb, v.save);
');
    execute def;
  end if;
end $$;

-- depois de corrigires o save de alguem, repoe tambem o perfil (nivel e build):
--   update gog.players set level = 71, build = jsonb_set(jsonb_set(coalesce(build, '{}'::jsonb) - 'title', '{attr}', '{"vit":0,"str":156,"agi":0,"per":0}'::jsonb), '{weapon,lv}', '11'::jsonb) where nick = 'GrysHGG';

-- ----------------------------------------------------------------------------------------------
-- update-ranking-truth.sql  (ranking a partir do save do servidor)
-- ----------------------------------------------------------------------------------------------
-- O ranking (nivel, abates, ouro, bosses, raids, ondas) vinha do que o CLIENTE envia e so podia subir (greatest), por isso um save local adulterado
-- ficava no ranking mesmo depois de corrigires o save no servidor. Agora gog_submit usa o save guardado no servidor e o ranking pode descer.
-- Corre no SQL Editor do Supabase.
do $$
declare def text; a1 text := E'  first_time := v.submitted_at is null;
'; ov text; r text[]; i int;
begin
  ov := $o$  if v.save is not null then   -- o ranking usa o save verificado no servidor, nunca o que o cliente diz (e pode descer, nao so subir)
    n_level := greatest(1, gog._n(v.save, 'pl', 'lv'))::int; n_kills := gog._n(v.save, 'stats', 'kills')::bigint; n_gold := gog._n(v.save, 'stats', 'gold')::bigint;
    n_bosses := gog._n(v.save, 'stats', 'bosses')::int; n_raids := gog._raids_total(v.save)::int;
    n_w := array[gog._nv(gog._idx(v.save->'farmBest', 0))::int, gog._nv(gog._idx(v.save->'farmBest', 1))::int, gog._nv(gog._idx(v.save->'farmBest', 2))::int, gog._nv(gog._idx(v.save->'farmBest', 3))::int, gog._nv(gog._idx(v.save->'farmBest', 4))::int, gog._nv(gog._idx(v.save->'farmBest', 5))::int];
  end if;
$o$;
  def := pg_get_functiondef('public.gog_submit(text,jsonb)'::regprocedure);
  if position('o ranking usa o save verificado' in def) = 0 and position(a1 in def) > 0 then
    def := replace(def, a1, a1 || ov);
    def := replace(def, 'level = greatest(level, n_level)', 'level = n_level');
    def := replace(def, 'kills = greatest(kills, n_kills)', 'kills = n_kills');
    def := replace(def, 'gold = greatest(gold, n_gold)', 'gold = n_gold');
    def := replace(def, 'bosses = greatest(bosses, n_bosses)', 'bosses = n_bosses');
    def := replace(def, 'raids = greatest(raids, n_raids)', 'raids = n_raids');
    for i in 0..5 loop def := replace(def, 'w' || i || ' = greatest(w' || i || ', n_w[' || (i + 1) || '])', 'w' || i || ' = n_w[' || (i + 1) || ']'); end loop;
    execute def;
  end if;
end $$;

-- repor JA a linha do ranking de alguem a partir do save (exemplo: GrysHGG), sem esperar pelo proximo envio:
--   update gog.players set level = greatest(1, (save->'pl'->>'lv')::int), kills = coalesce((save->'stats'->>'kills')::bigint, 0), gold = coalesce((save->'stats'->>'gold')::bigint, 0), bosses = coalesce((save->'stats'->>'bosses')::int, 0) where nick = 'GrysHGG';

-- ----------------------------------------------------------------------------------------------
-- anti-cheat LIGADO (desfaz o anticheat-off.sql; se ja estiver ligado nao faz nada)
-- ----------------------------------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'gog' and p.proname = '_check_save_real') then
    drop function if exists gog._check_save(jsonb, jsonb, double precision, bigint);
    alter function gog._check_save_real(jsonb, jsonb, double precision, bigint) rename to _check_save;
  end if;
end $$;

-- ----------------------------------------------------------------------------------------------
-- corrigir o GrysHGG: nivel 71, arma +11, vida 0, forca 156, sem ouro/diamantes/gasto/conquistas, nova epoca (o save local dele deixa de valer),
-- e perfil publico + ranking repostos
-- ----------------------------------------------------------------------------------------------
update gog.players set
  level = 71,
  build = jsonb_set(jsonb_set(coalesce(build, '{}'::jsonb) - 'title', '{attr}', '{"vit":0,"str":156,"agi":0,"per":0}'::jsonb), '{weapon,lv}', '11'::jsonb),
  save = jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(jsonb_set(save,
      '{pl,lv}', '71'::jsonb),
      '{pl,xp}', '0'::jsonb),
      '{attr}', '{"str":156,"vit":0,"per":0,"agi":0}'::jsonb),
      '{pts}', '54'::jsonb),
      '{buyN}', '0'::jsonb),
      '{gold}', '0'::jsonb),
      '{gems}', '0'::jsonb),
      '{stats,spent}', '0'::jsonb),
      '{ach}', '{}'::jsonb),
      '{title}', '""'::jsonb),
      '{wl}', coalesce((select jsonb_object_agg(t.k, case when t.v ~ '^[0-9]+$' then least(t.v::numeric, 11) else 0 end)
                        from jsonb_each_text(case when jsonb_typeof(save->'wl') = 'object' then save->'wl' else '{}'::jsonb end) t(k, v)), '{}'::jsonb)),
      '{ep}', to_jsonb(coalesce((save->>'ep')::int, 0) + 1)),
  save_rev = save_rev + 1
where nick = 'GrysHGG';

-- verificacao (deve mostrar nivel 71, atributos 0/156/0/0, ouro 0, diamantes 0, epoca +1)
select nick, level, save->'pl' as pl, save->'attr' as atributos, save->>'pts' as pts, save->>'gold' as ouro, save->>'gems' as diamantes,
       save->'stats'->>'spent' as gasto, save->'wl' as armas, save->'ach' as conquistas, save->>'ep' as epoca, build->'attr' as attr_perfil, build->'weapon' as arma_perfil
from gog.players where nick = 'GrysHGG';
