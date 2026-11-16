#!/usr/bin/env node
// Teste: fusao de equipamento com estrelas e itens com cadeado: node tools/smoke-gearfuse.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame(); const out = vm.runInContext(fs.readFileSync(__dirname + '/sim/gearfuse-check.js', 'utf8'), ctx);
if (out === 'tudo ok') console.log('OK: fusao de equipamento (com estrelas e cadeados).'); else { console.log('FALHOU:\n  ' + out.split(' | ').join('\n  ')); process.exit(1); }
