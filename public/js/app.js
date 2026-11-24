import { componiRilievo, GRAVITA, VERSIONE_CATALOGO } from "./catalogo.js";
import { analisiSimulata } from "./demo.js";
import { generaPDF } from "./report.js";

// ---------------------------------------------------------------------
//  Stato dell'app (resta sul telefono, nessun database)
// ---------------------------------------------------------------------
const state = {
  sessione: null,   // { ispettore, cantiere, area, codice, demo, inizio }
  foto: [],         // { id, dataUrl, ora, area, stato: 'analisi'|'ok'|'errore', esito, messaggio, rilievi[] }
  note: "",
  firma: null,      // dataURL della firma
  pdf: null,        // { blob, nome }
};
const pila = [];    // navigazione
let vista = { nome: "login" };

const $app = document.getElementById("app");
const $cam = document.getElementById("inputCamera");
const $gal = document.getElementById("inputGalleria");

const ICONA_LOGO = `<svg width="44" height="44" viewBox="0 0 48 48" fill="none"><path d="M24 4 7 10v12c0 11 7.3 19.6 17 22 9.7-2.4 17-11 17-22V10L24 4Z" fill="#FFC400"/><path d="M24 15v12" stroke="#0F2A44" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="33" r="2.6" fill="#0F2A44"/></svg>`;

// ---------------------------------------------------------------------
//  Utilità
// ---------------------------------------------------------------------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ora = (d = new Date()) => d.toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const soloOra = (d) => new Date(d).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const uid = () => Math.random().toString(36).slice(2, 10);

function salva(chiave, valore) { try { localStorage.setItem(chiave, JSON.stringify(valore)); } catch (_) {} }
function leggi(chiave) { try { return JSON.parse(localStorage.getItem(chiave) || "null"); } catch (_) { return null; } }

function toast(msg, ms = 2400) {
  const t = document.createElement("div");
  t.className = "toast"; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}

function vai(nuova) {
  pila.push(vista);
  vista = nuova;
  history.pushState({ n: pila.length }, "");
  render();
  window.scrollTo(0, 0);
}
function indietro() {
  if (pila.length) { history.back(); }
}
window.addEventListener("popstate", () => {
  if (pila.length) { vista = pila.pop(); render(); window.scrollTo(0, 0); }
});

function rilieviAttivi() {
  return state.foto.flatMap((f) => (f.rilievi || []).map((r, i) => ({ f, r, i }))).filter(({ r }) => r.stato !== "Scartato");
}
function conteggi(lista) {
  const c = { alta: 0, media: 0, bassa: 0 };
  lista.forEach(({ r }) => c[r.gravita]++);
  return c;
}

// ---------------------------------------------------------------------
//  Foto: compressione prima dell'invio
// ---------------------------------------------------------------------
function caricaImmagine(file) {
  return new Promise((ok, ko) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { ok(img); URL.revokeObjectURL(url); };
    img.onerror = () => { ko(new Error("Formato foto non leggibile")); URL.revokeObjectURL(url); };
    img.src = url;
  });
}
async function comprimi(file, lato = 1568, qualita = 0.82) {
  const img = await caricaImmagine(file);
  const k = Math.min(1, lato / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  return c.toDataURL("image/jpeg", qualita);
}

// ---------------------------------------------------------------------
//  Analisi AI
// ---------------------------------------------------------------------
async function chiediAnalisi(dataUrl) {
  if (state.sessione.demo) return analisiSimulata();
  const base64 = dataUrl.split(",")[1];
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 70000);
  try {
    const r = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json", "x-codice-accesso": state.sessione.codice || "" },
      body: JSON.stringify({ immagine: base64, mediaType: "image/jpeg" }),
      signal: ctrl.signal,
    });
    let dati = {};
    try { dati = await r.json(); } catch (_) {}
    if (!r.ok) throw new Error(dati.errore || `Errore ${r.status}`);
    return dati;
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Tempo scaduto: connessione lenta. Riprova.");
    if (!navigator.onLine) throw new Error("Nessuna connessione dati. Riprova quando c'è campo.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function nuovaFoto(file) {
  if (!file) return;
  let dataUrl;
  try { dataUrl = await comprimi(file); }
  catch (e) { toast("Foto non leggibile. Riprova."); return; }

  const f = { id: uid(), dataUrl, ora: Date.now(), area: state.sessione.area || "", stato: "analisi", rilievi: [] };
  state.foto.push(f);
  vai({ nome: "risultati", fotoId: f.id });
  await analizza(f);
}

