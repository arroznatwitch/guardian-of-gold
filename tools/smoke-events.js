#!/usr/bin/env node
// Teste: missoes diarias (3 por dia, resgate, conquista) e o evento da Estatua Dourada (30 s, ouro por dano, 2 tentativas por dia): node tools/smoke-events.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame(); const out = vm.runInContext(fs.readFileSync(__dirname + '/sim/events-check.js', 'utf8'), ctx);
if (out === 'tudo ok') console.log('OK: missoes diarias e evento da Estatua Dourada.'); else { console.log('FALHOU:\n' + out); process.exit(1); }
