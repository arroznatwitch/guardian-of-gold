// Carrega o jogo (os ficheiros de js/, pela mesma ordem do index.html) dentro do Node, sem browser.
// O desenho, o som e o ecra sao substituidos por objetos que nao fazem nada; a logica do jogo (combate, itens, atributos) corre a serio.
const vm = require('vm'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');

function noop() {}
// objeto "universal": qualquer propriedade ou chamada devolve outro objeto igual (serve para canvas, audio, DOM)
function stub() {
  const f = function () {};
  return new Proxy(f, {
    get: (t, k) => k === Symbol.toPrimitive ? () => 0 : k === 'length' ? 0 : k === 'width' || k === 'height' ? 16 : k === 'then' ? undefined : stub(),
    apply: () => stub(), construct: () => stub(), set: () => true,
  });
}
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function loadGame(opts = {}) {
  const store = {};
  const doc = { getElementById: () => stub(), createElement: () => stub(), addEventListener: noop, body: stub(), documentElement: stub(), fonts: { load: noop }, fullscreenElement: null, hidden: false };
  const sandbox = {
    Uint8Array, Uint8ClampedArray, Uint16Array, Uint32Array, Int8Array, Int16Array, Int32Array, Float32Array, Float64Array, ArrayBuffer, DataView, TextEncoder, TextDecoder, BigInt, URL, URLSearchParams, atob, btoa, structuredClone,
    crypto: require('crypto').webcrypto,
    console, Math: Object.create(Math), JSON, Date, Object, Array, Set, Map, Number, String, Symbol, Promise, Error, RegExp, parseInt, parseFloat, isNaN, isFinite,
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop, requestAnimationFrame: () => 0, cancelAnimationFrame: noop,
    document: doc, addEventListener: noop, removeEventListener: noop, innerWidth: 800, innerHeight: 500, devicePixelRatio: 1,
    performance: { now: () => 0 }, navigator: { userAgent: 'node', language: 'pt', clipboard: stub() },
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, clear: () => { for (const k in store) delete store[k]; } },
    sessionStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    AudioContext: stub(), webkitAudioContext: stub(), Audio: stub(), Image: stub(), fetch: () => Promise.resolve({ ok: false, json: async () => ({}) }),
    location: { search: '', hash: '', href: '' }, history: { replaceState: noop },
  };
  sandbox.window = sandbox; sandbox.globalThis = sandbox; sandbox.self = sandbox;
  sandbox.Math.random = rng(opts.seed === undefined ? 12345 : opts.seed);
  const ctx = vm.createContext(sandbox);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const files = [...html.matchAll(/<script src="(js\/[^"?]+)/g)].map(m => m[1]);
  if (!files.length) throw new Error('index.html nao carrega ficheiros de js/');
  for (const f of files) {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8');
    if (f.endsWith('b9-loop.js')) vm.runInContext(code.replace(/\nrequestAnimationFrame\(frame\);\s*$/, '\n'), ctx, { filename: f });   // nao arrancar o ciclo do ecra
    else vm.runInContext(code, ctx, { filename: f });
  }
  return ctx;
}
module.exports = { loadGame, rng, ROOT };
