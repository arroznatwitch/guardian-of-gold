-- VOLTAR A LIGAR O ANTI-CHEAT (desfaz server/anticheat-off.sql)
drop function if exists gog._check_save(jsonb, jsonb, double precision, bigint);
alter function gog._check_save_real(jsonb, jsonb, double precision, bigint) rename to _check_save;
