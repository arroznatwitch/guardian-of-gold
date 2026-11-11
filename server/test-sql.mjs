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
  const SAVE = JSON.stringify({ cls: 'knight', gold: 5, pl: { lv: 2 } });
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
  const BUILD = { skin: 2, title: 'inferno', weapon: { id: 'm_fire', lv: 3, st: 1 }, attr: { vit: 12, str: 99999999, agi: 3, per: 4, evil: 1 },
    gear: { head: { r: 3, e: 5, st: 1, sp: 'Ígneo<script>' }, weapon: { r: 4 }, chest: { r: 99, e: -4 } }, junk: 'x'.repeat(50) };
  const SB = JSON.stringify({ cls: 'mage', level: 10, kills: 100, gold: 500, bosses: 1, raids: 0, w0: 4, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, build: BUILD });
  r = await q('select public.gog_submit($1,$2::jsonb)', [TB, SB]); ok('submit with build', r.ok, r);
  r = await q('select public.gog_profile($1)', ['BUILDER']); const bd = r.build;
  ok('profile returns cleaned build', r.ok && r.cls === 'mage' && r.level === 10 && bd.skin === 2 && bd.weapon.id === 'm_fire' && bd.attr.str === 99999 && !('evil' in bd.attr) && !('junk' in bd), r);
  ok('gear slots whitelisted and clamped', Object.keys(bd.gear).sort().join() === 'chest,head' && bd.gear.chest.r === 4 && bd.gear.chest.e === 0 && bd.gear.head.sp === 'Ígneoscript', bd);
  r = await q('select public.gog_board($1,5,null)', ['level']); const row = r.rows.find(x => x.nick === 'builder'); ok('board rows carry class, level and skin', row && row.cls === 'mage' && row.lv === 10 && row.skin === 2, r);
  ok('a forged title in the build is dropped', !('title' in bd) && !row.title, row);
  await db.exec('reset role'); await db.exec("update gog.players set submitted_at = now() - interval '5 minutes'"); await db.exec('set role anon');
  const EVIL = JSON.stringify({ cls: 'mage', level: 10, kills: 100, gold: 500, bosses: 1, raids: 0, w0: 4, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, build: { skin: 1, title: 'Bad Title!', weapon: { id: "x';drop table gog.players;--" } } });
  r = await q('select public.gog_submit($1,$2::jsonb)', [TB, EVIL]);
  r = await q('select public.gog_profile($1)', ['builder']); ok('invalid weapon id is dropped, skin updates', r.build.skin === 1 && !r.build.weapon, r);
  ok('invalid title is dropped', !('title' in r.build), r.build);
  // o titulo mostrado vem do save verificado
  await db.exec('reset role'); await db.exec("update gog.players set save = '{\"cls\":\"mage\",\"title\":\"reaper\",\"stats\":{\"kills\":10000},\"ach\":{\"kills10000\":2}}'::jsonb, submitted_at = now() - interval '5 minutes' where nick = 'builder'"); await db.exec('set role anon');
  r = await q('select public.gog_submit($1,$2)', [TB, EVIL.replace('Bad Title!', 'inferno')]);
  r = await q('select public.gog_profile($1)', ['builder']); ok('ranking title comes from the verified save', r.build && r.build.title === 'reaper', r);
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
// uma conta nova so comeca com personagem novo
{
  await db.exec('reset role'); await db.exec("update gog.throttle set n = 0"); await db.exec('set role anon');
  r = await q('select public.gog_register($1,$2)', ['fresh_one', B]); const TF = r.token;
  const SV = (lv, gold) => JSON.stringify({ cls: 'knight', pl: { lv, xp: 0 }, gold, gems: 0 });
  r = await q('select public.gog_save_get($1)', [TF]); ok('save_get returns the account uid', /^[0-9a-f-]{36}$/.test(r.uid || ''), r); const uid1 = r.uid;
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TF, SV(30, 5000), 0, 'dev']); ok('new account refuses a level 30 save', r.error === 'not_new', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TF, SV(5, 100), 0, 'dev']); ok('new account refuses a level 5 save', r.error === 'not_new', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TF, SV(1, 5000), 0, 'dev']); ok('new account refuses lots of gold', r.error === 'not_new', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TF, JSON.stringify({ cls: 'knight', pl: { lv: 'x' } }), 0, 'dev']); ok('new account refuses a malformed level', r.error === 'not_new', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TF, SV(1, 0), 0, 'dev']); ok('new account accepts a fresh character', r.ok, r);
  await db.exec('reset role'); await db.exec("update gog.players set save_at = now() - interval '1 minute'"); await db.exec('set role anon');
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TF, SV(4, 3000), 1, 'dev']); ok('an account that already has a save can progress', r.ok, r);
  r = await q('select public.gog_save_reset($1)', [TF]); r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TF, SV(30, 90000), r.rev, 'dev']); ok('after a reset the account is new again', r.error === 'not_new', r);
  r = await q('select public.gog_register($1,$2)', ['fresh_two', B]); const TF2 = r.token; r = await q('select public.gog_save_get($1)', [TF2]); ok('each account has its own uid', r.uid && r.uid !== uid1, r);
}
// varios personagens por conta (um por classe)
{
  await db.exec('reset role'); await db.exec("update gog.throttle set n = 0"); await db.exec('set role anon');
  const SVC = (c) => JSON.stringify({ cls: c, pl: { lv: 1, xp: 0 }, gold: 0, gems: 0 });
  r = await q('select public.gog_register($1,$2)', ['mc_main', B]); const TM = r.token;
  r = await q('select public.gog_save_put($1,$2::jsonb,0,$3)', [TM, SVC('knight'), 'd']); ok('main character locks its class on the first save', r.ok, r);
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TM, SVC('mage'), 1, 'd']); ok('class cannot change afterwards', r.error === 'wrong_class' || r.error === 'slow', r);
  await db.exec('reset role'); await db.exec("update gog.players set save_at = now() - interval '1 minute'"); await db.exec('set role anon');
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TM, SVC('mage'), 1, 'd']); ok('class cannot change afterwards (no throttle)', r.error === 'wrong_class', r);
  r = await q('select public.gog_char_create($1,$2,$3)', [TM, 'knight', 'mc_knight2']); ok('cannot create a second knight', r.error === 'class_taken', r);
  r = await q('select public.gog_char_create($1,$2,$3)', [TM, 'archer', 'mc_main']); ok('nick must be unique', r.error === 'nick_taken', r);
  r = await q('select public.gog_char_create($1,$2,$3)', [TM, 'archer', 'a b']); ok('nick is validated', r.error === 'bad_nick', r);
  r = await q('select public.gog_char_create($1,$2,$3)', [TM, 'wizard', 'mc_wiz']); ok('class is validated', r.error === 'bad_request', r);
  r = await q('select public.gog_char_create($1,$2,$3)', ['0'.repeat(64), 'archer', 'mc_arch']); ok('create needs a session', r.error === 'auth', r);
  r = await q('select public.gog_char_create($1,$2,$3)', [TM, 'archer', 'mc_arch']); ok('create an archer', r.ok && r.cls === 'archer' && r.token.length === 64, r); const TA = r.token;
  r = await q('select public.gog_save_get($1)', [TA]); ok('new character has its own empty save and uid', r.ok && r.save === null && r.cls === 'archer' && r.taken.includes('knight'), r);
  r = await q('select public.gog_save_put($1,$2::jsonb,0,$3)', [TA, SVC('knight'), 'd']); ok('archer cannot save a knight', r.error === 'wrong_class', r);
  r = await q('select public.gog_save_put($1,$2::jsonb,0,$3)', [TA, SVC('archer'), 'd']); ok('archer saves as archer', r.ok, r);
  r = await q('select public.gog_char_create($1,$2,$3)', [TA, 'mage', 'mc_mage']); ok('create a mage from another character', r.ok, r); const TMG = r.token;
  r = await q('select public.gog_char_create($1,$2,$3)', [TA, 'knight', 'mc_fourth']); ok('at most three characters per account', r.error === 'too_many' || r.error === 'class_taken', r);
  r = await q('select public.gog_chars($1)', [TA]); ok('list shows the three characters', r.ok && r.chars.length === 3 && r.chars.filter(c => c.current).length === 1 && r.chars.find(c => c.main).nick === 'mc_main', r);
  r = await q('select public.gog_char_switch($1,$2)', [TA, 'mc_main']); ok('switch to the main character', r.ok && r.nick === 'mc_main' && r.token.length === 64 && r.cls === 'knight', r); const TM2 = r.token;
  r = await q('select public.gog_save_get($1)', [TM2]); ok('main save is untouched after switching', r.ok && r.save && r.save.cls === 'knight', r);
  r = await q('select public.gog_char_switch($1,$2)', [TM2, 'rui_99']); ok('cannot switch to a stranger', r.error === 'not_found', r);
  r = await q('select public.gog_login($1,$2)', ['mc_arch', B]); ok('an extra character logs in with the account password', r.ok && r.nick === 'mc_arch', r);
  r = await q('select public.gog_login($1,$2)', ['mc_arch', A]); ok('wrong password is refused on an extra character', !r.ok, r);
  for (let i = 0; i < 4; i++) await q('select public.gog_login($1,$2)', ['mc_arch', A]);
  r = await q('select public.gog_login($1,$2)', ['mc_main', B]); ok('lockout is shared by the whole account', r.error === 'locked', r);
  await db.exec('reset role'); await db.exec("update gog.players set locked_until = null, failed = 0"); await db.exec('set role anon');
  r = await q('select public.gog_set_profile($1,$2,$3)', [TM2, 'f', 'BR']); ok('profile change applies to every character', r.ok, r);
  r = await q('select public.gog_profile($1)', ['mc_mage']); ok('other characters share gender and country', r.gender === 'f' && r.country === 'BR', r);
  r = await q('select public.gog_profile($1)', ['mc_mage']); ok('an extra character shows its main account', r.account === 'mc_main', r);
  r = await q('select public.gog_profile($1)', ['mc_main']); ok('the main character has no account line', r.account === null, r);
  r = await q('select public.gog_board($1,50,null)', ['level']); ok('board lists characters separately by nick', Array.isArray(r.rows), r);
  await db.exec('reset role'); await db.exec("select gog.set_active('mc_arch', false)"); await db.exec('set role anon');
  r = await q('select public.gog_login($1,$2)', ['mc_main', B]); ok('deactivating one nick deactivates the whole account', r.error === 'inactive', r);
  r = await q('select public.gog_save_get($1)', [TMG]); ok('sessions of every character are killed', !r.ok, r);
  await db.exec('reset role'); await db.exec("select gog.set_active('mc_main', true)"); await db.exec('set role anon');
  r = await q('select public.gog_login($1,$2)', ['mc_mage', B]); ok('reactivation restores every character', r.ok, r);
}
// codigos promocionais: 1 uso por conta
{
  await db.exec('reset role'); await db.exec("update gog.throttle set n = 0"); await db.exec('set role anon');
  r = await q('select public.gog_register($1,$2)', ['promo_a', B]); const PA = r.token;
  r = await q('select public.gog_redeem($1,$2)', ['0'.repeat(64), 'beta']); ok('redeem needs a session', r.error === 'auth', r);
  r = await q('select public.gog_redeem($1,$2)', [PA, 'nope']); ok('unknown code is refused', r.error === 'bad_code', r);
  r = await q('select public.gog_redeem($1,$2)', [PA, "x'; drop"]); ok('malformed code is refused', r.error === 'bad_code', r);
  r = await q('select public.gog_redeem($1,$2)', [PA, '  BeTa ']); ok('code works, any case, gives 10 gems and the title', r.ok && r.gems === 10 && r.title === 'beta', r);
  r = await q('select public.gog_redeem($1,$2)', [PA, 'beta']); ok('code can only be used once per account', r.error === 'used', r);
  await db.exec('reset role'); await db.exec("update gog.players set save_at = now() - interval '1 minute'"); await db.exec('set role anon');
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [PA, JSON.stringify({ cls: 'knight', pl: { lv: 1, xp: 0 }, gold: 0, gems: 0 }), 0, 'dev']); ok('promo account can save a first character', r.ok, r);
  r = await q('select public.gog_char_create($1,$2,$3)', [PA, 'archer', 'promo_arch']); const PC = r.token; ok('promo account creates another character', r.ok, r);
  r = await q('select public.gog_redeem($1,$2)', [PC, 'beta']); ok('other characters of the same account cannot reuse the code', r.error === 'used', r);
  r = await q('select public.gog_register($1,$2)', ['promo_b', B]); const PB = r.token;
  r = await q('select public.gog_redeem($1,$2)', [PB, 'beta']); ok('a different account can use it', r.ok, r);
  let d3 = false; try { await db.query('select * from gog.promo_used'); } catch (e) { d3 = true; } ok('anon cannot read the promo tables', d3);
}
// anti-batota
{
  const SAVEAC = (o = {}) => JSON.stringify(Object.assign({ cls: 'knight', pl: { lv: 1, xp: 0 }, gold: 0, gems: 0, chestDone: 1, stats: { kills: 0, gold: 0, bosses: 0 }, ach: {}, title: '' }, o));
  const fresh = async nick => { await db.exec('reset role'); await db.exec('update gog.throttle set n = 0'); await db.exec('set role anon'); const rr = await q('select public.gog_register($1,$2)', [nick, B]); return rr.token; };
  const age = async () => { await db.exec('reset role'); await db.exec("update gog.players set save_at = now() - interval '2 minutes'"); await db.exec('set role anon'); };
  const put = async (tk, o, rev) => { await age(); return q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [tk, SAVEAC(o), rev, 'd']); };
  const TK = await fresh('ac_one');
  r = await put(TK, {}, 0); ok('anticheat: a normal first save passes', r.ok, r); let rev = r.rev;
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TK, SAVEAC({ gems: 500 }), 0, 'd']); // fica sem efeito: so confirma que a primeira conta nova nao leva diamantes
  const TK0 = await fresh('ac_zero'); await age();
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [TK0, SAVEAC({ gems: 500 }), 0, 'd']); ok('anticheat: a new character cannot start with diamonds', r.error === 'not_new', r);
  // saltos impossiveis
  r = await put(TK, { gold: 900000 }, rev); ok('anticheat: huge gold jump is refused', r.error === 'cheat', r);
  r = await put(TK, { pl: { lv: 60, xp: 0 }, chestDone: 1 }, rev); ok('anticheat: huge level jump is refused', r.error === 'cheat', r);
  r = await put(TK, { gems: 5000 }, rev); ok('anticheat: gems cannot appear from nowhere', r.error === 'cheat', r);
  r = await put(TK, { stats: { kills: 900000, gold: 0, bosses: 0 } }, rev); ok('anticheat: absurd kills are refused', r.error === 'cheat' || r.error === 'banned', r);
  // uma conquista sem prova
  const TK2 = await fresh('ac_two'); r = await put(TK2, {}, 0); rev = r.rev;
  r = await put(TK2, { ach: { kills10000: 1 } }, rev); ok('anticheat: achievement without proof is refused', r.error === 'cheat', r);
  r = await put(TK2, { ach: { nonsense: 1 } }, rev); ok('anticheat: unknown achievement id is refused', r.error === 'cheat' || r.error === 'banned', r);
  r = await put(TK2, { stats: { kills: 1200, gold: 0, bosses: 0 }, ach: { kills1000: 1 } }, rev); ok('anticheat: an earned achievement passes', r.ok, r); rev = r.rev;
  r = await put(TK2, { stats: { kills: 1200, gold: 0, bosses: 0 }, ach: { kills1000: 2 }, gems: 25 }, rev); ok('anticheat: claiming it gives its diamonds', r.ok, r); rev = r.rev;
  r = await put(TK2, { stats: { kills: 1200, gold: 0, bosses: 0 }, ach: { kills1000: 2 }, gems: 400 }, rev); ok('anticheat: extra diamonds beyond the rewards are refused', r.error === 'cheat' || r.error === 'banned', r);
  // titulos
  r = await put(TK2, { stats: { kills: 1200, gold: 0, bosses: 0 }, ach: { kills1000: 2 }, gems: 25, title: 'inferno' }, rev); ok('anticheat: a title you did not earn is refused', r.error === 'cheat' || r.error === 'banned', r);
  r = await put(TK2, { stats: { kills: 1200, gold: 0, bosses: 0 }, ach: { kills1000: 2 }, gems: 25, title: 'beta' }, rev); ok('anticheat: beta title needs the promo code', r.error === 'cheat' || r.error === 'banned', r);
  // conta nova para testar o ban em 3 ocorrencias e o ban imediato
  const TKB = await fresh('ac_beta'); r = await put(TKB, {}, 0); rev = r.rev;
  r = await put(TKB, { title: 'beta' }, rev); ok('anticheat: beta title without the code is refused', r.error === 'cheat', r);
  r = await q('select public.gog_redeem($1,$2)', [TKB, 'beta']); ok('anticheat: redeem the beta code', r.ok, r);
  r = await put(TKB, { title: 'beta', gems: 10 }, rev); ok('anticheat: beta title and its 10 diamonds are accepted after the code', r.ok, r);
  const TK3 = await fresh('ac_three'); r = await put(TK3, {}, 0); rev = r.rev;
  const strike = async () => { await db.exec('reset role'); await db.exec("update gog.violations set at = now() - interval '20 minutes' where root = (select id from gog.players where nick = 'ac_three')"); await db.exec('set role anon'); return put(TK3, { gold: 900000 }, rev); };
  r = await put(TK3, { gold: 900000 }, rev); ok('anticheat: 1st strike is refused', r.error === 'cheat', r);
  r = await put(TK3, { gold: 900000 }, rev); ok('anticheat: repeated attempts within minutes count once', r.error === 'cheat', r);
  r = await strike(); ok('anticheat: 2nd strike is still only refused', r.error === 'cheat', r);
  r = await strike(); ok('anticheat: 3rd strike bans the account', r.error === 'banned', r);
  r = await q('select public.gog_login($1,$2)', ['ac_three', B]); ok('anticheat: a banned account cannot log in', r.error === 'inactive', r);
  const TK4 = await fresh('ac_four'); r = await put(TK4, {}, 0); rev = r.rev;
  r = await put(TK4, { gold: 99999999 }, rev); ok('anticheat: impossible values ban immediately', r.error === 'banned', r);
  r = await q('select public.gog_save_get($1)', [TK4]); ok('anticheat: the banned session is dead', !r.ok, r);
  // recuperar de um falso positivo: o administrador reativa
  await db.exec('reset role'); await db.exec("select gog.set_active('ac_four', true)"); await db.exec('set role anon');
  r = await q('select public.gog_login($1,$2)', ['ac_four', B]); ok('anticheat: admin can reactivate a banned account', r.ok, r);
  let dd = false; try { await db.query('select * from gog.violations'); } catch (e) { dd = true; } ok('anticheat: anon cannot read violations', dd);
  let d4 = false; try { await db.query("select gog._check_save(null, '{}'::jsonb, 5, 1)"); } catch (e) { d4 = true; } ok('anticheat: anon cannot call the checker', d4);
}
// um save real do jogo (tudo no maximo) tem de passar sem falsos positivos
{
  const MAXSAVE = "{\"cls\":\"mage\",\"gold\":500000,\"up\":{\"hp\":0,\"dmg\":0,\"spd\":0,\"cd\":0},\"done\":0,\"own\":{\"knight\":[1,0,0,0,0],\"archer\":[1,0,0,0,0],\"mage\":[1,0,0,0,0]},\"eq\":{\"knight\":0,\"archer\":0,\"mage\":0},\"wl\":{\"k_sword\":20,\"k_axe\":20,\"k_spear\":20,\"k_hammer\":20,\"k_blade\":20,\"a_bow\":20,\"a_triple\":20,\"a_cross\":20,\"a_fire\":20,\"a_dark\":20,\"m_fire\":20,\"m_ice\":20,\"m_bolt\":20,\"m_arcane\":20,\"m_dark\":20},\"sk\":{\"knight\":[1,1,1,1,1,1],\"archer\":[1,1,1,1,1,1],\"mage\":[1,1,1,1,1,1]},\"skE\":{\"knight\":0,\"archer\":0,\"mage\":0},\"pity\":{},\"cheat\":{},\"stats\":{\"kills\":50000,\"gold\":900000,\"bosses\":250,\"guard\":10,\"spent\":500000,\"fuses\":50,\"rar\":4},\"pl\":{\"lv\":120,\"xp\":0},\"raids\":{\"0\":[1,1,1,1,1],\"1\":[1,1,1,1,1],\"2\":[1,1,1,1,1],\"3\":[1,1,1,1,1],\"4\":[1,1,1,1,1],\"5\":[1,1,1,1,1]},\"attr\":{\"vit\":0,\"str\":0,\"agi\":0,\"per\":0},\"pts\":0,\"bag\":[],\"gear\":{\"head\":{\"slot\":\"head\",\"r\":4,\"il\":100,\"ench\":10},\"chest\":{\"slot\":\"chest\",\"r\":4,\"il\":100,\"ench\":10},\"boots\":{\"slot\":\"boots\",\"r\":4,\"il\":100,\"ench\":10},\"amulet\":{\"slot\":\"amulet\",\"r\":4,\"il\":100,\"ench\":10}},\"farmBest\":{\"0\":50,\"1\":50,\"2\":50,\"3\":50,\"4\":50,\"5\":50},\"gems\":5510,\"wst\":{\"k_sword\":[0,0,0,1,0,0,0],\"k_axe\":[0,0,0,1,0,0,0],\"k_spear\":[0,0,0,1,0,0,0],\"k_hammer\":[0,0,0,1,0,0,0],\"k_blade\":[0,0,0,1,0,0,0],\"a_bow\":[0,0,0,1,0,0,0],\"a_triple\":[0,0,0,1,0,0,0],\"a_cross\":[0,0,0,1,0,0,0],\"a_fire\":[0,0,0,1,0,0,0],\"a_dark\":[0,0,0,1,0,0,0],\"m_fire\":[0,0,0,1,0,0,0],\"m_ice\":[0,0,0,1,0,0,0],\"m_bolt\":[0,0,0,1,0,0,0],\"m_arcane\":[0,0,0,1,0,0,0],\"m_dark\":[0,0,0,1,0,0,0]},\"chestDone\":120,\"stones\":[0,0,0,0,0],\"pets\":{\"own\":{},\"eq\":\"\"},\"bagSlots\":5,\"pres\":[5,5,5,5,5,5],\"presW\":[0,0,0,0,0,0],\"codes\":{},\"ach\":{\"kills1000\":2,\"kills2500\":2,\"kills5000\":2,\"kills10000\":2,\"kills25000\":2,\"kills50000\":2,\"boss10\":2,\"boss50\":2,\"boss250\":2,\"guard1\":2,\"guard10\":2,\"spend5000\":2,\"spend10000\":2,\"spend25000\":2,\"spend50000\":2,\"spend75000\":2,\"spend100000\":2,\"spend250000\":2,\"spend500000\":2,\"lv10\":2,\"lv20\":2,\"lv30\":2,\"lv40\":2,\"lv50\":2,\"lv60\":2,\"lv70\":2,\"lv80\":2,\"lv90\":2,\"lv100\":2,\"lv110\":2,\"lv120\":2,\"bag5\":2,\"skin1\":2,\"skin3\":2,\"farm5\":2,\"farm10\":2,\"farm15\":2,\"farm25\":2,\"wave0_10\":2,\"wave0_20\":2,\"wave0_30\":2,\"wave0_40\":2,\"wave0_50\":2,\"wave1_10\":2,\"wave1_20\":2,\"wave1_30\":2,\"wave1_40\":2,\"wave1_50\":2,\"wave2_10\":2,\"wave2_20\":2,\"wave2_30\":2,\"wave2_40\":2,\"wave2_50\":2,\"wave3_10\":2,\"wave3_20\":2,\"wave3_30\":2,\"wave3_40\":2,\"wave3_50\":2,\"wave4_10\":2,\"wave4_20\":2,\"wave4_30\":2,\"wave4_40\":2,\"wave4_50\":2,\"wave5_10\":2,\"wave5_20\":2,\"wave5_30\":2,\"wave5_40\":2,\"wave5_50\":2,\"raid0\":2,\"raid1\":2,\"raid2\":2,\"raid3\":2,\"raid4\":2,\"stars1\":2,\"stars3\":2,\"stars6\":2,\"stars12\":2,\"stars20\":2,\"stars30\":2,\"presmax0\":2,\"presmax1\":2,\"presmax2\":2,\"presmax3\":2,\"presmax4\":2,\"presmax5\":2,\"ench5\":2,\"ench10\":2,\"wmax1\":2,\"wmax2\":2,\"wmax3\":2,\"wmax4\":2,\"wmax5\":2,\"anv5\":2,\"anv10\":2,\"anv15\":2,\"anv20\":2,\"rar3\":2,\"rar4\":2,\"fuse1\":2,\"fuse10\":2,\"fuse50\":2},\"title\":\"\",\"farmN\":[25,25,25,25,25,25]}";
  await db.exec('reset role');
  let rr = (await db.query('select gog._check_save(null, $1::jsonb, 3, 1) as x', [MAXSAVE])).rows[0].x; ok('real client save with every achievement claimed passes the checker', rr === null, rr);
  const ach = JSON.parse(MAXSAVE).ach; let missing = [];
  for (const id of Object.keys(ach)) { const x = (await db.query('select gog._ach_ok($1, $2::jsonb) as x', [id, MAXSAVE])).rows[0].x; if (!x) missing.push(id); }
  ok('server knows how to verify all 101 achievements', missing.length === 0 && Object.keys(ach).length === 101, missing);
  const titles = ['reaper', 'slayer', 'treasure', 'tycoon', 'veteran', 'legend', 'immortal', 'tireless', 'lord0', 'lord1', 'lord2', 'lord3', 'lord4', 'lord5', 'hardcore', 'nightmare', 'inferno', 'enchanter', 'armorer', 'smith', 'lucky', 'dandy', 'lodestar', 'astro', 'emperor', 'abyss5'];
  let badT = [];
  for (const tt of titles) { const x = (await db.query("select gog._title_ok(($1::jsonb) || jsonb_build_object('title', $2::text), 1, $2) as x", [MAXSAVE, tt])).rows[0].x; if (!x) badT.push(tt); }
  ok('all 26 achievement titles are accepted for a full save', badT.length === 0, badT);
  const empty = '{"cls":"mage","pl":{"lv":1},"ach":{}}';
  let nothing = []; for (const tt of titles) { const x = (await db.query("select gog._title_ok(($1::jsonb) || jsonb_build_object('title', $2::text), 1, $2) as x", [empty, tt])).rows[0].x; if (x) nothing.push(tt); }
  ok('no title is accepted for an empty save', nothing.length === 0, nothing);
  await db.exec('set role anon');
}
// pets na build publica e no anti-batota
{
  await db.exec('reset role'); await db.exec('update gog.throttle set n = 0'); await db.exec('set role anon');
  r = await q('select public.gog_register($1,$2)', ['pet_one', B]); const TP = r.token;
  const SBP = pet => JSON.stringify({ cls: 'mage', level: 3, kills: 10, gold: 5, bosses: 0, raids: 0, w0: 1, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, build: { skin: 0, pet } });
  r = await q('select public.gog_submit($1,$2::jsonb)', [TP, SBP({ id: 'chicken', lv: 12, name: '<b>Clucky</b> The Great One!' })]); ok('submit with a pet', r.ok, r);
  r = await q('select public.gog_profile($1)', ['pet_one']); const pt = r.build && r.build.pet;
  ok('pet is whitelisted, level clamped and the name is sanitised', pt && pt.id === 'chicken' && pt.lv === 12 && /^[A-Za-z0-9 _-]{0,12}$/.test(pt.name) && pt.name.length <= 12 && !pt.name.includes('<'), pt);
  await db.exec('reset role'); await db.exec("update gog.players set submitted_at = now() - interval '5 minutes'"); await db.exec('set role anon');
  r = await q('select public.gog_submit($1,$2::jsonb)', [TP, SBP({ id: 'dragon', lv: 99, name: 'x' })]); r = await q('select public.gog_profile($1)', ['pet_one']); ok('unknown pet id is dropped', r.build && !('pet' in r.build), r.build);
  await db.exec('reset role'); await db.exec("update gog.players set submitted_at = now() - interval '5 minutes'"); await db.exec('set role anon');
  r = await q('select public.gog_submit($1,$2::jsonb)', [TP, SBP({ id: 'bird', lv: 500, name: 'Tweet' })]); r = await q('select public.gog_profile($1)', ['pet_one']); ok('pet level is capped at 30', r.build && r.build.pet && r.build.pet.lv === 30, r.build);
  await db.exec('reset role'); const bad = (await db.query(`select gog._check_save(null, '{"cls":"mage","pl":{"lv":1},"pets":{"lv":{"dog":99}}}'::jsonb, 5, 1) as x`)).rows[0].x; await db.exec('set role anon');
  ok('anticheat: a pet above level 30 is an impossible value', bad === 'abs:pets', bad);
}
// guildas
{
  const mk = async (nick, lv = 45, gold = 30000, gems = 200, kills = 0) => {
    await db.exec('reset role'); await db.exec('update gog.throttle set n = 0'); await db.exec('set role anon');
    const rr = await q('select public.gog_register($1,$2)', [nick, B]); const tk = rr.token;
    await db.exec('reset role');
    await db.query("update gog.players set save = $2::jsonb, char_cls = 'knight', level = $3, save_at = now() - interval '2 minutes' where nick_key = lower($1)", [nick, JSON.stringify({ cls: 'knight', pl: { lv, xp: 0 }, gold, gems, chestDone: 1, stats: { kills, gold: 0, bosses: 0 } }), lv]);
    await db.exec('set role anon'); return tk;
  };
  const ga = async (fn, ...args) => { await db.exec('reset role'); await db.exec('update gog.players set guild_at = null'); await db.exec('set role anon'); return q(`select public.${fn}(${args.map((_, i) => '$' + (i + 1)).join(',')})`, args); };
  const okText = async s => { await db.exec('reset role'); const x = (await db.query('select gog._text_ok($1) as x', [s])).rows[0].x; await db.exec('set role anon'); return x; };
  // filtro de palavras
  const bads = ['n1gger', 'Nigga', 'N-I-G-G-E-R', 'niiiigga', 'f u c k', 'fuuuck', 'Cabrão', 'Put4', 'p0rn', 'FILHODAPUTA', 'Hitler', 'k k k', 'sh1t'];
  const goods = ['Dragons', 'Guardians', 'Peacock', 'Computador', 'Golden_Knights', 'Niger-Delta'.replace('Niger-Delta', 'Nigeria'), 'Assassins', 'Classic', 'Mage Squad'];
  let badMiss = [], goodHit = [];
  for (const s of bads) if (await okText(s)) badMiss.push(s);
  for (const s of goods) if (!(await okText(s))) goodHit.push(s);
  ok('profanity filter blocks slurs and leetspeak variants', badMiss.length === 0, badMiss);
  ok('profanity filter lets normal names through', goodHit.length === 0, goodHit);
  await db.exec('reset role'); await db.exec('update gog.throttle set n = 0'); await db.exec('set role anon');
  r = await q('select public.gog_register($1,$2)', ['n1gger_x', B]); ok('a slur cannot be used as a nickname', r.error === 'bad_word', r);

  const L1 = await mk('gl_lead'), L2 = await mk('gl_two'), L3 = await mk('gl_low', 30), L4 = await mk('gl_poor', 45, 100, 200), L5 = await mk('gl_nogems', 45, 30000, 10);
  r = await ga('gog_guild_create', L3, 'Test Guild', 'TST'); ok('guild: level 40 is required', r.error === 'need_level', r);
  r = await ga('gog_guild_create', L4, 'Test Guild', 'TST'); ok('guild: 15,000 gold is required', r.error === 'need_gold', r);
  r = await ga('gog_guild_create', L5, 'Test Guild', 'TST'); ok('guild: 100 diamonds are required', r.error === 'need_gems', r);
  r = await ga('gog_guild_create', L1, 'x', 'TST'); ok('guild: name too short', r.error === 'bad_name', r);
  r = await ga('gog_guild_create', L1, 'Good Name', 'TOOLONG'); ok('guild: tag must be 2-4 characters', r.error === 'bad_name', r);
  r = await ga('gog_guild_create', L1, 'Nigger Squad', 'NSQ'); ok('guild: slurs in the name are refused', r.error === 'bad_word', r);
  r = await ga('gog_guild_create', L1, 'Nice Name', 'KKK'); ok('guild: slurs in the tag are refused', r.error === 'bad_word', r);
  r = await ga('gog_guild_create', L1, 'Dragon Slayers', 'DRG'); ok('guild: created by a level 45 player', r.ok && r.guild && r.guild.level === 1 && r.guild.leader === true && r.guild.members.length === 1 && r.guild.free === 1, r); const gid = r.guild && r.guild.id;
  r = await ga('gog_guild_create', L1, 'Another One', 'ANO'); ok('guild: cannot create while in a guild', r.error === 'in_guild', r);
  r = await ga('gog_guild_create', L2, 'dragon slayers', 'XYZ'); ok('guild: name is unique (case-insensitive)', r.error === 'name_taken', r);
  r = await ga('gog_guild_create', L2, 'Other Name', 'drg'); ok('guild: tag is unique (case-insensitive)', r.error === 'name_taken', r);
  r = await ga('gog_guild_create', '0'.repeat(64), 'Zzz', 'ZZZ'); ok('guild: needs a session', r.error === 'auth', r);
  r = await ga('gog_guild_get', L1); ok('guild: get returns the guild', r.ok && r.guild && r.guild.name === 'Dragon Slayers' && r.guild.tag === 'DRG', r);
  r = await ga('gog_guild_get', L2); ok('guild: get without a guild returns null', r.ok && r.guild === null, r);
  // entrar, limite de 10, sair e espera
  const LT = await mk('gl_tiny', 5); r = await ga('gog_guild_join', LT, gid); ok('guild: level 10 is required to join', r.error === 'need_level_join', r);
  r = await ga('gog_guild_join', L2, gid); ok('guild: a member joins', r.ok && r.guild.members.length === 2 && r.guild.leader === false, r);
  r = await ga('gog_guild_join', L2, gid); ok('guild: cannot join twice', r.error === 'in_guild', r);
  const extra = []; for (let i = 0; i < 8; i++) { const tk = await mk('gm_' + i, 20); extra.push(tk); r = await ga('gog_guild_join', tk, gid); }
  ok('guild: ten members fit', r.ok && r.guild.members.length === 10, r);
  const TF = await mk('gm_full', 20); r = await ga('gog_guild_join', TF, gid); ok('guild: the 11th member is refused', r.error === 'full', r);
  r = await ga('gog_guild_list', L5, 0); ok('guild: list shows the guild with its members', r.ok && r.rows.some(x => x.name === 'Dragon Slayers' && x.members === 10), r);
  // so o lider gere
  r = await ga('gog_guild_upgrade', L2, 'xp'); ok('guild: a member cannot upgrade', r.error === 'not_leader', r);
  r = await ga('gog_guild_kick', L2, 'gm_0'); ok('guild: a member cannot kick', r.error === 'not_leader', r);
  r = await ga('gog_guild_upgrade', L1, 'xp'); ok('guild: the leader spends the first point', r.ok && r.guild.perks.xp === 1 && r.guild.free === 0, r);
  r = await ga('gog_guild_upgrade', L1, 'gold'); ok('guild: no points left at level 1', r.error === 'no_points', r);
  r = await ga('gog_guild_upgrade', L1, 'speed'); ok('guild: unknown upgrade is refused', r.error === 'bad_request', r);
  // pontos automaticos: os mobs de cada membro (validados) sobem a guilda
  await db.exec('reset role'); await db.exec("update gog.players set save_at = now() - interval '2 minutes'"); await db.exec('set role anon');
  r = await q('select public.gog_save_put($1,$2::jsonb,$3,$4)', [L2, JSON.stringify({ cls: 'knight', pl: { lv: 45, xp: 0 }, gold: 30000, gems: 200, chestDone: 1, stats: { kills: 500, gold: 0, bosses: 2 } }), 0, 'd']); ok('guild: a member save with new kills is accepted', r.ok, r);
  r = await ga('gog_guild_get', L1); const me2 = r.guild.members.find(x => x.nick === 'gl_two');
  ok('guild: kills and bosses became guild points (500 + 2 bosses x 10)', r.guild.xp === 520 && me2 && me2.contrib === 520, r.guild && { xp: r.guild.xp, me2 });
  await db.exec('reset role'); await db.exec('update gog.guilds set xp = 4000'); await db.exec('set role anon');
  r = await ga('gog_guild_get', L1); ok('guild: level 2 at 4,000 points with a new point to spend', r.guild.level === 2 && r.guild.free === 1 && r.guild.xp === 0, r.guild);
  for (let i = 0; i < 9; i++) { await db.exec('reset role'); await db.exec('update gog.guilds set xp = xp + 100000'); await db.exec('set role anon'); }
  await db.exec('reset role'); await db.exec('update gog.guilds set xp = 99999999999'); await db.exec('set role anon');
  r = await ga('gog_guild_get', L1); ok('guild: level is capped at 40', r.guild.level === 40, r.guild && r.guild.level);
  for (let i = 0; i < 10; i++) r = await ga('gog_guild_upgrade', L1, 'xp');
  ok('guild: a perk stops at level 10', r.error === 'maxed', r);
  // expulsar, transferir e sair
  r = await ga('gog_guild_kick', L1, 'gm_0'); ok('guild: the leader kicks a member', r.ok && r.guild.members.length === 9, r);
  r = await ga('gog_guild_join', extra[0], gid); ok('guild: a kicked member waits 24h to join again', r.error === 'cooldown', r);
  r = await ga('gog_guild_kick', L1, 'gl_lead'); ok('guild: the leader cannot kick themselves', r.error === 'bad_request', r);
  r = await ga('gog_guild_transfer', L1, 'gl_two'); ok('guild: leadership is transferred', r.ok, r);
  r = await ga('gog_guild_get', L1); ok('guild: the old leader is a plain member now', r.guild && r.guild.leader === false, r.guild && r.guild.leader);
  r = await ga('gog_guild_leave', L2); ok('guild: the leader leaves', r.ok, r);
  r = await ga('gog_guild_get', L1); ok('guild: leadership passes to the top contributor when the leader leaves', r.guild && r.guild.members.length === 8, r.guild && r.guild.members.length);
  r = await ga('gog_guild_create', L2, 'Later Guild', 'LTR'); ok('guild: leaving starts a 24h wait before creating or joining', r.error === 'cooldown', r);
  // a guilda desaparece quando sai o ultimo
  const S1 = await mk('gs_solo'); r = await ga('gog_guild_create', S1, 'Solo Squad', 'SOL'); r = await ga('gog_guild_leave', S1);
  await db.exec('reset role'); const left = (await db.query("select count(*) as n from gog.guilds where name_key = 'solo squad'")).rows[0].n; await db.exec('set role anon');
  ok('guild: a guild with no members disappears', Number(left) === 0, left);
  // tag no ranking e no perfil
  await db.exec('reset role'); await db.exec("update gog.players set submitted_at = null"); await db.exec('set role anon');
  r = await q('select public.gog_submit($1,$2::jsonb)', [L1, JSON.stringify({ cls: 'knight', level: 45, kills: 10, gold: 5, bosses: 0, raids: 0, w0: 1, w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, build: { skin: 0 } })]);
  r = await q('select public.gog_board($1,20,null)', ['level']); const rowg = r.rows.find(x => x.nick === 'gl_lead'); ok('guild: the board rows carry the guild tag', rowg && rowg.gtag === 'DRG', r);
  r = await q('select public.gog_profile($1)', ['gl_lead']); ok('guild: the public profile carries the guild', r.guild && r.guild.tag === 'DRG' && r.guild.name === 'Dragon Slayers', r);
  // personalizacao e ranking de guildas
  r = await ga('gog_guild_get', L1); ok('guild: default style is color 0, emblem 0 and no motto', r.guild.color === 0 && r.guild.emblem === 0 && r.guild.motto === '', r.guild);
  r = await ga('gog_guild_style', L1, 3, 5, 'We farm. We win!'); ok('guild: the leader customises color, emblem and motto', r.ok && r.guild.color === 3 && r.guild.emblem === 5 && r.guild.motto === 'We farm. We win!', r);
  r = await ga('gog_guild_style', L2, 1, 1, 'x'); ok('guild: a member cannot customise', r.error === 'not_leader' || r.error === 'no_guild', r);
  r = await ga('gog_guild_style', L1, 9, 1, 'x'); ok('guild: color must be 0-7', r.error === 'bad_request', r);
  r = await ga('gog_guild_style', L1, 1, 12, 'x'); ok('guild: emblem must be 0-11', r.error === 'bad_request', r);
  r = await ga('gog_guild_style', L1, 1, 1, 'n1gger power'); ok('guild: the motto goes through the profanity filter', r.error === 'bad_word', r);
  r = await ga('gog_guild_style', L1, 1, 1, '<script>alert(1)</script>'); ok('guild: the motto only allows simple characters', r.error === 'bad_name', r);
  r = await ga('gog_guild_style', L1, 1, 1, 'x'.repeat(41)); ok('guild: the motto is at most 40 characters', r.error === 'bad_name', r);
  r = await ga('gog_guild_board', L1, 0); ok('guild board lists the guilds with their style', r.ok && r.rows.length >= 1 && r.rows[0].name === 'Dragon Slayers' && r.rows[0].rank === 1 && r.rows[0].color === 3 && r.mine === r.rows[0].id, r);
  r = await q('select public.gog_guild_board(null, 0)'); ok('guild board is public (no session needed)', r.ok && r.rows.length >= 1, r);
  r = await q('select public.gog_board($1,20,null)', ['level']); { const rg = r.rows.find(x => x.nick === 'gl_lead'); ok('board rows carry the guild color', rg && rg.gcol === 3, rg); }
  r = await q('select public.gog_profile($1)', ['gl_lead']); ok('profile guild carries id, color and emblem', r.guild && r.guild.color === 3 && r.guild.emblem === 5 && r.guild.id === gid, r.guild);
  r = await q('select public.gog_guild_public($1)', [gid]); ok('guild public profile shows members, style and the leader', r.ok && r.guild.name === 'Dragon Slayers' && r.guild.motto === 'We farm. We win!' && r.guild.members.length >= 1 && typeof r.guild.leader_nick === 'string' && !('free' in r.guild), r);
  r = await q('select public.gog_guild_public($1)', [999999]); ok('guild public profile of an unknown guild', r.error === 'not_found', r);
  let dg = false; try { await db.query('select * from gog.guilds'); } catch (e) { dg = true; } ok('guild: anon cannot read the guild tables', dg);
  let dg2 = false; try { await db.query("select gog._text_ok('x')"); } catch (e) { dg2 = true; } ok('guild: anon cannot call the filter directly', dg2);
}
// throttle
await db.exec('reset role'); await db.exec("update gog.throttle set n = 30, since = now()"); await db.exec('set role anon');
r = await q('select public.gog_register($1,$2)', ['someone', B]); ok('global register throttle', r.error === 'busy', r);
console.log(fail ? 'FAILED ' + fail : 'ALL PASSED');
