#!/usr/bin/env node
// Teste: as recompensas por nivel sao fixas e dao o que prometem (node tools/smoke-rewards.js)
const vm = require('vm'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
const out = vm.runInContext(`(function () {
  const o = []; on = { token: 'a'.repeat(64) }; save = newSave('archer'); save.pl.lv = 65; save.chestDone = 0; state = 'hub'; tab = 'rewards';
  const a = JSON.stringify(levelReward(40)), b = JSON.stringify(levelReward(40)); if (a !== b) o.push('premio nao e fixo');
  const g0 = save.gold, p0 = save.pts; claimRewardsLocal(65);
  if (save.chestDone !== 65) o.push('chestDone ' + save.chestDone);
  if (save.gold <= g0 || save.pts <= p0) o.push('sem ouro/pontos');
  for (const it of lastRw.items) if (it.il > 65) o.push('item com nivel ' + it.il);
  if (!lastRw.items.some(it => it.il === 5)) o.push('falta o item do nivel 5');
  if (!save.stones.some(n => n > 0)) o.push('sem pedras');
  claimRewardsLocal(70); ui = []; try { drawHub(); } catch (e) { o.push('draw: ' + e.message); }
  o.push('info: ' + JSON.stringify({ itens: lastRw.items.length, il: lastRw.items.map(i => i.il), pedras: save.stones, gold: save.gold, pts: save.pts, gems: save.gems }));
  return o; })()`, ctx);
const bad = out.filter(x => !x.startsWith('info')); console.log(out.filter(x => x.startsWith('info')).join('\n'));
if (bad.length) { console.log('FALHOU:\n  ' + bad.join('\n  ')); process.exit(1); } console.log('OK: recompensas por nivel fixas.');
