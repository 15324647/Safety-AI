// Report PDF dell'ispezione (generato sul telefono, nessun invio a server)
import { GRAVITA } from "./catalogo.js";

const COL = {
  navy: [15, 42, 68], muted: [95, 107, 122], line: [221, 226, 232],
  alta: [198, 40, 40], media: [230, 106, 0], bassa: [199, 154, 0],
  verde: [46, 125, 50], blu: [21, 101, 192], arancio: [230, 106, 0],
};
const fmt = (t) => new Date(t).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fmtOra = (t) => new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

function dimImmagine(dataUrl) {
  return new Promise((ok) => {
    const im = new Image();
    im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight });
    im.onerror = () => ok({ w: 4, h: 3 });
    im.src = dataUrl;
  });
}

export async function generaPDF({ sessione, foto, rilievi, note, firma }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, CW = W - 2 * M;
  let y = M;

  const nuovaPagina = () => { doc.addPage(); y = M; };
  const spazio = (h) => { if (y + h > H - 16) nuovaPagina(); };
  const testo = (t, x, size = 10, color = [26, 31, 38], style = "normal", width = CW) => {
    doc.setFont("helvetica", style); doc.setFontSize(size); doc.setTextColor(...color);
    const righe = doc.splitTextToSize(String(t ?? ""), width);
    const lh = size * 0.42;
    righe.forEach((r) => { spazio(lh); doc.text(r, x, y + lh * 0.8); y += lh; });
    return righe.length * lh;
  };
  const etichetta = (lab, val, x = M, width = CW, colLab = COL.muted) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...colLab);
    spazio(4); doc.text(lab.toUpperCase(), x, y + 3); y += 4;
    testo(val, x, 10, [26, 31, 38], "normal", width);
    y += 1.5;
  };

  // ---------- Intestazione ----------
  doc.setFillColor(...COL.navy); doc.rect(0, 0, W, 30, "F");
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(17);
  doc.text("REPORT ISPEZIONE SAFETY", M, 13);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10);
  doc.text("Safety AI Agent - versione dimostrativa", M, 20);
  doc.text(fmt(Date.now()), W - M, 13, { align: "right" });
  y = 38;

  const aree = [...new Set(foto.map((f) => f.area).filter(Boolean))].join(", ");
  const info = [
    ["Cantiere", sessione.cantiere],
    ["Ispettore", sessione.ispettore],
    ["Inizio ispezione", fmt(sessione.inizio)],
    ["Aree", aree || "-"],
    ["Foto analizzate", String(foto.length)],
  ];
  info.forEach(([k, v]) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(...COL.muted); doc.text(k, M, y);
    doc.setFont("helvetica", "normal"); doc.setTextColor(26, 31, 38); doc.text(String(v), M + 40, y);
    y += 6;
  });
  if (sessione.demo) {
    y += 1; testo("ATTENZIONE: report di prova con risultati simulati (non generati dall'AI).", M, 9.5, COL.alta, "bold");
  }

  // ---------- Riepilogo ----------
  y += 4;
  testo("Riepilogo rilievi", M, 13, COL.navy, "bold"); y += 2;
  const c = { alta: 0, media: 0, bassa: 0 };
  rilievi.forEach(({ r }) => c[r.gravita]++);
  const bw = (CW - 8) / 3;
  ["alta", "media", "bassa"].forEach((g, i) => {
    const x = M + i * (bw + 4);
    doc.setFillColor(...COL[g]); doc.roundedRect(x, y, bw, 18, 2, 2, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(String(c[g]), x + bw / 2, y + 10, { align: "center" });
    doc.setFontSize(9); doc.text(`Rischio ${GRAVITA[g].etichetta.toLowerCase()}`, x + bw / 2, y + 15.5, { align: "center" });
  });
  y += 24;
  const fs = rilievi.filter(({ r }) => r.fuoriServizio.attivo).length;
  const dav = rilievi.filter(({ r }) => r.stato === "Da valutare").length;
  testo(`Totale rilievi: ${rilievi.length}  ·  Aree messe fuori servizio: ${fs}  ·  Da valutare: ${dav}`, M, 10);
  const senza = foto.filter((f) => f.stato === "ok" && !(f.rilievi || []).some((r) => r.stato !== "Scartato"));
  if (senza.length) {
    y += 1;
    testo(`Foto senza rilievi: ${senza.map((f) => `${fmtOra(f.ora)}${f.area ? " (" + f.area + ")" : ""}`).join(", ")}. Questo non significa che l'area sia sicura.`, M, 9, COL.muted);
  }

  // ---------- Elenco rilievi (tabella) ----------
  if (rilievi.length) {
    y += 6;
    spazio(20);
    testo("Elenco rilievi", M, 13, COL.navy, "bold"); y += 2;
    // colonne: N | Gravità | Descrizione | Area | Stato | F.S.
    const cols = [
      { t: "N.", w: 9 }, { t: "Gravità", w: 20 }, { t: "Descrizione", w: 72 },
      { t: "Area", w: 37 }, { t: "Stato", w: 24 }, { t: "Fuori serv.", w: CW - 9 - 20 - 72 - 37 - 24 },
    ];
    const intestazione = () => {
      doc.setFillColor(...COL.navy); doc.rect(M, y, CW, 7, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(255, 255, 255);
      let x = M; cols.forEach((c) => { doc.text(c.t, x + 1.5, y + 4.8); x += c.w; });
      y += 7;
    };
    intestazione();
    rilievi.forEach(({ f, r }, k) => {
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      const celle = [
        String(k + 1),
        GRAVITA[r.gravita].priorita,
        r.descrizione,
        f.area || "-",
        r.stato,
        r.fuoriServizio.attivo ? "Sì" : (r.fuoriServizio.proponi ? "Proposto" : "No"),
      ];
      const righe = celle.map((c, i) => doc.splitTextToSize(c, cols[i].w - 3));
      const h = Math.max(...righe.map((r) => r.length)) * 3.7 + 3;
      if (y + h > H - 16) { nuovaPagina(); intestazione(); }
      if (k % 2) { doc.setFillColor(245, 247, 250); doc.rect(M, y, CW, h, "F"); }
      let x = M;
      righe.forEach((rr, i) => {
        if (i === 1) { doc.setTextColor(...COL[r.gravita]); doc.setFont("helvetica", "bold"); }
        else if (i === 5 && r.fuoriServizio.attivo) { doc.setTextColor(...COL.alta); doc.setFont("helvetica", "bold"); }
        else { doc.setTextColor(26, 31, 38); doc.setFont("helvetica", "normal"); }
        rr.forEach((riga, j) => doc.text(riga, x + 1.5, y + 4 + j * 3.7));
        x += cols[i].w;
      });
      doc.setDrawColor(...COL.line); doc.setLineWidth(0.2); doc.line(M, y + h, M + CW, y + h);
      y += h;
    });
    y += 3;
    testo("Il dettaglio di ogni rilievo (foto, requisito, suggerimento e azioni) è nelle pagine seguenti.", M, 8.5, COL.muted);
  }

  // ---------- Schede rilievo ----------
  let n = 0;
  for (const { f, r } of rilievi) {
    n++;
    nuovaPagina();
    const col = COL[r.gravita];

    doc.setFillColor(...col); doc.rect(M, y, CW, 16, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(`${n}. ${r.titolo}`, M + 4, y + 6.5);
    doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    doc.text(doc.splitTextToSize(r.descrizione, CW - 8)[0], M + 4, y + 12.5);
    y += 20;

    // foto + dati a destra
    const fw = 92;
    const { w, h } = await dimImmagine(f.dataUrl);
    let fh = fw * (h / w);
    if (fh > 110) fh = 110;
    const fwEff = fh === 110 ? 110 * (w / h) : fw;
    doc.addImage(f.dataUrl, "JPEG", M, y, fwEff, fh, "foto_" + f.id);
    // testo sulla foto
    doc.setFillColor(255, 255, 255);
    const tf = doc.splitTextToSize(r.testoFoto.toUpperCase(), fwEff - 6);
    const th = tf.length * 4.2 + 3;
    doc.rect(M + 2, y + fh - th - 2, fwEff - 4, th, "F");
    doc.setTextColor(208, 0, 0); doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
    tf.forEach((riga, k) => doc.text(riga, M + 4, y + fh - th + 2.2 + k * 4.2));

    const xR = M + fw + 6, wR = CW - fw - 6;
    const y0 = y;
    const campi = [
      ["Area", f.area || sessione.cantiere],
      ["Data e ora", fmt(f.ora)],
      ["Stato", r.stato],
      ["Priorità", r.priorita],
      ["SLA", r.sla],
      ["Esito AI", r.certezza === "verifica_necessaria" ? "Verifica necessaria" : "Rilevato con certezza"],
      ["Fuori servizio", r.fuoriServizio.attivo ? `Sì, dalle ${fmtOra(r.fuoriServizio.ora)}` : (r.fuoriServizio.proponi ? "Proposto, non attivato" : "Non previsto")],
    ];
    campi.forEach(([k, v]) => etichetta(k, v, xR, wR));
    y = Math.max(y0 + fh, y) + 6;

    const blocco = (tit, colTit, righe) => {
      spazio(12);
      doc.setDrawColor(...colTit); doc.setLineWidth(1.2); doc.line(M, y, M, y + 5);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10.5); doc.setTextColor(...colTit);
      doc.text(tit.toUpperCase(), M + 3, y + 4); y += 7;
      righe();
      y += 3;
    };

    blocco("Cosa si vede nella foto", COL.arancio, () => {
      testo(r.cosaSiVede, M + 3, 10, [26, 31, 38], "normal", CW - 3);
      if (r.elementiMancanti.length) testo(`Manca: ${r.elementiMancanti.join(", ")}`, M + 3, 9.5, COL.muted, "normal", CW - 3);
      if (r.personaEsposta) testo("Persona esposta al pericolo", M + 3, 9.5, COL.alta, "bold", CW - 3);
      if (r.certezza === "verifica_necessaria" && r.richiestaFoto) testo(`Verifica necessaria: ${r.richiestaFoto}`, M + 3, 9.5, COL.bassa, "normal", CW - 3);
    });
    blocco("Requisito e suggerimento", COL.verde, () => {
      etichetta("Requisito", r.requisito, M + 3, CW - 3);
      etichetta("Tipo", r.tipo, M + 3, CW - 3);
      etichetta("Riferimento", r.riferimento, M + 3, CW - 3);
      etichetta("Suggerimento per la messa in sicurezza", r.suggerimento, M + 3, CW - 3);
    });
    blocco("Azioni immediate", COL.blu, () => {
      r.azioni.forEach((a) => {
        spazio(5);
        doc.setDrawColor(...COL.blu); doc.setLineWidth(0.3); doc.rect(M + 3, y + 0.6, 3.4, 3.4);
        if (a.fatto) { doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(...COL.blu); doc.text("X", M + 3.7, y + 3.6); }
        const yy = y;
        testo(a.testo + (a.fatto ? "  (eseguita)" : ""), M + 9, 10, [26, 31, 38], "normal", CW - 9);
        if (y - yy < 4.6) y = yy + 4.6;
        y += 0.6;
      });
    });
    if (r.fuoriServizio.proponi || r.fuoriServizio.attivo) {
      blocco("Fuori servizio", COL.alta, () => {
        testo(r.fuoriServizio.attivo ? `Area messa fuori servizio alle ${fmtOra(r.fuoriServizio.ora)}. ${r.fuoriServizio.messaggio}` : `Proposto: ${r.fuoriServizio.messaggio}. Non attivato dall'ispettore.`, M + 3, 10, [26, 31, 38], "normal", CW - 3);
      });
    }
    if (r.nota) blocco("Nota dell'ispettore", COL.navy, () => testo(r.nota, M + 3, 10, [26, 31, 38], "normal", CW - 3));
  }

  // ---------- Note e firma ----------
  nuovaPagina();
  testo("Note dell'ispettore", M, 13, COL.navy, "bold"); y += 2;
  if (note && note.trim()) testo(note, M, 10.5);
  else { for (let i = 0; i < 5; i++) { y += 8; doc.setDrawColor(...COL.line); doc.setLineWidth(0.3); doc.line(M, y, W - M, y); } }
  y += 14;
  spazio(50);
  testo("Firma dell'ispettore", M, 11, COL.navy, "bold"); y += 2;
  if (firma) { doc.addImage(firma, "PNG", M, y, 80, 30, "firma", "FAST"); y += 32; }
  else { y += 22; }
  doc.setDrawColor(...COL.muted); doc.setLineWidth(0.3); doc.line(M, y, M + 80, y);
  y += 5; testo(`${sessione.ispettore} - ${fmt(Date.now())}`, M, 9.5, COL.muted);

  // ---------- Piè di pagina ----------
  const tot = doc.getNumberOfPages();
  for (let p = 1; p <= tot; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...COL.muted);
    doc.text("Rilievi generati con supporto AI: la valutazione e le decisioni restano dell'ispettore.", M, H - 8);
    doc.text(`Pag. ${p}/${tot}`, W - M, H - 8, { align: "right" });
  }

  return doc.output("blob");
}
