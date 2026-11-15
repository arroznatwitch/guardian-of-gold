#!/usr/bin/env node
// Teste: joga ~15 s de combate com cada arma das 3 classes (Campanha e Raid), com os Logs de Dano ligados, a usar ataque, habilidade e especial.
// Apanha erros de desenho/combate que o jogo trataria como "erro recuperado" (e te mandaria de volta ao acampamento):  node tools/smoke-play.js
const vm = require('vm'), fs = require('fs'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
const out = vm.runInContext(fs.readFileSync(__dirname + '/sim/play-check.js', 'utf8'), ctx);
if (out.startsWith('tudo ok')) console.log('OK: combate com todas as armas, sem erros (' + out + ').'); else { console.log('FALHOU:\n' + out); process.exit(1); }