async function analizza(f) {
  f.stato = "analisi"; f.errore = "";
  if (vista.nome === "risultati" && vista.fotoId === f.id) render();
  try {
    const out = await chiediAnalisi(f.dataUrl);
    f.esito = out.esito;
    f.messaggio = out.messaggio || "";
    f.rilievi = (out.rilievi || []).map(componiRilievo).filter(Boolean)
      .sort((a, b) => GRAVITA[a.gravita].ordine - GRAVITA[b.gravita].ordine);
    f.stato = "ok";
  } catch (e) {
    f.stato = "errore";
    f.errore = e.message || "Errore durante l'analisi";
  }
  state.pdf = null;
  if (vista.nome === "risultati" && vista.fotoId === f.id) render();
}

$cam.addEventListener("change", (e) => { const file = e.target.files[0]; e.target.value = ""; nuovaFoto(file); });
$gal.addEventListener("change", (e) => { const file = e.target.files[0]; e.target.value = ""; nuovaFoto(file); });

// ---------------------------------------------------------------------
//  Componenti comuni
// ---------------------------------------------------------------------
function topbar(titolo, sub = "", back = true) {
  return `<header class="topbar">
    ${back ? `<button class="back" data-act="back" aria-label="Indietro">‹ <span>Indietro</span></button>` : ""}
    <h1>${esc(titolo)}${sub ? `<span class="sub">${esc(sub)}</span>` : ""}</h1>
  </header>${state.sessione?.demo ? `<div class="demo-flag">MODALITÀ PROVA · RISULTATI SIMULATI, NON AI</div>` : ""}`;
}

function pillsFoto(f) {
  if (f.stato === "analisi") return `<span class="pill grey">Analisi…</span>`;
  if (f.stato === "errore") return `<span class="pill alta">Errore</span>`;
  if (!f.rilievi.length) return `<span class="pill ok">Nessun rischio previsto</span>`;
  const c = conteggi(f.rilievi.filter((r) => r.stato !== "Scartato").map((r) => ({ r })));
  return ["alta", "media", "bassa"].filter((g) => c[g]).map((g) => `<span class="pill ${g}">${c[g]} ${GRAVITA[g].etichetta.toLowerCase()}</span>`).join("");
}

// ---------------------------------------------------------------------
//  Schermate
// ---------------------------------------------------------------------
function vistaLogin() {
  const p = leggi("sai_login") || {};
  return `
  <div class="page">
    <div class="login-hero">
      <img class="logo-img" src="/icons/icon-512.png" alt="" width="112" height="112">
      <h2>SAIF</h2>
      <div class="claim">Safety AI in the Field</div>
      <p class="motto">Scan the area,<br>Spot the hazards,<br>Eliminate the causes.</p>
    </div>
    <form id="fLogin" class="card" style="display:flex;flex-direction:column;gap:12px">
      <div class="field"><label for="ispettore">Ispettore</label>
        <input id="ispettore" name="ispettore" required autocomplete="name" value="${esc(p.ispettore || "")}" placeholder="Nome e cognome"></div>
      <div class="field"><label for="cantiere">Cantiere</label>
        <input id="cantiere" name="cantiere" required value="${esc(p.cantiere || "")}" placeholder="Es. Residenza Via Roma 12"></div>
      <div class="field"><label for="area">Area / zona (facoltativo)</label>
        <input id="area" name="area" value="${esc(p.area || "")}" placeholder="Es. Solaio 2° piano"></div>
      <div class="field"><label for="codice">Codice di accesso</label>
        <input id="codice" name="codice" type="password" value="${esc(p.codice || "")}" autocomplete="off"></div>
      <label class="check-row"><input type="checkbox" name="demo" ${p.demo ? "checked" : ""}> Modalità prova (risultati simulati, senza AI)</label>
      <button class="btn btn-primary" type="submit">Entra</button>
    </form>
    <p class="disclaimer">Versione dimostrativa · ${esc(VERSIONE_CATALOGO)}</p>
  </div>`;
}

