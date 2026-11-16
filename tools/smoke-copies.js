#!/usr/bin/env node
// Teste: copias de arma so caem de armas que ja tens, nao desbloqueiam, e podem vender-se (sempre fica 1): node tools/smoke-copies.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame(); const out = vm.runInContext(fs.readFileSync(__dirname + '/sim/copies-check.js', 'utf8'), ctx);
if (out === 'tudo ok') console.log('OK: copias de arma (so das que tens, vendaveis).'); else { console.log('FALHOU:\n  ' + out.split(' | ').join('\n  ')); process.exit(1); }
