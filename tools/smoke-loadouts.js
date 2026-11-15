#!/usr/bin/env node
// Teste: 3 builds (2.a gratis, 3.a por 200 diamantes) com atributos, arma e equipamento proprios: node tools/smoke-loadouts.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame(); const out = vm.runInContext(fs.readFileSync(__dirname + '/sim/loadouts-check.js', 'utf8'), ctx);
if (out === 'tudo ok') console.log('OK: loadouts (3 builds).'); else { console.log('FALHOU:\n  ' + out.split(' | ').join('\n  ')); process.exit(1); }
