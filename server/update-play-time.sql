-- Tempo de jogo (save.pt, em segundos) controlado pelo servidor.
-- O jogo conta o tempo e envia-o no save, mas o servidor nunca deixa o valor subir mais do que o tempo real
-- que passou desde o ultimo save (+60 s de folga). Se alguem alterar o valor, fica cortado, sem ban.
-- Funciona com qualquer versao do gog_save_put (e um trigger na tabela). Corre no SQL Editor do Supabase.
create or replace function gog._save_pt() returns trigger
language plpgsql security definer set search_path = '' as $$
declare o numeric; n numeric; lim numeric;
begin
  if new.save is null or jsonb_typeof(new.save) <> 'object' then return new; end if;
  o := case when old.save is not null and jsonb_typeof(old.save->'pt') = 'number' then greatest((old.save->>'pt')::numeric, 0) else 0 end;
  n := case when jsonb_typeof(new.save->'pt') = 'number' then greatest((new.save->>'pt')::numeric, 0) else o end;
  lim := o + greatest(extract(epoch from now() - coalesce(old.save_at, now())), 0) + 60;
  if n > lim then n := lim; end if;
  new.save := jsonb_set(new.save, '{pt}', to_jsonb(round(n)));
  return new;
end $$;
revoke all on function gog._save_pt() from public, anon, authenticated;
drop trigger if exists save_pt on gog.players;
create trigger save_pt before update of save on gog.players for each row execute function gog._save_pt();
