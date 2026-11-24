# Safety AI Agent: guida alla pubblicazione

App dimostrativa per ispezioni di cantiere. Funziona su **iPhone e Android** dal browser e si può installare sulla schermata Home come una normale app, senza passare dagli store.

---

## 1. Cosa c'è nella cartella

| File / cartella | A cosa serve | Si tocca? |
|---|---|---|
| `public/js/catalogo.js` | **Tutti i contenuti safety** della scheda v5: banner, requisiti, riferimenti, azioni, fuori servizio, istruzioni per l'AI | **Sì**: è l'unico file da modificare quando cambiano i contenuti |
| `api/analyze.js` | Funzione server: riceve la foto e la manda a Claude. Custodisce la chiave API | No |
| `api/_prompt.js` | Costruisce le istruzioni per l'AI a partire dal catalogo | No |
| `public/js/app.js` | Schermate dell'app | No |
| `public/js/report.js` | Report PDF | No |
| `public/js/demo.js` | Risultati simulati per la "modalità prova" | No |
| `vercel.json`, `package.json` | Configurazione Vercel | No |

---

## 2. Caricare su GitHub (una volta sola)

1. Vai su github.com → **New repository** → nome `safety-ai-agent` → scegli **Private** → **Create repository**.
2. Nella pagina del repository vuoto clicca **uploading an existing file**.
3. Trascina **il contenuto** della cartella `safety-ai-agent` (le cartelle `api`, `public` e i file `package.json`, `vercel.json`, `GUIDA.md`), non la cartella stessa.
4. Clicca **Commit changes**.

> Controlla che su GitHub compaiano subito `api/`, `public/` e `vercel.json` nella radice. Se vedi una sola cartella `safety-ai-agent/`, i file sono un livello troppo in basso.

---

## 3. Pubblicare su Vercel (una volta sola)

1. Vai su vercel.com → **Add New… → Project** → importa il repository `safety-ai-agent`.
2. **Framework Preset**: lascia *Other*. Non serve nessun comando di build.
3. Apri **Environment Variables** e aggiungi:

| Nome | Valore |
|---|---|
| `ANTHROPIC_API_KEY` | la tua chiave Anthropic (`sk-ant-...`) |
| `CODICE_ACCESSO` | un codice a tua scelta, es. `cantiere2026` |
| `MODELLO_AI` | (facoltativo) `claude-sonnet-5-5`, che è il predefinito, oppure `claude-haiku-5-5`, più veloce |

4. Clicca **Deploy**. Dopo circa un minuto avrai un indirizzo tipo `https://safety-ai-agent.vercel.app`.

**Perché il codice di accesso:** l'indirizzo è pubblico. Senza codice, chiunque lo trovasse potrebbe usare l'AI a tue spese. Con il codice, l'AI risponde solo a chi lo inserisce al login.

---

## 4. Installare sul telefono

**iPhone (Safari):** apri l'indirizzo → pulsante **Condividi** → **Aggiungi alla schermata Home**.
**Android (Chrome):** apri l'indirizzo → menu **⋮** → **Installa app** (o *Aggiungi a schermata Home*).

Al primo scatto il telefono chiede il permesso per la fotocamera: rispondi **Consenti**.

---

## 5. Come si usa

1. **Login**: ispettore, cantiere, area, codice di accesso.
2. **Scatta foto** (oppure *Scegli dalla galleria*). L'analisi dura in genere 5-15 secondi.
3. **Lista rilievi**: ordinati dal più grave al meno grave, al massimo 6 per foto.
4. **Dettaglio**: banner, foto con testo rosso, cosa si vede, suggerimento con requisito e riferimento, azioni immediate da spuntare, fuori servizio, stato, priorità e SLA.
   In basso: **Conferma**, **Modifica** (testo e nota), **Scarta**, **Altra foto**.
5. **Chiudi ispezione e crea report**: note, firma col dito, **Crea PDF**, poi **Condividi** (mail, WhatsApp…) o **Scarica**.

**Modalità prova** (casella al login): l'app mostra risultati simulati senza chiamare l'AI. Serve solo per provare i pulsanti. In questa modalità compare una fascia gialla "RISULTATI SIMULATI" e anche il PDF lo dichiara. **Non usarla davanti al cliente.**

---

## 6. Aggiornare i contenuti (quando i colleghi finiscono le verifiche)

1. Su GitHub apri `public/js/catalogo.js` → icona matita ✏️.
2. Modifica i testi tra virgolette.
3. **Riferimenti normativi:** quando Piero conferma un riferimento, scrivilo in `testo` e cambia `verificato: false` in `verificato: true`. Finché è `false`, l'app mostra "Riferimento da verificare".
4. **Commit changes**: Vercel ripubblica da solo in circa un minuto.

Per **aggiungere un rischio** (righe 7 e 8 della tabella) basta copiare un blocco scheda nel catalogo e cambiarne numero, contenuti e codici caso: sia l'AI sia l'app lo prendono automaticamente.

---

## 7. Cose da sapere

- **Connessione:** l'analisi richiede rete dati. Prova la copertura del cantiere prima della demo.
- **Dati:** foto e rilievi restano solo sul telefono durante l'ispezione. Nessun database. Chiudendo l'app si perdono, quindi crea il PDF prima di uscire.
- **Costo indicativo:** con Sonnet si tratta di pochi centesimi per foto. Puoi verificarlo nella console Anthropic dopo le prime prove.
- **L'AI non cita norme:** i requisiti e i riferimenti vengono sempre dal catalogo, mai dall'AI. È voluto, per evitare riferimenti inventati davanti al cliente.
