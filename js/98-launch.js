'use strict';
/* =====================================================================
   LANCAMENTO: erros, relato de problemas, estatisticas anonimas, avisos legais
   - Estatisticas: so contadores por dia (gog_ping), sem cookies, sem identificadores e sem IP. Respeita "Do Not Track".
   - Relato de problema: o jogador escreve e decide o que enviar (informacao tecnica, nick). Nada sai sem carregar em Enviar.
   ===================================================================== */
const REPO_URL = 'https://github.com/arroznatwitch/guardian-of-gold';
const errLog = [];
function logErr(m) { try { errLog.push(String(m).slice(0, 300)); if (errLog.length > 8) errLog.shift(); } catch (e) {} }
addEventListener('error', e => { if (e.target && e.target !== window) return; logErr((e.message || 'erro') + ' @' + String(e.filename || '').split('/').pop() + ':' + (e.lineno || 0)); });
addEventListener('unhandledrejection', e => logErr('promise: ' + (e.reason && e.reason.message || e.reason)));

/* ---------- estatisticas anonimas (contadores) ---------- */
const pinged = {};
const dnt = (() => { try { return navigator.doNotTrack === '1' || window.doNotTrack === '1'; } catch (e) { return false; } })();
function ping(ev, once) {
  try {
    if (dnt || !ONLINE_URL || !ONLINE_KEY || labOn || autoSim) return;
    const k = ev + (touchMode ? ':m' : ':d'); if (once) { if (pinged[k]) return; pinged[k] = 1; }
    fetch(`${ONLINE_URL}/rest/v1/rpc/gog_ping`, { method: 'POST', headers: { apikey: ONLINE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_ev: k }), keepalive: true }).catch(() => {});
  } catch (e) {}
}
ping('open', true);
setTimeout(() => ping('play5', true), 5 * 60000); setTimeout(() => ping('play20', true), 20 * 60000);

/* ---------- ecra de arranque ---------- */
let booted = false;
function bootDone() { if (booted) return; booted = true; const b = document.getElementById('boot'); if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 400); } }

/* ---------- aviso de dados guardados (so informa; nao ha cookies de rastreio) ---------- */
(function notice() {
  try { if (localStorage.getItem('gog_notice') === '1') return; } catch (e) { return; }
  const n = document.getElementById('notice'); if (!n) return; n.style.display = 'flex';
  if (lang === 'en') { const sp = n.querySelector('span'); if (sp) sp.innerHTML = 'This game stores your progress and settings in your browser (localStorage) and, if you create an account, your nick, country and progress on our servers. No tracking cookies. <a href="privacy.html" target="_blank" rel="noopener">Privacy</a> · <a href="terms.html" target="_blank" rel="noopener">Terms</a>'; }   // aviso em ingles
  const ok = document.getElementById('notice-ok'); if (ok) ok.onclick = () => { n.style.display = 'none'; try { localStorage.setItem('gog_notice', '1'); } catch (e) {} };
})();

/* ---------- ligacoes legais no menu e nas opcoes ---------- */
const LEGAL = [['Privacidade', 'Privacy', 'privacy.html'], ['Termos', 'Terms', 'terms.html'], ['Reportar problema', 'Report a problem', null]];
function legalLinks() {
  let x = 10; const y = H - 10;
  for (const [pt, en, url] of LEGAL) {
    const label = lang === 'en' ? en : pt, w = txtW(label, 11, 'normal') + 8;
    txt(label, x, y, 11, '#7f8fb0', 'left'); ctx.fillStyle = '#7f8fb0'; ctx.globalAlpha = .5; ctx.fillRect(x, y + 2, w - 8, 1); ctx.globalAlpha = 1;
    ui.push({ x, y: y - 14, w, h: 22, fn: () => { if (url) window.open(url, '_blank', 'noopener'); else openReport(); } });
    x += w + 14;
  }
}
const _dm = drawMenu, _do = drawOptions, _dl = drawLogin;
drawMenu = function () { _dm.apply(this, arguments); legalLinks(); };
drawOptions = function () { _do.apply(this, arguments); legalLinks(); };
drawLogin = function () { _dl.apply(this, arguments); legalLinks(); };

/* ---------- relato de problema ---------- */
function openReport() {
  if (document.getElementById('rep')) return;
  const d = document.createElement('div'); d.id = 'rep';
  const box = document.createElement('div'); box.className = 'repbox'; d.appendChild(box);
  const el = (tag, txt, cls) => { const e = document.createElement(tag); if (txt) e.textContent = txt; if (cls) e.className = cls; return e; };
  const en = lang === 'en';
  box.appendChild(el('h3', en ? 'Report a problem' : 'Reportar um problema'));
  box.appendChild(el('p', en ? 'Tell us what happened. Nothing is sent until you press Send.' : 'Conta-nos o que aconteceu. Nada é enviado até carregares em Enviar.'));
  const ta = document.createElement('textarea'); ta.maxLength = 1000; ta.rows = 5; ta.placeholder = en ? 'What happened? What were you doing?' : 'O que aconteceu? O que estavas a fazer?'; box.appendChild(ta);
  const lab = (checked, text) => { const l = el('label'); const c = document.createElement('input'); c.type = 'checkbox'; c.checked = checked; l.appendChild(c); l.appendChild(document.createTextNode(' ' + text)); box.appendChild(l); return c; };
  const cTech = lab(true, en ? 'Include technical info (version, browser, last errors)' : 'Incluir informação técnica (versão, navegador, últimos erros)');
  const cNick = on && on.token ? lab(false, en ? 'Include my nickname so you can reply / fix my account' : 'Incluir o meu nick (para poderes ver a minha conta)') : null;
  const st = el('div', '', 'repst'); box.appendChild(st);
  const row = el('div', '', 'reprow'); box.appendChild(row);
  const send = el('button', en ? 'Send' : 'Enviar'), cancel = el('button', en ? 'Cancel' : 'Cancelar'); row.appendChild(send); row.appendChild(cancel);
  const close = () => { d.remove(); };
  cancel.onclick = close;
  d.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close(); }); d.addEventListener('keyup', e => e.stopPropagation());
  send.onclick = async () => {
    const msg = ta.value.trim(); if (msg.length < 5) { st.textContent = en ? 'Write a few words first.' : 'Escreve pelo menos umas palavras.'; return; }
    send.disabled = true; st.textContent = en ? 'Sending...' : 'A enviar...';
    const ctxo = cTech.checked ? { build: GAME_BUILD, ua: String(navigator.userAgent).slice(0, 200), touch: touchMode, state, lang, view: innerWidth + 'x' + innerHeight, errs: errLog.slice(-5), last: window.__lastErr || null } : { build: GAME_BUILD };
    const r = await rpc('gog_report', { p_msg: msg, p_ctx: ctxo, p_token: cNick && cNick.checked ? on.token : null });
    if (r.ok) { st.textContent = en ? 'Thank you! Report sent.' : 'Obrigado! Relato enviado.'; setTimeout(close, 1400); }
    else { send.disabled = false; st.textContent = r.error === 'busy' ? (en ? 'Too many reports. Try again later.' : 'Demasiados relatos. Tenta mais tarde.') : (en ? 'Could not send. Open an issue on GitHub instead.' : 'Não foi possível enviar. Podes abrir um issue no GitHub.'); }
  };
  document.body.appendChild(d); ta.focus();
}
