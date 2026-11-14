'use strict';
/* =====================================================================
   LABORATORIO DE BATALHA (so para contas de administrador)
   Uma arena de testes: escolhes nivel, arma e equipamento, fazes aparecer inimigos e bosses, ficas invencivel, aceleras o tempo.
   - So aparece nas Opcoes se o servidor confirmar que a conta e admin (gog_is_admin; contas listadas em gog.admins, ver server/supabase.sql).
   - E um "sandbox": trabalha numa COPIA do save e nada e gravado nem enviado (persist() e rpc() ficam desligados enquanto labOn).
   Teclas (durante o laboratorio):  1-5 arma · [ ] nivel -/+5 · L raridade do equipamento · V tipo de inimigo · B faz aparecer 5 · N boss · ; semi-boss
   J/K vida dos inimigos x0,5/x2 · U/I dano x0,5/x2 · Z invencivel · X curar · C limpar · O velocidade · ` esconder painel · 0 sair
   ===================================================================== */
let labAdmin = null, labTok = '', labBusy = false;
const LAB = { god: true, typeI: 0, bossI: 0, hpM: 1, dmM: 1, speedI: 0, rar: 2, show: true, backup: null, speed0: 1 };
const LAB_SPEEDS = [1, 2, 3, 4], LAB_RAR = ['Comum', 'Raro', 'Épico', 'Lendário', 'Mítico'];
const labTypes = () => Object.keys(EN);

// pergunta ao servidor (uma vez por sessao) se esta conta e admin
function labCheck() {
  if (!on || !on.token || labBusy || (labTok === on.token && labAdmin !== null)) return;
  labBusy = true; const tk = on.token;
  rpc('gog_is_admin', { p_token: tk }).then(r => { labBusy = false; if (on && on.token === tk) { labTok = tk; labAdmin = !!(r && r.ok && r.admin === true); } });
}
const labAllowed = () => !!(on && on.token && labTok === on.token && labAdmin === true && save);

