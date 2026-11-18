-- Codigo promocional "backpack": desbloqueia as 5 mochilas de graca, ate ao fim do dia 21 de novembro de 2026 (hora de Portugal).
-- Tambem acrescenta aos codigos: mochilas (bags) e data de fim (expires_at). Corre no SQL Editor do Supabase.
alter table gog.promo add column if not exists bags int not null default 0;   -- mochilas desbloqueadas pelo codigo (ate 5)
alter table gog.promo add column if not exists expires_at timestamptz;          -- depois disto o codigo deixa de funcionar
create or replace function public.gog_redeem(p_token text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare pid bigint; root bigint; pr gog.promo; k text := lower(btrim(coalesce(p_code, ''))); newrev int; nb int := 0;
begin
  pid := gog._auth(p_token);
  if pid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  if k !~ '^[a-z0-9_]{1,16}$' then return jsonb_build_object('ok', false, 'error', 'bad_code'); end if;
  select * into pr from gog.promo where code = k;
  if not found then return jsonb_build_object('ok', false, 'error', 'bad_code'); end if;
  if pr.expires_at is not null and now() >= pr.expires_at then return jsonb_build_object('ok', false, 'error', 'expired'); end if;
  select coalesce(owner, id) into root from gog.players where id = pid;   -- a conta e o personagem principal: todos os personagens partilham o mesmo uso
  begin
    insert into gog.promo_used (root, code) values (root, k);
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'used');
  end;
  if pr.bags > 0 then   -- mochilas gratis: o servidor muda o save de todos os personagens da conta (o jogo nao pode subir bagSlots sozinho)
    nb := least(5, pr.bags);
    update gog.players set save = jsonb_set(save, '{bagSlots}', to_jsonb(greatest(nb, coalesce(gog._n(save, 'bagSlots'), 1)::int))), save_rev = save_rev + 1
     where coalesce(owner, id) = root and save is not null and jsonb_typeof(save) = 'object';
    select save_rev into newrev from gog.players where id = pid;
  end if;
  return jsonb_build_object('ok', true, 'gems', pr.gems, 'title', pr.title, 'bags', nb, 'rev', newrev);
end $$;
do $$
declare f text := 'public.gog_redeem(text,text)';
begin
  execute format('revoke all on function %s from public', f);
  if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', f); execute format('grant execute on function %s to anon', f); end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', f); execute format('grant execute on function %s to authenticated', f); end if;
end $$;
insert into gog.promo (code, gems, title, bags, expires_at) values ('backpack', 0, null, 5, timestamptz '2026-11-22 00:00:00 Europe/Lisbon')
  on conflict (code) do update set bags = excluded.bags, expires_at = excluded.expires_at;