function vistaIspezione() {
  const s = state.sessione;
  const att = rilieviAttivi();
  const c = conteggi(att);
  const lista = state.foto.slice().reverse().map((f) => `
    <div class="card foto-item" data-act="apriFoto" data-id="${f.id}">
      <img src="${f.dataUrl}" alt="">
      <div class="info">
        <div class="t">Foto delle ${soloOra(f.ora)}${f.area ? ` · ${esc(f.area)}` : ""}</div>
        <div class="pills">${pillsFoto(f)}</div>
      </div>
      <div class="chev" style="color:#A0AAB6;font-size:22px">›</div>
    </div>`).join("");

  return `
  ${topbar("Ispezione in corso", s.cantiere, false)}
  <div class="page">
    <div class="card site-card">
      <b>Ispettore</b><span>${esc(s.ispettore)}</span>
      <b>Cantiere</b><span>${esc(s.cantiere)}</span>
      <b>Inizio</b><span>${esc(ora(new Date(s.inizio)))}</span>
    </div>
    <div class="field"><label for="areaCorr">Area della prossima foto</label>
      <input id="areaCorr" value="${esc(s.area || "")}" placeholder="Es. Ponteggio lato nord"></div>
    <button class="btn btn-primary btn-big" data-act="camera">📷 Scatta foto</button>
    <button class="btn btn-secondary" data-act="galleria">🖼️ Scegli dalla galleria</button>

    ${state.foto.length ? `
      <div class="counters">
        <div class="counter alta"><span class="n">${c.alta}</span><span class="l">Alto</span></div>
        <div class="counter media"><span class="n">${c.media}</span><span class="l">Medio</span></div>
        <div class="counter bassa"><span class="n">${c.bassa}</span><span class="l">Basso</span></div>
      </div>
      <h3 style="margin:6px 0 0;font-size:15px">Foto analizzate (${state.foto.length})</h3>
      ${lista}
      <button class="btn btn-primary" data-act="report">📄 Chiudi ispezione e crea report</button>
    ` : `<p class="muted center">Inquadra l'area di lavoro e scatta una foto: l'AI segnala i rischi previsti.</p>`}
    <button class="btn btn-ghost" data-act="esci">Esci</button>
  </div>`;
}

function vistaRisultati() {
  const f = state.foto.find((x) => x.id === vista.fotoId);
  if (!f) return vistaIspezione();
  const sub = `${soloOra(f.ora)}${f.area ? " · " + f.area : ""}`;

  if (f.stato === "analisi") {
    return `${topbar("Analisi foto", sub)}
    <div class="page"><div class="analisi">
      <img src="${f.dataUrl}" alt="Foto in analisi">
      <div class="spinner"></div>
      <div><b>Analisi in corso…</b><div class="muted center">Pochi secondi</div></div>
    </div></div>`;
  }

  let corpo = "";
  if (f.stato === "errore") {
    corpo = `<div class="esito-box err"><b>Analisi non riuscita.</b><br>${esc(f.errore)}</div>
      <button class="btn btn-primary" data-act="riprova" data-id="${f.id}">↻ Riprova</button>`;
  } else if (f.esito === "foto_non_idonea") {
    corpo = `<div class="esito-box warn"><b>Foto non idonea.</b><br>${esc(f.messaggio || "La foto non mostra un'area di lavoro. Scatta un'altra foto.")}</div>`;
  } else if (!f.rilievi.length) {
    corpo = `<div class="esito-box ok"><b>Nessuno dei rischi previsti rilevato in questa foto.</b><br>
      <span class="muted">Questo non significa che l'area sia sicura: la verifica resta dell'ispettore.</span></div>`;
  } else {
    corpo = `<h3 style="margin:2px 0 0;font-size:15px">${f.rilievi.length} ${f.rilievi.length === 1 ? "rilievo" : "rilievi"} · dal più grave</h3>` +
      f.rilievi.map((r, i) => `
      <div class="rilievo-card ${r.stato === "Scartato" ? "scartato" : ""}" data-act="apriRilievo" data-id="${f.id}" data-i="${i}">
        <div class="stripe ${r.gravita}"></div>
        <div class="body">
          <div class="titolo ${r.gravita}">${esc(r.titolo)}</div>
          <div class="desc">${esc(r.descrizione)}</div>
          ${r.certezza === "verifica_necessaria" ? `<span class="tag verifica">VERIFICA NECESSARIA</span>` : ""}
          ${r.fuoriServizio.attivo ? `<span class="tag fs">FUORI SERVIZIO</span>` : ""}
          <span class="tag stato">${esc(r.stato)}</span>
          <div class="apri">Tocca per azioni e dettagli ›</div>
        </div>
        <div class="chev">›</div>
      </div>`).join("");
  }

  return `${topbar("Risultato foto", sub)}
  <div class="page with-bar">
    <div class="foto-header"><img src="${f.dataUrl}" alt="Foto analizzata"></div>
    ${corpo}
    <p class="disclaimer">L'app è un supporto: la valutazione e la decisione restano dell'ispettore.</p>
  </div>
  <div class="bottombar two"><div class="inner">
    <button class="btn btn-secondary" data-act="home">Ispezione</button>
    <button class="btn btn-primary" data-act="camera">📷 Nuova foto</button>
  </div></div>`;
}

