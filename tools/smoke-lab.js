#!/usr/bin/env node
// Teste do laboratorio de batalha (js/96-lab.js):  node tools/smoke-lab.js
// Confirma que so abre para um admin confirmado pelo servidor, que nao grava nada e que o save verdadeiro volta intacto.
const vm = require('vm'), { loadGame } = require('./sim/load-game.js');
const ctx = loadGame();
const out = vm.runInContext(`(function () {
  const out = [];
  on = { token: 'b'.repeat(64), nick: 'Admin', name: 'Admin', country: 'PT' };
  save = normalize(newSave('mage')); save.pl.lv = 30; persist();
  const before = JSON.stringify(save), stored = localStorage.getItem(SAVE_KEY);
  if (labAllowed()) out.push('o laboratorio abriu sem o servidor confirmar que a conta e admin');
  labAdmin = true; labTok = on.token;
  if (!labAllowed()) out.push('labAllowed() devia ser verdadeiro para um admin confirmado');
  labStart();
  if (!labOn || state !== 'play') out.push('labStart nao arrancou a arena');
  for (const k of ['Digit3', 'BracketRight', 'KeyL', 'KeyV', 'KeyB', 'KeyN', 'Semicolon', 'KeyK', 'KeyI', 'KeyO', 'KeyZ', 'KeyZ', 'KeyX']) { try { labKey(k); } catch (e) { out.push('tecla ' + k + ': ' + e.message); } }
  for (let i = 0; i < 600; i++) { try { update(1 / 60); } catch (e) { out.push('update: ' + e.message); break; } }
  persist(); save.gold = 999; persist();
  if (localStorage.getItem(SAVE_KEY) !== stored) out.push('o laboratorio gravou no localStorage');
  labKey('KeyC'); labKey('Digit0');
  if (labOn || state !== 'hub') out.push('labExit nao voltou ao campo');
  if (JSON.stringify(save) !== before) out.push('o save verdadeiro foi alterado pelo laboratorio');
  labAdmin = false; if (labAllowed()) out.push('labAllowed() devia ser falso sem confirmacao');
  return out;
})()`, ctx);
if (out.length) { console.log('FALHOU:\n  ' + out.join('\n  ')); process.exit(1); }
console.log('OK: laboratorio so para admin, sem gravar nada, e o save verdadeiro volta intacto.');
