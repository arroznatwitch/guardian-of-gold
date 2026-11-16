#!/usr/bin/env node
// Teste: Shop / Auto-Raid (simula uma raid num save copiado, calcula as corridas em 30 min, nao conta para o ranking): node tools/smoke-shop.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame(); const out = vm.runInContext(fs.readFileSync(__dirname + '/sim/shop-check.js', 'utf8'), ctx);
if (out.startsWith('tudo ok')) console.log('OK: Shop / Auto-Raid.\n  ' + out.replace('tudo ok | ', '').split(' | ').join('\n  ')); else { console.log('FALHOU:\n  ' + out.split(' | ').join('\n  ')); process.exit(1); }