function vistaDettaglio() {
  const f = state.foto.find((x) => x.id === vista.fotoId);
  const r = f?.rilievi[vista.i];
  if (!r) return vistaIspezione();
  const icona = r.gravita === "alta" ? "⛔" : "⚠️";

  const fs = r.fuoriServizio;
  const bloccoFS = fs.proponi ? `
    <div class="sez rosso">
      <h4>⛔ Metti area fuori servizio</h4>
      <p>${esc(fs.messaggio)}</p>
      ${fs.attivo
        ? `<p><b>Area messa fuori servizio</b> alle ${esc(soloOra(fs.ora))}.</p>
           <button class="btn btn-secondary" data-act="fs" style="margin-top:6px">Annulla fuori servizio</button>`
        : `<button class="btn btn-danger" data-act="fs" style="margin-top:6px">Metti area fuori servizio</button>`}
    </div>` : (fs.nota ? `<div class="sez rosso"><h4>Fuori servizio</h4><p>${esc(fs.nota)}</p></div>` : "");

  const vistoAI = `
    <div class="sez arancio">
      <h4>👁️ Cosa si vede nella foto</h4>
      <p>${esc(r.cosaSiVede)}</p>
      ${r.elementiMancanti.length ? `<div class="kv"><b style="color:var(--arancio)">Manca:</b> ${esc(r.elementiMancanti.join(", "))}</div>` : ""}
      ${r.elementiPresenti.length ? `<div class="kv"><b style="color:var(--arancio)">Presente:</b> ${esc(r.elementiPresenti.join(", "))}</div>` : ""}
      ${r.personaEsposta ? `<div class="kv"><b style="color:var(--alta)">Persona esposta al pericolo</b></div>` : ""}
      ${r.certezza === "verifica_necessaria" ? `<div class="kv"><span class="tag verifica">VERIFICA NECESSARIA</span> ${esc(r.richiestaFoto || "Scattare una foto più vicina o da un'altra angolazione.")}</div>` : ""}
      ${r.nota ? `<div class="kv"><b style="color:var(--navy)">Nota ispettore:</b> ${esc(r.nota)}</div>` : ""}
    </div>`;

  const suggerimento = `
    <div class="sez verde">
      <h4>✅ Suggerimento AI</h4>
      <p>${esc(r.suggerimento)}</p>
      <div class="kv"><b>Requisito:</b> ${esc(r.requisito)}</div>
      <div class="kv"><b>Tipo:</b> ${esc(r.tipo)}</div>
      <div class="kv"><b>Riferimento:</b> ${/verificare/i.test(r.riferimento) ? `<span class="rif-dav">${esc(r.riferimento)}</span>` : esc(r.riferimento)}</div>
    </div>`;

  const azioni = `
    <div class="sez blu">
      <h4>☑️ Azioni immediate</h4>
      ${r.azioni.map((a, k) => `
        <label class="azione ${a.fatto ? "done" : ""}">
          <input type="checkbox" data-act="azione" data-k="${k}" ${a.fatto ? "checked" : ""}>
          <span>${esc(a.testo)}</span>
        </label>`).join("")}
    </div>`;

  const stato = `
    <div class="statusrow">
      <div><b>Stato</b>${esc(r.stato)}</div>
      <div><b>Priorità</b><span style="color:var(--${r.gravita === "bassa" ? "bassa" : r.gravita})">${esc(r.priorita)}</span></div>
      <div><b>SLA</b>${esc(r.sla)}</div>
    </div>`;

  return `${topbar("Dettaglio rilievo", `Scheda ${r.schedaN}`)}
  <div class="banner ${r.gravita}">
    <div class="ico">${icona}</div>
    <div><div class="t">${esc(r.titolo)}</div><div class="d">${esc(r.descrizione)}</div></div>
  </div>
  <div class="meta">
    <div><b>Area</b>${esc(f.area || state.sessione.cantiere)}</div>
    <div><b>Data e ora</b>${esc(ora(new Date(f.ora)))}</div>
    <div><b>Fonte</b>Foto ispettore</div>
  </div>
  <div class="foto-wrap">
    <img src="${f.dataUrl}" alt="Foto del rilievo">
    <div class="overlay">${esc(r.testoFoto)}</div>
  </div>
  <div class="det-body" style="padding-bottom:calc(96px + var(--safe-bottom))">
    ${vistoAI}
    ${suggerimento}
    ${azioni}
    ${bloccoFS}
    ${stato}
    <button class="btn btn-secondary" data-act="back">‹ Torna alla lista dei rischi</button>
  </div>
  <div class="bottombar"><div class="inner">
    <button data-act="conferma" class="${r.stato === "Confermato" || r.stato === "Modificato" ? "on-ok" : ""}"><span class="i">✔︎</span>Conferma</button>
    <button data-act="modifica"><span class="i">✎</span>Modifica</button>
    <button data-act="scarta" class="${r.stato === "Scartato" ? "on-ko" : ""}"><span class="i">✕</span>Scarta</button>
    <button data-act="camera"><span class="i">📷</span>Altra foto</button>
  </div></div>`;
}

