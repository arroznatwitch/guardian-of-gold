-- Versao minima do jogo: gog.config min_build; gog_save_put recusa saves mais antigos com 'update' (a linha e injetada, para nao apagar outras verificacoes ja aplicadas a funcao).
-- versao minima do jogo: saves de versoes mais antigas sao recusados com 'update' (o jogo recarrega para a versao nova).
-- Muda-se com uma migracao: update gog.config set v = '80' where k = 'min_build';
create table if not exists gog.config (k text primary key, v text not null);
alter table gog.config enable row level security; revoke all on gog.config from public;
insert into gog.config (k, v) values ('min_build', '0') on conflict (k) do nothing;
create or replace function gog._min_build() returns int
language sql stable security definer set search_path = '' as $$ select coalesce((select case when v ~ '^[0-9]{1,6}$' then v::int end from gog.config where k = 'min_build'), 0) $$;
revoke all on function gog._min_build() from public;

do $$
declare def text; a text := E'  if length(p_save::text) > 600000'; chk text := E'  if coalesce(gog._n(p_save, ''bld''), 0) < gog._min_build() then return jsonb_build_object(''ok'', false, ''error'', ''update'', ''min'', gog._min_build()); end if;   -- versao antiga do jogo: tem de recarregar\n';
begin
  def := pg_get_functiondef('public.gog_save_put(text,jsonb,integer,text)'::regprocedure);
  if position('_min_build' in def) = 0 and position(a in def) > 0 then execute replace(def, a, chk || a); end if;
end $$;
