#!/usr/bin/env node
// Teste: compras (mochila, 3.a build, Auto-Raid) e guilda pagas no servidor; usa a compra local se o servidor nao tiver a funcao: node tools/smoke-serverbuy.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
Promise.resolve(vm.runInContext(fs.readFileSync(__dirname + '/sim/serverbuy-check.js', 'utf8'), ctx)).then(out => {
  if (out === 'tudo ok') console.log('OK: compras e guilda pagas no servidor.'); else { console.log('FALHOU:\n  ' + out.split(' | ').join('\n  ')); process.exit(1); }
});
