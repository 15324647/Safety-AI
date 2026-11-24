// Funzione server (Vercel): riceve la foto dall'app, la invia a Claude, restituisce i rilievi.
// La chiave API resta qui, nelle variabili d'ambiente di Vercel: il telefono non la vede mai.
//
// Variabili d'ambiente da impostare su Vercel:
//   ANTHROPIC_API_KEY  (obbligatoria)  la tua chiave Anthropic
//   CODICE_ACCESSO     (consigliata)   codice da inserire al login; senza codice giusto l'AI non risponde
//   MODELLO_AI         (facoltativa)   default "claude-sonnet-5-5"; alternativa più veloce "claude-haiku-5-5"

import { systemPrompt, TOOL, ID_CASI } from "./_prompt.js";
import { SCHEDE, GRAVITA } from "../public/js/catalogo.js";

const ORDINE = Object.fromEntries(
  SCHEDE.flatMap((s) => s.casi.map((c) => [c.id, GRAVITA[s.gravita].ordine]))
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ errore: "Usare POST" });
  }

  const codiceAtteso = process.env.CODICE_ACCESSO;
  const codice = req.headers["x-codice-accesso"] || "";
  if (codiceAtteso && codice.trim() !== codiceAtteso.trim()) {
    return res.status(401).json({ errore: "Codice di accesso non valido" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ errore: "Chiave ANTHROPIC_API_KEY non impostata su Vercel" });
  }

  const { immagine, mediaType } = req.body || {};
  if (!immagine || typeof immagine !== "string") {
    return res.status(400).json({ errore: "Foto mancante" });
  }

  const modello = process.env.MODELLO_AI || "claude-sonnet-5-5";

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: modello,
        max_tokens: 2000,
        system: systemPrompt(),
        tools: [TOOL],
        tool_choice: { type: "tool", name: TOOL.name },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: immagine } },
              { type: "text", text: "Analizza questa foto di cantiere secondo le schede." },
            ],
          },
        ],
      }),
    });

    const dati = await r.json();
    if (!r.ok) {
      const msg = dati?.error?.message || `Errore ${r.status}`;
      return res.status(502).json({ errore: `Servizio AI: ${msg}` });
    }

    const blocco = (dati.content || []).find((b) => b.type === "tool_use");
    if (!blocco) {
      return res.status(502).json({ errore: "Risposta AI non leggibile, riprovare" });
    }

    const out = blocco.input || {};
    // Pulizia: solo casi previsti, un rilievo per caso+descrizione, massimo 6, ordinati per gravità
    const visti = new Set();
    const rilievi = (Array.isArray(out.rilievi) ? out.rilievi : [])
      .filter((x) => x && ID_CASI.includes(x.caso))
      .filter((x) => {
        const k = `${x.caso}|${(x.cosa_si_vede || "").slice(0, 60)}`;
        if (visti.has(k)) return false;
        visti.add(k);
        return true;
      })
      .sort((a, b) => (ORDINE[a.caso] ?? 9) - (ORDINE[b.caso] ?? 9))
      .slice(0, 6);

    let esito = out.esito;
    if (esito === "rilievi" && rilievi.length === 0) esito = "nessun_rischio";

    return res.status(200).json({
      esito,
      messaggio: out.messaggio || "",
      rilievi,
      modello,
    });
  } catch (e) {
    return res.status(500).json({ errore: "Errore di collegamento con il servizio AI" });
  }
}
