'use strict';
/* =====================================================================
   ÁUDIO (sintetizado)
   ===================================================================== */
let ac = null, master = null, sfxBus = null, musBus = null, muted = false, musicMode = 'calm', mi = 0;
let volSfx = .8, volMus = .6, volUi = .7, uiBus = null, uiSnd = false; try { const v = JSON.parse(localStorage.getItem('bladehunter_vol') || 'null'); if (v) { volSfx = v.s; volMus = v.m; if (typeof v.u === 'number') volUi = v.u; } } catch (e) {}
function applyVol() { if (sfxBus) sfxBus.gain.value = volSfx; if (musBus) musBus.gain.value = volMus; if (uiBus) uiBus.gain.value = volUi; try { localStorage.setItem('bladehunter_vol', JSON.stringify({ s: volSfx, m: volMus, u: volUi })); } catch (e) {} }
function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ac = new AC(); master = ac.createGain(); master.gain.value = .5; master.connect(ac.destination);
  sfxBus = ac.createGain(); musBus = ac.createGain(); uiBus = ac.createGain(); sfxBus.connect(master); musBus.connect(master); uiBus.connect(master); applyVol(); musicLoop();
}
let sfxQuiet = false;   // no x2 o segundo passo de simulacao fica em silencio
function tone(f, d, type = 'square', vol = .12, slide = 0, delay = 0, bus = null) {
  if (!ac || muted || sfxQuiet) return;
  const o = ac.createOscillator(), g = ac.createGain(), s = ac.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f, s);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), s + d);
  g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(.001, s + d);
  o.connect(g); g.connect(bus || (uiSnd ? uiBus : sfxBus)); o.start(s); o.stop(s + d + .02);
}
function noise(d, vol = .2, freq = 1500) {
  if (!ac || muted || sfxQuiet) return;
  const n = Math.floor(ac.sampleRate * d), b = ac.createBuffer(1, n, ac.sampleRate), a = b.getChannelData(0);
  for (let i = 0; i < n; i++) a[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(); s.buffer = b;
  const fl = ac.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = freq;
  const g = ac.createGain(); g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(uiSnd ? uiBus : sfxBus); s.start();
}
const SFX = {
  click: () => tone(660, .06, 'square', .08),
  buy: () => { tone(523, .08, 'square', .1); tone(784, .08, 'square', .1, 0, .08); tone(1047, .15, 'square', .1, 0, .16); },
  error: () => tone(120, .18, 'sawtooth', .12, -40),
  locked: () => { tone(170, .07, 'square', .13, -50); tone(105, .13, 'square', .13, -30, .06); noise(.05, .12, 900); },
  unlock: () => { noise(.08, .2, 2500); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .2, 'square', .1, 0, .12 + i * .09)); tone(1568, .5, 'sine', .08, 0, .6); },
  ready: () => { tone(880, .08, 'sine', .13); tone(1320, .16, 'sine', .13, 0, .08); },
  slash: () => { noise(.13, .3, 2400); tone(320, .1, 'sawtooth', .07, -220); },
  arrow: () => { tone(900, .12, 'triangle', .1, -600); noise(.05, .1, 4000); },
  fire: () => { noise(.2, .22, 700); tone(200, .2, 'sawtooth', .08, 200); },
  ice: () => { tone(1200, .15, 'sine', .12, -500); tone(1800, .1, 'sine', .06, -900, .03); },
  zap: () => { noise(.12, .3, 5000); tone(1500, .1, 'sawtooth', .08, -1200); },
  arcane: () => tone(700, .16, 'sine', .12, 500),
  dark: () => { tone(150, .2, 'sawtooth', .1, 100); noise(.1, .15, 500); },
  poison: () => { tone(320, .18, 'triangle', .1, -140); noise(.08, .1, 900); },
  blood: () => { tone(130, .2, 'sawtooth', .09, 60); tone(90, .15, 'sine', .1, -40, .05); },
  thunder: () => { noise(.35, .4, 300); tone(80, .3, 'sawtooth', .15, -30); },
  hit: () => tone(170, .08, 'square', .09, -90),
  kill: () => { tone(300, .12, 'square', .1, -200); noise(.1, .15, 900); },
  hurt: () => { tone(110, .25, 'sawtooth', .18, -60); noise(.15, .25, 400); },
  coin: () => { tone(988, .05, 'square', .07); tone(1319, .09, 'square', .07, 0, .05); },
  heal: () => { tone(523, .1, 'sine', .15); tone(659, .1, 'sine', .15, 0, .08); tone(784, .15, 'sine', .15, 0, .16); },
  dash: () => noise(.15, .2, 1200),
  special: () => { tone(110, .5, 'sawtooth', .15, 500); noise(.3, .2, 800); },
  boss: () => { tone(70, 1, 'sawtooth', .22, -30); tone(75, 1, 'square', .12, -30); noise(.8, .25, 200); },
  boom: () => { noise(.4, .35, 250); tone(90, .35, 'sawtooth', .18, -50); },
  clang: () => { noise(.1, .3, 3000); tone(1500, .35, 'triangle', .15, -600); tone(2200, .25, 'sine', .08); },
  win: () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, .22, 'square', .12, 0, i * .13)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, .35, 'triangle', .18, 0, i * .22)),
};
for (const k of ['click', 'buy', 'error', 'coin']) { const f = SFX[k]; SFX[k] = (...a) => { uiSnd = true; try { f(...a); } finally { uiSnd = false; } }; }   // sons de menu: volume proprio
const MUS = { calm: { step: 280 }, battle: { step: 150 }, raid: { step: 124 }, m0: { step: 168 }, m1: { step: 154 }, m2: { step: 140 }, m3: { step: 130 }, m4: { step: 118 }, m5: { step: 106 } };   // m0..m5: um tema por mapa, cada um mais intenso e rapido
// progressao de acordes (raiz, terceira, quinta) em 8 compassos de 8 passos; a melodia e escolhida ao acaso dentro da escala
const CHORDS = {
  calm: [[110, 131, 165], [87.3, 110, 131], [131, 165, 196], [98, 123, 147], [110, 131, 165], [147, 175, 220], [82.4, 103.8, 123.5], [110, 131, 165]],
  battle: [[110, 131, 165], [110, 131, 165], [87.3, 110, 131], [98, 123, 147], [110, 131, 165], [82.4, 98, 123.5], [87.3, 110, 131], [82.4, 103.8, 123.5]],
  raid: [[82.4, 98, 123.5], [82.4, 98, 123.5], [73.4, 87.3, 110], [82.4, 103.8, 123.5], [65.4, 77.8, 98], [73.4, 87.3, 110], [87.3, 103.8, 130.8], [82.4, 98, 123.5]],   // raids: mais graves e mais rapidas
  m0: [[110, 131, 165], [87.3, 110, 131], [98, 123, 147], [110, 131, 165], [110, 131, 165], [87.3, 110, 131], [82.4, 103.8, 123.5], [110, 131, 165]],                         // Floresta: la menor, suave
  m1: [[146.8, 174.6, 220], [116.5, 146.8, 174.6], [130.8, 164.8, 196], [110, 138.6, 164.8], [146.8, 174.6, 220], [116.5, 146.8, 174.6], [110, 138.6, 164.8], [146.8, 174.6, 220]],   // Cavernas: re menor
  m2: [[82.4, 98, 123.5], [87.3, 110, 130.8], [82.4, 98, 123.5], [73.4, 87.3, 110], [82.4, 98, 123.5], [87.3, 110, 130.8], [98, 123.5, 146.8], [82.4, 98, 123.5]],              // Castelo: mi frigio, sombrio
  m3: [[69.3, 82.4, 103.8], [73.4, 87.3, 110], [65.4, 77.8, 98], [69.3, 82.4, 103.8], [77.8, 92.5, 116.5], [73.4, 87.3, 110], [65.4, 77.8, 98], [69.3, 82.4, 103.8]],            // Pantano: cromatico e pesado
  m4: [[98, 116.5, 146.8], [103.8, 130.8, 155.6], [98, 116.5, 146.8], [87.3, 110, 130.8], [98, 116.5, 146.8], [103.8, 130.8, 155.6], [110, 138.6, 164.8], [98, 116.5, 146.8]],    // Deserto: escala exotica
  m5: [[55, 65.4, 82.4], [58.3, 69.3, 87.3], [55, 65.4, 82.4], [49, 58.3, 73.4], [55, 65.4, 82.4], [58.3, 69.3, 87.3], [61.7, 73.4, 92.5], [55, 65.4, 82.4]],                     // Abismo: grave e dissonante
};
const MLV = { m0: 0, m1: 1, m2: 2, m3: 3, m4: 4, m5: 5 };   // nivel de intensidade do tema do mapa
const POOL = [262, 294, 330, 349, 392, 440, 494, 523, 587, 659, 698, 784, 880, 988];
const RHY = {
  calm: [[1, 0, 1, 0, 1, 1, 0, 0], [1, 0, 0, 1, 0, 1, 0, 1], [1, 0, 1, 0, 0, 1, 0, 0], [1, 1, 0, 0, 1, 0, 1, 0], [1, 0, 0, 0, 1, 0, 0, 1], [0, 1, 0, 1, 1, 0, 1, 0]],
  raid: [[1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1, 1], [1, 1, 1, 0, 1, 1, 0, 1]],
  m0: [[1, 0, 0, 1, 0, 1, 0, 0], [1, 0, 1, 0, 0, 1, 0, 1], [1, 0, 0, 1, 1, 0, 0, 0]],
  m1: [[1, 0, 1, 0, 1, 1, 0, 0], [1, 0, 1, 1, 0, 1, 0, 1], [1, 1, 0, 1, 0, 1, 0, 0]],
  m2: [[1, 0, 1, 1, 0, 1, 1, 0], [1, 1, 0, 1, 0, 1, 0, 1], [1, 0, 1, 0, 1, 1, 0, 1]],
  m3: [[1, 0, 1, 1, 0, 1, 1, 0], [1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 0, 1, 1, 0, 1], [1, 1, 1, 0, 1, 0, 1, 0]],
  m4: [[1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 1, 0, 1, 1, 1], [1, 1, 1, 0, 1, 1, 0, 1]],
  m5: [[1, 1, 1, 0, 1, 1, 0, 1], [1, 1, 0, 1, 1, 1, 0, 1], [1, 1, 1, 1, 0, 1, 1, 1]],
  battle: [[1, 0, 1, 1, 0, 1, 1, 0], [1, 1, 0, 1, 1, 0, 1, 1], [1, 0, 1, 0, 1, 1, 0, 1], [1, 1, 1, 0, 1, 0, 1, 0], [1, 0, 1, 1, 1, 0, 1, 1]],
};
let melK = 7, melR = null, phrase = 0;
function musicLoop() { try { musicStep(); } catch (e) { setTimeout(musicLoop, 250); } }
function musicStep() {
  const m = MUS[musicMode], i = mi++, set = CHORDS[musicMode] ? musicMode : 'calm', cs = CHORDS[set], bar = Math.floor(i / 8) % cs.length, st = i % 8, ch = cs[bar], ss = m.step / 1000;
  if (st === 0) {
    melR = RHY[set][Math.floor(Math.random() * RHY[set].length)]; if (bar === 0) phrase++;
    const tgt = ch[Math.floor(Math.random() * 3)] * (Math.random() < .5 ? 4 : 2); let bk = 0; POOL.forEach((f, k) => { if (Math.abs(f - tgt) < Math.abs(POOL[bk] - tgt)) bk = k; }); melK = bk;
  }
  if (!muted && ac) {
    if (set === 'calm') {
      if (st === 0) ch.forEach(f => tone(f * 2, ss * 7.5, 'sine', .028, 0, 0, musBus));                     // pad
      if (st === 0 || st === 4) tone(ch[0], ss * 3.2, 'triangle', .13, 0, 0, musBus);                         // baixo
      if (st === 2 || st === 6) tone(ch[2], ss * 1.5, 'triangle', .06, 0, 0, musBus);
      if (st % 2 === 1) tone(ch[(st >> 1) % 3] * 4, ss * .8, 'sine', .03, 0, 0, musBus);                      // arpejo
    } else {
      tone(ch[0] * (st % 2 ? 2 : 1), ss * 1.1, 'triangle', .12, 0, 0, musBus);
      if (st % 4 === 0) tone(70, .09, 'sine', .16, -40, 0, musBus);
      if (st === 6 && bar % 2) tone(ch[2] * 4, ss * 1.5, 'sawtooth', .02, 0, 0, musBus);
      if (set === 'raid') { if (st % 2 === 0) tone(55, .08, 'sine', .2, -30, 0, musBus); if (st === 2 || st === 5) tone(ch[1] * 2, ss * 1.2, 'sawtooth', .035, 0, 0, musBus); }   // bombo constante e stabs
      const lv = MLV[set];   // temas dos mapas: cada camada extra torna o mapa seguinte mais intenso
      if (lv !== undefined) {
        if (lv >= 1 && st % 2 === 1) tone(5200, .03, 'square', .008 + .002 * lv, 0, 0, musBus);                      // chimbal
        if (lv >= 2 && st % 2 === 0) tone(55, .08, 'sine', .18, -30, 0, musBus);                                      // bombo constante
        if (lv >= 2 && (st === 2 || st === 5)) tone(ch[1] * 2, ss * 1.2, 'sawtooth', .03, 0, 0, musBus);             // stabs
        if (lv >= 3) tone(ch[0] / 2, ss * .9, 'sawtooth', .05, 0, 0, musBus);                                         // baixo pulsante
        if (lv >= 4 && st % 2 === 0) tone(ch[(st >> 1) % 3] * 4, ss * .6, 'square', .02, 0, 0, musBus);               // arpejo rapido
        if (lv >= 5) { tone(ch[2] * 2, ss * .5, 'sawtooth', .025, 0, 0, musBus); if (st % 4 === 2) tone(48, .12, 'sawtooth', .12, -10, 0, musBus); }
      }
    }
    if (melR && melR[st]) {
      if (st !== 0) melK = Math.max(0, Math.min(POOL.length - 1, melK + [-2, -1, -1, 0, 1, 1, 2][Math.floor(Math.random() * 7)]));
      const lead = set === 'calm' ? ['triangle', .06, 1.4] : [(MLV[set] || 0) >= 4 ? 'sawtooth' : 'square', (MLV[set] || 0) >= 4 ? .034 : .04, .8];
      tone(POOL[melK], ss * lead[2], lead[0], lead[1], 0, 0, musBus);
      if (set === 'calm' && phrase % 2 === 0 && st % 4 === 0) tone(POOL[melK] / 2, ss * 2, 'sine', .03, 0, ss * .5, musBus);   // eco/harmonia nas frases pares
    }
  }
  setTimeout(musicLoop, m.step);
}
const setMusic = m => { musicMode = m; };