function vistaReport() {
  const s = state.sessione;
  const att = rilieviAttivi();
  const c = conteggi(att);
  const daValutare = att.filter(({ r }) => r.stato === "Da valutare").length;
  const fsAttivi = att.filter(({ r }) => r.fuoriServizio.attivo).length;

  return `${topbar("Report ispezione", s.cantiere)}
  <div class="page">
    <div class="card site-card">
      <b>Cantiere</b><span>${esc(s.cantiere)}</span>
      <b>Ispettore</b><span>${esc(s.ispettore)}</span>
      <b>Data</b><span>${esc(ora())}</span>
      <b>Foto</b><span>${state.foto.length}</span>
      <b>Rilievi</b><span>${att.length}${fsAttivi ? ` · ${fsAttivi} fuori servizio` : ""}</span>
    </div>
    <div class="counters">
      <div class="counter alta"><span class="n">${c.alta}</span><span class="l">Alto</span></div>
      <div class="counter media"><span class="n">${c.media}</span><span class="l">Medio</span></div>
      <div class="counter bassa"><span class="n">${c.bassa}</span><span class="l">Basso</span></div>
    </div>
    ${daValutare ? `<div class="esito-box warn">${daValutare} ${daValutare === 1 ? "rilievo è ancora" : "rilievi sono ancora"} da valutare. Nel report compariranno come "Da valutare". I rilievi scartati non compaiono.</div>` : ""}
    <div class="field"><label for="note">Note dell'ispettore</label>
      <textarea id="note" placeholder="Osservazioni generali, opere provvisionali messe in atto, persone informate…">${esc(state.note)}</textarea></div>
    <div class="field"><label>Firma</label>
      <div class="firma-wrap"><canvas id="firma"></canvas><button class="clear" data-act="cancellaFirma">Cancella</button><span class="ph">Firma con il dito</span></div></div>
    <div id="pdfBtns" style="display:flex;flex-direction:column;gap:10px">${pulsantiPdf()}</div>
    <button class="btn btn-ghost" data-act="nuovaIspezione">Nuova ispezione</button>
  </div>`;
}

