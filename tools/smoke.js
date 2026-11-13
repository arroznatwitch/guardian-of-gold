#!/usr/bin/env node
// Teste rapido: cria um personagem novo (como o jogo faz ao criar conta) e desenha cada separador do campo.
// Se algum ecra rebentar com um save acabado de criar, aparece aqui:  node tools/smoke.js
const vm = require('vm'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
const code = `
(function () {
  const out = [], tabs = ['farm', 'raids', 'char', 'bag', 'ench', 'weapons', 'fuse', 'anvil', 'pets', 'guild', 'rank', 'profile', 'rewards', 'ach'];
  on = { token: 'a'.repeat(64), nick: 'Teste', name: 'Teste', country: 'PT' };
  for (const cls of ['knight', 'archer', 'mage']) {
    createCharacterForTest(cls);
    state = 'hub';
    for (const t of tabs) {
      tab = t; ui = [];
      try { drawHub(); } catch (e) { out.push(cls + ' / ' + t + ': ' + e.message); }
    }
  }
  return out;
})()`;
// o mesmo caminho do jogo ao criar um personagem (js/a4-online.js)
vm.runInContext('function createCharacterForTest(k) { save = newSave(k); }', ctx);   // exatamente o que o jogo faz ao criar o personagem (sem normalize)
const errs = vm.runInContext(code, ctx);
if (errs.length) { console.log('FALHOU:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log('OK: todos os separadores do campo desenham com um personagem novo (3 classes).');