function labStart() {
  if (!labAllowed() || labOn) return;
  LAB.backup = save; save = JSON.parse(JSON.stringify(save)); labOn = true; labGod = LAB.god = true; LAB.speed0 = gameSpeed; LAB.speedI = 0; gameSpeed = 1;
  LAB.hpM = 1; LAB.dmM = 1; LAB.typeI = 0; LAB.rar = Math.min(4, Math.floor(save.pl.lv / 20)); LAB.show = true;
  startMission(0, undefined, true); R.phase = 'lab'; R.lab = true; R.need = 1e9; R.toast = 'Laboratório de batalha'; R.toastT = 2.5;
  labBuild();
}
function labExit() {
  if (!labOn) return;
  labOn = false; labGod = false; save = LAB.backup; LAB.backup = null; gameSpeed = LAB.speed0; R = null; state = 'hub'; tab = 'options' === tab ? 'farm' : tab; setMusic('calm');
}
// recalcula atributos, arma e equipamento a partir do nivel e da raridade escolhidos
function labBuild() {
  const L = save.pl.lv, cls = save.cls, pts = 3 * (L - 1), wi = save.eq[cls] | 0, w = CLASSES[cls].weapons[wi];
  save.attr = { str: Math.round(pts * .45), vit: Math.round(pts * .25), per: Math.round(pts * .2), agi: Math.round(pts * .1) }; save.pts = 0;
  save.wl[w.id] = Math.min(12, Math.floor(L / 5)); const st = L >= 60 ? 2 : L >= 40 ? 1 : 0; save.wst[w.id] = [0, 0, 0, 0, 0, 0, 0]; save.wst[w.id][st] = 1;
  const il = Math.min(120, Math.max(1, Math.round(L * .9)));
  for (const sl of SLOTS) save.gear[sl] = genItem(sl, LAB.rar, il);
  const s = stats(); R.p.max = s.hp; R.p.hp = s.hp; R.G = gearStats(); R.hpM = LAB.hpM; R.dmgM = LAB.dmM;
}
function labToast(s) { R.toast = s; R.toastT = 1.6; }
function labKey(code) {
  const types = labTypes(); let used = true;
  switch (code) {
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5': { const i = +code.slice(5) - 1, cls = save.cls; save.own[cls][i] = 1; save.eq[cls] = i; labBuild(); labToast(CLASSES[cls].weapons[i].n); break; }
    case 'KeyY': { const ks = Object.keys(CLASSES); save.cls = ks[(ks.indexOf(save.cls) + 1) % ks.length]; save.own[save.cls] = save.own[save.cls] || []; save.own[save.cls][0] = 1; save.eq[save.cls] = save.eq[save.cls] | 0; startMission(0, undefined, true); R.phase = 'lab'; R.lab = true; R.need = 1e9; labBuild(); labToast('Classe: ' + CLASSES[save.cls].name); break; }   // troca de classe (recomeca a arena)
    case 'BracketLeft': save.pl.lv = Math.max(1, save.pl.lv - 5); labBuild(); labToast('Nível ' + save.pl.lv); break;
    case 'BracketRight': save.pl.lv += 5; labBuild(); labToast('Nível ' + save.pl.lv); break;
    case 'KeyL': LAB.rar = (LAB.rar + 1) % 5; labBuild(); labToast('Equipamento ' + LAB_RAR[LAB.rar]); break;
    case 'KeyV': LAB.typeI = (LAB.typeI + 1) % types.length; labToast('Inimigo: ' + types[LAB.typeI]); break;
    case 'KeyB': for (let i = 0; i < 5; i++) spawnEdge(types[LAB.typeI]); break;
    case 'KeyN': if (!R.boss) { R.m = LAB.bossI++ % 6; spawnBoss(false); R.phase = 'lab'; labToast(R.boss.name); } break;   // cada N chama o boss seguinte
    case 'Semicolon': if (!R.boss) { spawnBoss(true); R.phase = 'lab'; } break;
    case 'KeyJ': LAB.hpM /= 2; R.hpM = LAB.hpM; labToast('Vida dos inimigos ×' + LAB.hpM); break;
    case 'KeyK': LAB.hpM *= 2; R.hpM = LAB.hpM; labToast('Vida dos inimigos ×' + LAB.hpM); break;
    case 'KeyU': LAB.dmM /= 2; R.dmgM = LAB.dmM; labToast('Dano dos inimigos ×' + LAB.dmM); break;
    case 'KeyI': LAB.dmM *= 2; R.dmgM = LAB.dmM; labToast('Dano dos inimigos ×' + LAB.dmM); break;
    case 'KeyZ': labGod = LAB.god = !labGod; labToast(labGod ? 'Invencível: ligado' : 'Invencível: desligado'); break;
    case 'KeyX': R.p.hp = R.p.max; break;
    case 'KeyC': R.enemies.length = 0; R.projs.length = 0; R.tels.length = 0; R.zones.length = 0; R.boss = null; R.phase = 'lab'; break;
    case 'KeyO': LAB.speedI = (LAB.speedI + 1) % LAB_SPEEDS.length; gameSpeed = LAB_SPEEDS[LAB.speedI]; labToast('Velocidade ×' + gameSpeed); break;
    case 'Backquote': LAB.show = !LAB.show; break;
    case 'Digit0': labExit(); break;
    default: used = false;
  }
  return used;
}
function drawLab() {
  if (!labOn || !R || !LAB.show) return;
  const types = labTypes(), w = curW(), x = 10, y = 118, wd = 236, ln = [
    ['LABORATÓRIO (nada é guardado)', '#7fe8ff', 12],
    [`Nível ${save.pl.lv}   ( [ ] = ±5 )`, '#fff', 11], [`Classe: ${CLASSES[save.cls].name}   ( Y )`, '#fff', 11], [`Arma: ${w.n}   ( 1-5 )`, '#fff', 11], [`Equipamento: ${LAB_RAR[LAB.rar]}   ( L )`, '#fff', 11],
    [`Inimigo: ${types[LAB.typeI]}   ( V troca · B faz 5 )`, '#fd5', 11], ['Boss: N · Semi-boss: ;', '#fd5', 11],
    [`Vida ×${LAB.hpM}  ( J K )   Dano ×${LAB.dmM}  ( U I )`, '#fff', 11], [`Velocidade ×${gameSpeed}   ( O )`, '#fff', 11],
    [`Invencível: ${labGod ? 'SIM' : 'não'}   ( Z )   Curar X · Limpar C`, labGod ? '#6f6' : '#f88', 11], ['0 = sair   ·   ` = esconder', '#9ab', 11],
  ];
  ctx.globalAlpha = .82; rr(x - 4, y - 14, wd + 8, ln.length * 15 + 12, 6); ctx.fillStyle = '#000b'; ctx.fill(); ctx.globalAlpha = 1;
  ln.forEach((l, i) => txt(l[0], x, y + i * 15, l[2], l[1], 'left', i ? 'normal' : 'bold'));
}
