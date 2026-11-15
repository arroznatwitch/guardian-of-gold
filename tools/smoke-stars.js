#!/usr/bin/env node
// Teste: cada estrela e uma missao feita UMA vez por arma (pedra + objetivo); depois juntas copias as vezes que quiseres (node tools/smoke-stars.js)
const vm = require('vm'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
const out = vm.runInContext(`(function () {
  const o = []; on = { token: 'a'.repeat(64) }; save = newSave('archer'); save.pl.lv = 60; save.gold = 1e9; const id = 'a_bow', a = save.wst[id];
  a[0] = 30; doFuse(id, 0, false); if (wStar(id) !== 0) o.push('subiu sem desbloquear');
  if (wUnlock(id)) o.push('desbloqueou sem pedra nem abates');
  save.stones[0] = 1; if (wUnlock(id)) o.push('desbloqueou sem 5000 abates');
  wProg(id).k = 5000; if (!wUnlock(id)) o.push('nao desbloqueou a 1 estrela'); if (save.stones[0] !== 0) o.push('pedra nao gasta');
  doFuse(id, 0, false); doFuse(id, 0, false); if (a[1] !== 2) o.push('nao deu para juntar varias vezes (' + a[1] + ')'); if (save.stones[0] !== 0) o.push('fusao gastou pedra');
  a[1] = 10; doFuse(id, 1, false); if (a[2] !== 0) o.push('subiu a 2 sem a missao');
  save.stones[1] = 2; wProg(id).r = 20; if (!wUnlock(id)) o.push('nao desbloqueou 2 estrelas'); doFuse(id, 1, false); doFuse(id, 1, false); if (a[2] !== 2) o.push('nao deu para juntar varias a 2 estrelas');
  a[2] = 5; doFuse(id, 2, false); if (a[3] !== 0) o.push('subiu a 3 sem a missao'); save.stones[3] = 1; wProg(id).n = 49; if (wUnlock(id)) o.push('desbloqueou 3 com 49 raids');
  wProg(id).n = 50; if (!wUnlock(id)) o.push('nao desbloqueou 3 estrelas'); doFuse(id, 2, false); if (a[3] !== 1) o.push('nao subiu a 3 estrelas');
  const b = save.wst['a_triple']; b[2] = 1; if (wUnlocked('a_triple') < 2) o.push('arma que ja tem 2 estrelas devia ter 1 e 2 desbloqueadas'); b[1] = 5; doFuse('a_triple', 1, false); if (b[2] !== 2) o.push('arma com 2 estrelas nao deixa juntar');
  tab = 'fuse'; fuseMode = 'w'; state = 'hub'; ui = []; try { drawHub(); } catch (e) { o.push('draw: ' + e.message); }
  return o; })()`, ctx);
if (out.length) { console.log('FALHOU:\n  ' + out.join('\n  ')); process.exit(1); } console.log('OK: estrelas de arma: missao uma vez por estrela, depois fusoes livres.');