// ---------------------------------------------------------------------
//  Render
// ---------------------------------------------------------------------
function render() {
  const viste = { login: vistaLogin, ispezione: vistaIspezione, risultati: vistaRisultati, dettaglio: vistaDettaglio, report: vistaReport };
  $app.innerHTML = (viste[vista.nome] || vistaLogin)();
  if (vista.nome === "login") {
    document.getElementById("fLogin").addEventListener("submit", entra);
  }
  if (vista.nome === "ispezione") {
    const a = document.getElementById("areaCorr");
    a?.addEventListener("input", () => { state.sessione.area = a.value; });
  }
  if (vista.nome === "report") initReport();
}

function entra(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  const dati = {
    ispettore: fd.get("ispettore").trim(),
    cantiere: fd.get("cantiere").trim(),
    area: fd.get("area").trim(),
    codice: fd.get("codice").trim(),
    demo: fd.get("demo") === "on",
  };
  salva("sai_login", dati);
  state.sessione = { ...dati, inizio: Date.now() };
  vista = { nome: "ispezione" };
  history.replaceState({ n: 0 }, "");
  render();
}

// ---------------------------------------------------------------------
//  Report: note, firma, PDF
// ---------------------------------------------------------------------
function initReport() {
  const note = document.getElementById("note");
  note.addEventListener("input", () => { state.note = note.value; state.pdf = null; aggiornaPulsantiPdf(); });

  const cv = document.getElementById("firma");
  const dpr = window.devicePixelRatio || 1;
  const box = cv.getBoundingClientRect();
  cv.width = box.width * dpr; cv.height = box.height * dpr;
  const ctx = cv.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#0F2A44";
  if (state.firma) {
    const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, box.width, box.height); im.src = state.firma;
    cv.parentElement.querySelector(".ph").style.display = "none";
  }
  let disegno = false;
  const pos = (ev) => { const b = cv.getBoundingClientRect(); return [ev.clientX - b.left, ev.clientY - b.top]; };
  cv.addEventListener("pointerdown", (ev) => { disegno = true; cv.setPointerCapture(ev.pointerId); const [x, y] = pos(ev); ctx.beginPath(); ctx.moveTo(x, y); cv.parentElement.querySelector(".ph").style.display = "none"; });
  cv.addEventListener("pointermove", (ev) => { if (!disegno) return; const [x, y] = pos(ev); ctx.lineTo(x, y); ctx.stroke(); });
  const fine = () => { if (!disegno) return; disegno = false; state.firma = cv.toDataURL("image/png"); state.pdf = null; aggiornaPulsantiPdf(); };
  cv.addEventListener("pointerup", fine); cv.addEventListener("pointercancel", fine);
}
function pulsantiPdf() {
  return state.pdf
    ? `<button class="btn btn-primary btn-big" data-act="condividi">📤 Condividi PDF</button>
       <button class="btn btn-secondary" data-act="scarica">⬇️ Scarica PDF</button>
       <button class="btn btn-ghost" data-act="creaPdf">Rigenera PDF</button>`
    : `<button class="btn btn-primary btn-big" data-act="creaPdf">📄 Crea PDF</button>`;
}
function aggiornaPulsantiPdf() {
  // se cambiano note o firma il PDF va rigenerato: aggiorno solo i pulsanti (il campo note mantiene il focus)
  const box = document.getElementById("pdfBtns");
  if (box) box.innerHTML = pulsantiPdf();
}

