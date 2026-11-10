// Testa as regras de seguranca de supabase.sql contra um Postgres em memoria (PGlite).
// Uso: npm i @electric-sql/pglite && node test-sql.mjs
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import fs from 'fs';
const db = new PGlite({ extensions: { pgcrypto } });
await db.exec("create role anon nologin; create role authenticated nologin; create schema extensions; grant usage on schema public to anon, authenticated;");
await db.exec('create extension pgcrypto with schema extensions;');
await db.exec(fs.readFileSync(new URL('./supabase.sql', import.meta.url), 'utf8'));
await db.exec("grant usage on schema extensions to anon, authenticated;");
const P = c => c.repeat(64), A = P('a'), B = P('b');
const q = async (sql, params) => { const r = await db.query(sql, params); return r.rows[0] && Object.values(r.rows[0])[0]; };
let fail = 0; const ok = (name, cond, extra) => { console.log((cond ? 'PASS ' : 'FAIL ') + name, cond ? '' : JSON.stringify(extra)); if (!cond) fail++; };
await db.exec('set role anon');
let t0 = Date.now();
let r = await q('select public.gog_register($1,$2)', ['Rui_99', A]); ok('register', r.ok && r.token.length === 64, r); const tok = r.token; console.log('  register ms', Date.now() - t0);
r = await q('select public.gog_register($1,$2)', ['rui_99', B]); ok('dup nick case-insens', !r.ok && r.error === 'nick_taken', r);
r = await q('select public.gog_register($1,$2)', ['a b', B]); ok('bad nick', r.error === 'bad_nick', r);
r = await q('select public.gog_register($1,$2)', ['ok_nick', 'short']); ok('bad proof', r.error === 'bad_request', r);
r = await q('select public.gog_register($1,$2)', ['admin', B]); ok('reserved', r.error === 'nick_taken', r);
r = await q('select public.gog_login($1,$2)', ['RUI_99', A]); ok('login ok', r.ok && r.token.length === 64, r);
r = await q('select public.gog_login($1,$2)', ['rui_99', B]); ok('login wrong', !r.ok && r.error === 'bad_login', r);
r = await q('select public.gog_login($1,$2)', ['nobody', B]); ok('login unknown same error', !r.ok && r.error === 'bad_login', r);
for (let i = 0; i < 4; i++) await q('select public.gog_login($1,$2)', ['rui_99', B]);
r = await q('select public.gog_login($1,$2)', ['rui_99', A]); ok('locked after 5 fails even with right pw', !r.ok && r.error === 'locked' && r.wait > 0, r);
await db.exec('reset role'); await db.exec("update gog.players set locked_until = now() - interval '1 second'"); await db.exec('set role anon');
r = await q('select public.gog_login($1,$2)', ['rui_99', A]); ok('unlocked login', r.ok, r);
const tok2 = r.token;
// direct table access must fail
let denied = false; try { await db.query('select * from gog.players'); } catch (e) { denied = true; } ok('anon cannot read tables', denied);
denied = false; try { await db.query('select * from gog.sessions'); } catch (e) { denied = true; } ok('anon cannot read sessions', denied);
denied = false; try { await db.query("select gog._auth('x')"); } catch (e) { denied = true; } ok('anon cannot call internal fn', denied);
const S = (o) => JSON.stringify({ cls: 'mage', level: 20, kills: 900, gold: 120000, bosses: 4, raids: 1, w0: 12, w1: 3, w2: 0, w3: 0, w4: 0, w5: 0, ...o });
r = await q('select public.gog_submit($1,$2::jsonb)', [tok2, S({})]); ok('submit first', r.ok, r);
r = await q('select public.gog_submit($1,$2::jsonb)', [tok2, S({ level: 21 })]); ok('submit too fast', r.error === 'slow', r);
await db.exec('reset role'); await db.exec("update gog.players set submitted_at = now() - interval '5 minutes'"); await db.exec('set role anon');
r = await q('select public.gog_submit($1,$2::jsonb)', [tok2, S({ level: 400 })]); ok('implausible level jump', r.error === 'implausible', r);
r = await q('select public.gog_submit($1,$2::jsonb)', [tok2, S({ level: 26, kills: 1500, w0: 15 })]); ok('submit plausible', r.ok, r);
await db.exec('reset role'); await db.exec("update gog.players set submitted_at = now() - interval '5 minutes'"); await db.exec('set role anon');
r = await q('select public.gog_submit($1,$2::jsonb)', [tok2, S({ level: 10, kills: 10, gold: 1, w0: 1 })]); ok('lower values accepted but never decrease', r.ok, r);
r = await q('select public.gog_board($1,10,$2)', ['level', tok2]); ok('board level keeps max', r.ok && r.rows[0].value === 26 && r.me.rank === 1, r);
r = await q('select public.gog_submit($1,$2::jsonb)', ['f'.repeat(64), S({})]); ok('bad token', r.error === 'auth', r);
r = await q('select public.gog_submit($1,$2::jsonb)', [tok2, '{"level":"x"}']); ok('bad data', r.error === 'bad_data' || r.error === 'slow', r);
r = await q('select public.gog_board($1)', ['kills; drop table gog.players']); ok('stat injection rejected', r.error === 'bad_stat', r);
r = await q('select public.gog_board($1)', ['wave0']); ok('board wave0', r.ok && r.rows[0].nick === 'Rui_99' && r.rows[0].value === 15, r);
r = await q('select public.gog_logout($1)', [tok]); ok('logout', r.ok, r);
r = await q('select public.gog_submit($1,$2::jsonb)', [tok, S({})]); ok('token dead after logout', r.error === 'auth', r);
let gone = false; try { await db.query("select public.gog_delete('x','y')"); } catch (e) { gone = true; } ok('gog_delete no longer exists', gone);
{ // contas desativadas: so o administrador (role privilegiado) mexe
  await db.exec('reset role'); await db.exec("select gog.set_active('rui_99', false)"); await db.exec('set role anon');
  r = await q('select public.gog_login($1,$2)', ['rui_99', A]); ok('inactive account cannot log in', !r.ok && r.error === 'inactive', r);
  r = await q('select public.gog_login($1,$2)', ['rui_99', B]); ok('inactive account with wrong password is just bad login', r.error === 'bad_login', r);
  r = await q('select public.gog_save_get($1)', [tok2]); ok('old session of inactive account is dead', !r.ok, r);
  r = await q('select public.gog_profile($1)', ['rui_99']); ok('inactive profile hidden', r.error === 'not_found', r);
  r = await q('select public.gog_register($1,$2)', ['RUI_99', B]); ok('inactive nick stays reserved', r.error === 'nick_taken', r);
  let d4 = false; try { await db.query("select gog.set_active('rui_99', true)"); } catch (e) { d4 = true; } ok('anon cannot call set_active', d4);
  await db.exec('reset role'); await db.exec("select gog.set_active('rui_99', true)"); await db.exec('set role anon');
  r = await q('select public.gog_login($1,$2)', ['rui_99', A]); ok('reactivated account logs in again', r.ok, r);
}
r = await q('select public.gog_nick_free($1)', ['rui_99']); ok('nick stays reserved after deactivation', r.free === false, r);
// save na nuvem
{
  r = await q('select public.gog_register($1,$2)', ['saver', A]); const T1 = r.token;
  const SAVE = JSON.stringify({ cls: 'knight', gold: 5, pl: { lv: 3 } });
  r = await q('select public.gog_save_get($1)', [T1]); ok('save get empty', r.ok && r.save === null && r.rev === 0, r);
  r = await q('select public.gog_save_put($1,$2::jsonb,0,$3)', [T1, SAVE, 'devA']); ok('save put', r.ok && r.rev === 1, r);
  r = await q('select public.gog_save_put($1,$2::jsonb,1,$3)', [T1, SAVE, 'devA']); ok('save put too fast', r.error === 'slow', r);
  await db.exec('reset role'); await db.exec("update gog.players set save_at = now() - interval '1 minute'"); await db.exec('set role anon');
  r = await q('select public.gog_save_put($1,$2::jsonb,0,$3)', [T1, SAVE, 'devB']); ok('save conflict on stale rev', r.error === 'conflict' && r.rev === 1 && r.dev === 'devA', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,1,$3)', [T1, '{"gold":1}', 'devA']); ok('save needs cls', r.error === 'bad_data', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,1,$3)', [T1, '[1,2]', 'devA']); ok('save must be object', r.error === 'bad_data', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,1,$3)', [T1, JSON.stringify({ cls: 'mage', pad: 'x'.repeat(700000) }), 'devA']); ok('save size limit', r.error === 'too_big', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,1,$3)', ['f'.repeat(64), SAVE, 'devA']); ok('save put needs auth', r.error === 'auth', r);
  r = await q('select public.gog_save_get($1)', [T1]); ok('save get returns data', r.ok && r.save.gold === 5 && r.rev === 1, r);
  r = await q('select public.gog_save_reset($1)', [T1]); ok('save reset', r.ok && r.rev === 2, r);
  r = await q('select public.gog_save_get($1)', [T1]); ok('save empty after reset', r.save === null, r);
}
// build publica e perfil
{
  r = await q('select public.gog_register($1,$2)', ['builder', A]); const TB = r.token;
  const BUILD = { skin: 2, weapon: { id: 'm_fire', lv: 3, st: 1 }, attr: { vit: 12, str: 99999999, agi: 3, per: 4, evil: 1 },
    gear: { head: { r: 3, e: 5, st: 1, sp: 'Ígneo<script>' }, weapon: { r: 4 }, chest: { r: 99, e: -4 } }, junk: 'x'.repeat(50) };
  const SB = JSON.stringify({ cls: 'mage', level: 10, kills: 100, gold: 500, bosses: 1, raids: 0, w0: 4, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, build: BUILD });
  r = await q('select public.gog_submit($1,$2::jsonb)', [TB, SB]); ok('submit with build', r.ok, r);
  r = await q('select public.gog_profile($1)', ['BUILDER']); const bd = r.build;
  ok('profile returns cleaned build', r.ok && r.cls === 'mage' && r.level === 10 && bd.skin === 2 && bd.weapon.id === 'm_fire' && bd.attr.str === 99999 && !('evil' in bd.attr) && !('junk' in bd), r);
  ok('gear slots whitelisted and clamped', Object.keys(bd.gear).sort().join() === 'chest,head' && bd.gear.chest.r === 4 && bd.gear.chest.e === 0 && bd.gear.head.sp === 'Ígneoscript', bd);
  r = await q('select public.gog_board($1,5,null)', ['level']); const row = r.rows.find(x => x.nick === 'builder'); ok('board rows carry class, level and skin', row && row.cls === 'mage' && row.lv === 10 && row.skin === 2, r);
  await db.exec('reset role'); await db.exec("update gog.players set submitted_at = now() - interval '5 minutes'"); await db.exec('set role anon');
  const EVIL = JSON.stringify({ cls: 'mage', level: 10, kills: 100, gold: 500, bosses: 1, raids: 0, w0: 4, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, build: { skin: 1, weapon: { id: "x';drop table gog.players;--" } } });
  r = await q('select public.gog_submit($1,$2::jsonb)', [TB, EVIL]);
  r = await q('select public.gog_profile($1)', ['builder']); ok('invalid weapon id is dropped, skin updates', r.build.skin === 1 && !r.build.weapon, r);
  r = await q('select public.gog_profile($1)', ['nobody_here']); ok('profile of unknown nick', r.error === 'not_found', r);
  r = await q('select public.gog_profile($1)', ["a'; drop"]); ok('profile rejects bad nick', r.error === 'bad_nick', r);
  let d2 = false; try { await db.query("select gog._clean_build('{}'::jsonb)"); } catch (e) { d2 = true; } ok('anon cannot call _clean_build', d2);
  r = await q('select public.gog_save_reset($1)', [TB]); r = await q('select public.gog_profile($1)', ['builder']); ok('reset clears the build', r.build === null && r.level === 0, r);
}
// limite de 5 contas por IP
{
  await db.exec('reset role'); await db.exec("update gog.throttle set n = 0"); await db.exec('set role anon');
  const hdr = ip => db.exec(`select set_config('request.headers', '{"cf-connecting-ip":"${ip}"}', false)`);
  await hdr('203.0.113.7');
  for (let i = 1; i <= 5; i++) { r = await q('select public.gog_register($1,$2)', ['ipuser' + i, B]); ok('ip account ' + i + ' allowed', r.ok, r); }
  r = await q('select public.gog_register($1,$2)', ['ipuser6', B]); ok('6th account from same ip blocked', !r.ok && r.error === 'ip_limit', r);
  await hdr('198.51.100.9'); r = await q('select public.gog_register($1,$2)', ['ipuser7', B]); ok('other ip still allowed', r.ok, r);
  await db.exec("select set_config('request.headers', '{\"x-forwarded-for\":\"8.8.8.8, 203.0.113.7\"}', false)");
  r = await q('select public.gog_register($1,$2)', ['ipuser8', B]); ok('forwarded-for last hop counts', !r.ok && r.error === 'ip_limit', r);
  await db.exec("select set_config('request.headers', '', false)");
  r = await q('select public.gog_register($1,$2)', ['ipuser9', B]); ok('no header means no ip limit', r.ok, r);
  await db.exec('reset role'); const raw = (await db.query("select count(*)::int c from gog.players where reg_ip like '%.%' or length(reg_ip) <> 64")).rows[0].c; ok('ip is stored hashed, not raw', raw === 0); await db.exec('set role anon');
  let d3 = false; try { await db.query('select * from gog.secrets'); } catch (e) { d3 = true; } ok('anon cannot read secrets', d3);
}
// sexo e pais
{
  await db.exec('reset role'); await db.exec("update gog.throttle set n = 0"); await db.exec("select set_config('request.headers', '', false)"); await db.exec('set role anon');
  r = await q('select public.gog_register($1,$2,$3,$4)', ['gc_one', B, 'f', 'PT']); ok('register with gender and country', r.ok && r.gender === 'f' && r.country === 'PT', r); const TG = r.token;
  r = await q('select public.gog_register($1,$2,$3,$4)', ['gc_bad1', B, 'x', 'PT']); ok('bad gender rejected', r.error === 'bad_request', r);
  r = await q('select public.gog_register($1,$2,$3,$4)', ['gc_bad2', B, 'm', "pt'; drop"]); ok('bad country rejected', r.error === 'bad_request', r);
  r = await q('select public.gog_register($1,$2)', ['gc_two', B]); ok('register with defaults', r.ok && r.gender === 'm' && r.country === null, r);
  r = await q('select public.gog_profile($1)', ['gc_one']); ok('profile shows gender and country', r.gender === 'f' && r.country === 'PT', r);
  r = await q('select public.gog_set_profile($1,$2,$3)', [TG, 'm', 'BR']); ok('set profile', r.ok && r.gender === 'm' && r.country === 'BR', r);
  r = await q('select public.gog_profile($1)', ['gc_one']); ok('profile updated', r.gender === 'm' && r.country === 'BR', r);
  r = await q('select public.gog_set_profile($1,$2,$3)', ['0'.repeat(64), 'm', 'BR']); ok('set profile needs a session', r.error === 'auth', r);
  r = await q('select public.gog_set_profile($1,$2,$3)', [TG, 'z', 'BR']); ok('set profile validates gender', r.error === 'bad_request', r);
  r = await q('select public.gog_login($1,$2)', ['gc_one', B]); ok('login returns gender and country', r.ok && r.gender === 'm' && r.country === 'BR', r);
}
// throttle
await db.exec('reset role'); await db.exec("update gog.throttle set n = 30, since = now()"); await db.exec('set role anon');
r = await q('select public.gog_register($1,$2)', ['someone', B]); ok('global register throttle', r.error === 'busy', r);
console.log(fail ? 'FAILED ' + fail : 'ALL PASSED');
