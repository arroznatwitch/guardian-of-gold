#!/usr/bin/env node
// Teste: recompensas por nivel resgatadas no servidor (formulas do SQL = levelReward, aplica a diferenca, usa o local se a funcao nao existir): node tools/smoke-serverclaim.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
Promise.resolve(vm.runInContext(fs.readFileSync(__dirname + '/sim/serverclaim-check.js', 'utf8'), ctx)).then(out => {
  if (out === 'tudo ok') console.log('OK: recompensas por nivel no servidor.'); else { console.log('FALHOU:\n  ' + out.split(' | ').join('\n  ')); process.exit(1); }
});