async function creaPdf() {
  try {
    const att = rilieviAttivi();
    const blob = await generaPDF({ sessione: state.sessione, foto: state.foto, rilievi: att, note: state.note, firma: state.firma });
    const data = new Date().toISOString().slice(0, 10);
    const nomeCantiere = state.sessione.cantiere.replace(/[^\w\d]+/g, "_").slice(0, 40);
    state.pdf = { blob, nome: `Report_Safety_${nomeCantiere}_${data}.pdf` };
    aggiornaPulsantiPdf();
    toast("PDF pronto");
  } catch (e) {
    console.error(e);
    toast("Errore nella creazione del PDF");
  }
}
async function condividi() {
  const { blob, nome } = state.pdf;
  const file = new File([blob], nome, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "Report ispezione safety", text: `Report ispezione - ${state.sessione.cantiere}` });
    } catch (e) { if (e.name !== "AbortError") scarica(); }
  } else {
    scarica();
  }
}
function scarica() {
  const { blob, nome } = state.pdf;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

// ---------------------------------------------------------------------
//  Modale "Modifica"
// ---------------------------------------------------------------------
function apriModifica(r) {
  const bg = document.createElement("div");
  bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal">
    <h3>Modifica rilievo</h3>
    <div class="field"><label>Descrizione</label><textarea id="mDesc">${esc(r.descrizione)}</textarea></div>
    <div class="field"><label>Testo sulla foto</label><input id="mFoto" value="${esc(r.testoFoto)}"></div>
    <div class="field"><label>Nota dell'ispettore</label><textarea id="mNota" placeholder="Es. opere provvisionali messe in atto">${esc(r.nota)}</textarea></div>
    <div class="row"><button class="btn btn-secondary" id="mAnnulla">Annulla</button><button class="btn btn-primary" id="mSalva">Salva</button></div>
  </div>`;
  document.body.appendChild(bg);
  bg.addEventListener("click", (e) => { if (e.target === bg) bg.remove(); });
  bg.querySelector("#mAnnulla").onclick = () => bg.remove();
  bg.querySelector("#mSalva").onclick = () => {
    r.descrizione = bg.querySelector("#mDesc").value.trim() || r.descrizione;
    r.testoFoto = bg.querySelector("#mFoto").value.trim() || r.testoFoto;
    r.nota = bg.querySelector("#mNota").value.trim();
    r.stato = "Modificato";
    state.pdf = null;
    bg.remove();
    render();
  };
}

// ---------------------------------------------------------------------
//  Gestione dei tocchi
// ---------------------------------------------------------------------
$app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  const f = vista.fotoId ? state.foto.find((x) => x.id === vista.fotoId) : null;
  const r = f && vista.nome === "dettaglio" ? f.rilievi[vista.i] : null;

  switch (act) {
    case "back": indietro(); break;
    case "camera": $cam.click(); break;
    case "galleria": $gal.click(); break;
    case "home":
      while (pila.length && vista.nome !== "ispezione") { vista = pila.pop(); }
      pila.length = 0; vista = { nome: "ispezione" }; render(); window.scrollTo(0, 0); break;
    case "apriFoto": vai({ nome: "risultati", fotoId: el.dataset.id }); break;
    case "apriRilievo": vai({ nome: "dettaglio", fotoId: el.dataset.id, i: +el.dataset.i }); break;
    case "riprova": { const ff = state.foto.find((x) => x.id === el.dataset.id); if (ff) analizza(ff); break; }
    case "report": vai({ nome: "report" }); break;
    case "esci":
      if (state.foto.length && !confirm("Uscire? Le foto e i rilievi di questa ispezione andranno persi.")) return;
      Object.assign(state, { sessione: null, foto: [], note: "", firma: null, pdf: null });
      pila.length = 0; vista = { nome: "login" }; render(); break;
    case "nuovaIspezione":
      if (!confirm("Iniziare una nuova ispezione? Foto e rilievi attuali andranno persi.")) return;
      Object.assign(state, { foto: [], note: "", firma: null, pdf: null });
      state.sessione.inizio = Date.now();
      pila.length = 0; vista = { nome: "ispezione" }; render(); break;
    case "conferma": if (r) { r.stato = r.stato === "Confermato" ? "Da valutare" : "Confermato"; state.pdf = null; render(); } break;
    case "scarta": if (r) { r.stato = r.stato === "Scartato" ? "Da valutare" : "Scartato"; state.pdf = null; render(); } break;
    case "modifica": if (r) apriModifica(r); break;
    case "fs":
      if (r) {
        r.fuoriServizio.attivo = !r.fuoriServizio.attivo;
        r.fuoriServizio.ora = Date.now();
        if (r.fuoriServizio.attivo && r.stato === "Da valutare") r.stato = "Confermato";
        state.pdf = null; render();
      }
      break;
    case "azione":
      if (r) { const a = r.azioni[+el.dataset.k]; a.fatto = el.checked; el.closest(".azione").classList.toggle("done", a.fatto); state.pdf = null; }
      break;
    case "cancellaFirma": state.firma = null; state.pdf = null; render(); break;
    case "creaPdf": creaPdf(); break;
    case "condividi": condividi(); break;
    case "scarica": scarica(); break;
  }
});

// ---------------------------------------------------------------------
//  Avvio
// ---------------------------------------------------------------------
history.replaceState({ n: 0 }, "");
render();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
