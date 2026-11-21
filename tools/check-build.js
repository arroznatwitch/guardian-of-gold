#!/usr/bin/env node
// Confirma que a versao do jogo e a mesma em js/00-core.js (GAME_BUILD), em todos os ?v= do index.html e no version.json.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..');
const core = fs.readFileSync(path.join(R, 'js/00-core.js'), 'utf8'), b = +(core.match(/const GAME_BUILD = (\d+)/) || [])[1];
const vs = [...fs.readFileSync(path.join(R, 'index.html'), 'utf8').matchAll(/\?v=(\d+)/g)].map(m => +m[1]);
const vj = JSON.parse(fs.readFileSync(path.join(R, 'version.json'), 'utf8')).build;
const bad = [];
if (!b) bad.push('GAME_BUILD nao encontrado');
if (!vs.length || vs.some(v => v !== b)) bad.push(`index.html tem ?v= diferentes de ${b}: ${[...new Set(vs)].join(', ')}`);
if (vj !== b) bad.push(`version.json tem ${vj}, GAME_BUILD e ${b}`);
if (bad.length) { console.error('Versoes desalinhadas:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`versao ${b} igual em todo o lado (${vs.length} ficheiros no index.html)`);
