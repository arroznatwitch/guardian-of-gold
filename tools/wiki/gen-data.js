#!/usr/bin/env node
// Le o jogo atual (js/*.js, sem browser) e escreve os dados da wiki: tools/wiki/wiki-data.json e tools/wiki/starfx.json
// Uso: node tools/wiki/gen-data.js   (depois: node tools/wiki/build.js para gerar wiki.html)
const vm = require('vm'), fs = require('fs'), path = require('path'), { loadGame } = require('../sim/load-game.js');
const ctx = loadGame();
const code = `({
  classes: CLASSES, skins: SKINS,
  missions: MISSIONS.map(m => ({ name: m.name, desc: m.desc, kills: m.kills, boss: m.boss, semi: m.semi, reward: m.reward, theme: m.theme })),
  anvCh: ANV_CH, recBase: REC_BASE,
  mobs: Object.fromEntries(Object.entries(MOB_DEF).map(([k, v]) => [k, { n: v.n, a: v.a }])), mobsByMap: MOB_BY_MAP,
  ach: ACH.map(a => ({ id: a.id, cat: a.cat, tier: a.tier, gems: a.gems, name: a.name, desc: a.desc, title: a.title })),
  titles: TITLES, raid: RAID_D, rar: RAR, items: ITEM_NAMES, aff: AFF, attrs: ATTRS, enc: ENC_CH, spec: SPEC_POOL, slots: SLOT_LBL, enemies: EN,
  maxlv: MAXLV, req: WEAPON_REQ,
  rarW: [0, 2, 4, 6, 8, 10].map(b => { const w = rarityWeights(b), t = w.reduce((x, y) => x + y, 0); return w.map(v => +(100 * v / t).toFixed(2)); }),
  gearStar: GEAR_STAR, starMult: STAR_MULT, wstarReq: WSTAR_REQ, xp: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map(l => [l, xpNeed(l)]),
  rewards: Array.from({ length: 120 }, (_, i) => levelReward(i + 1)),
  starfx: STAR_FX, daily: DAILY_POOL.map(p => ({ k: p.k, min: p.min || 0, pt: p.pt(p.goal(1)) })), events: EVENTS, presWave: MISSIONS.map((m, i) => presWave(i)), farmStarts: FARM_STARTS, ar: AR,
  scale: { tune: TUNE, drMax: DR_MAX, hit: [1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120].map(l => [l, +hitK(l).toFixed(2)]), maps: MISSIONS.map((m, i) => Array.from({ length: PRES_MAX + 1 }, (_, P) => { const rec = farmRec(i, P); return { rec, dm: farmK(rec).dm }; })) }, build: GAME_BUILD
})`;
const D = JSON.parse(JSON.stringify(vm.runInContext(code, ctx)));
fs.writeFileSync(path.join(__dirname, 'wiki-data.json'), JSON.stringify(D, null, 1));
fs.writeFileSync(path.join(__dirname, 'starfx.json'), JSON.stringify(D.starfx));
console.log('dados da wiki: classes', Object.keys(D.classes).length, '· conquistas', D.ach.length, '· nivel max', D.maxlv, '· versao', D.build);
