#!/usr/bin/env node
// Teste: subir de estrela pede copias + ouro + pedra + objetivo da arma (node tools/smoke-stars.js)
const vm = require('vm'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
const out = vm.runInContext(`(function () {
  const o = []; on = { token: 'a'.repeat(64) }; save = newSave('archer'); save.pl.lv = 60; save.gold = 1e9; const id = 'a_bow', a = save.wst[id];
  a[0] = 15; doFuse(id, 0, false); if (wStar(id) !== 0) o.push('subiu sem pedra nem abates');
  save.stones[0] = 1; doFuse(id, 0, false); if (wStar(id) !== 0) o.push('subiu sem 5000 abates');
  wProg(id).k = 5000; doFuse(id, 0, false); if (wStar(id) !== 1) o.push('nao subiu a 1 estrela com tudo'); if (save.stones[0] !== 0) o.push('pedra nao gasta');
  a[1] = 5; save.stones[1] = 2; doFuse(id, 1, false); if (wStar(id) !== 1) o.push('subiu a 2 sem 20 raids');
  wProg(id).r = 20; doFuse(id, 1, false); if (wStar(id) !== 2) o.push('nao subiu a 2 estrelas'); if (save.stones[1] !== 0) o.push('pedras raras nao gastas');
  a[2] = 5; save.stones[3] = 1; wProg(id).n = 49; doFuse(id, 2, false); if (wStar(id) !== 2) o.push('subiu a 3 com 49 raids');
  wProg(id).n = 50; doFuse(id, 2, false); if (wStar(id) !== 3) o.push('nao subiu a 3 estrelas');
  tab = 'fuse'; fuseMode = 'w'; state = 'hub'; ui = []; try { drawHub(); } catch (e) { o.push('draw: ' + e.message); }
  return o; })()`, ctx);
if (out.length) { console.log('FALHOU:\n  ' + out.join('\n  ')); process.exit(1); } console.log('OK: estrelas de arma exigem pedra + objetivo.');
