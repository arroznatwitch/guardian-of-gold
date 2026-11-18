-- Limite de contas por rede (IP): 5 -> 20. Corre no SQL Editor do Supabase.
do $$
declare d text;
begin
  d := pg_get_functiondef((select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'gog_register' limit 1));
  if position('reg_ip = iph) >= 5 then' in d) = 0 then raise notice 'gog_register: limite ja alterado ou nao encontrado'; return; end if;
  d := replace(d, 'reg_ip = iph) >= 5 then', 'reg_ip = iph) >= 20 then');
  d := replace(d, 'no maximo 5 contas por rede', 'no maximo 20 contas por rede');
  execute d;
end $$;
