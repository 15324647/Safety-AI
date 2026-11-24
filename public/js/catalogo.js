// =====================================================================
//  CATALOGO RISCHI — Safety AI Agent (demo)
//  Fonte: "Scheda di raccolta contenuti safety" v5
//
//  Questo è l'UNICO file da modificare quando cambiano i contenuti.
//  - I testi dei blocchi A, B, C, D, E compaiono nell'app (linguaggio da cantiere).
//  - Il blocco F (campo "ai") NON compare nell'app: serve solo all'AI.
//
//  RIFERIMENTI NORMATIVI: finché "verificato" è false, l'app mostra
//  "Riferimento da verificare" e l'AI non cita il riferimento.
//  Quando Piero conferma un riferimento: scriverlo in "testo" e mettere verificato: true.
// =====================================================================

export const VERSIONE_CATALOGO = "Scheda contenuti v5";

// --- Regole generali: gravità, priorità, SLA -------------------------
export const GRAVITA = {
  alta:  { etichetta: "ALTO",  priorita: "Alta",  sla: "Immediato / entro 24h", ordine: 0,
           cosaSuccede: "Si ferma l'attività nell'area finché non è risolto" },
  media: { etichetta: "MEDIO", priorita: "Media", sla: "Entro 3 giorni", ordine: 1,
           cosaSuccede: "Si programma l'intervento in settimana" },
  bassa: { etichetta: "BASSO", priorita: "Bassa", sla: "Entro 7 giorni", ordine: 2,
           cosaSuccede: "Si sistema nel normale giro di manutenzione" },
};

// --- Regole generali per l'AI (non compaiono nell'app) ----------------
export const REGOLE_AI = [
  "Segnalare solo ciò che si vede nella foto. Non dedurre ciò che non è visibile.",
  "Non stimare misure (altezze, distanze, larghezze): dire solo se un elemento c'è o manca.",
  "Non citare mai norme, articoli, leggi o cifre. I requisiti e i riferimenti li aggiunge l'app a partire dal codice del caso.",
  "Se la foto è dubbia (lontana, buia, controluce, angolazione): non segnalare come certo, usare certezza 'verifica_necessaria' e chiedere una foto più vicina o da un'altra angolazione.",
  "Un solo rilievo per ogni condizione e per ogni punto dell'area: non ripetere lo stesso problema. Se una persona manca di più DPI, un solo rilievo.",
  "Se in una foto ci sono più rischi, elencarli tutti, dal più grave al meno grave, fino a un massimo di 6 per foto.",
  "Se non si vede nessuno dei rischi previsti, usare esito 'nessun_rischio'.",
  "Se la foto non mostra un'area di lavoro (ufficio, persona in primo piano, oggetto singolo), usare esito 'foto_non_idonea' e chiedere un'altra foto.",
  "Scrivere in italiano, in linguaggio da cantiere, con frasi brevi e con i termini usati nelle schede (corrente intermedio, fermapiede, ecc.).",
  "L'app è un supporto all'ispezione: la valutazione e la decisione restano dell'ispettore, che può confermare, modificare o scartare ogni rilievo.",
];

// --- Schede rischio ----------------------------------------------------
// fuoriServizio: "si" | "no" | "dipende" (dipende = sì solo se persona esposta)
export const SCHEDE = [
  {
    n: 1,
    nome: "Caduta dall'alto per parapetto mancante o botola aperta",
    rischio: "CADUTA DALL'ALTO",
    gravita: "alta",
    fuoriServizio: "si",
    messaggioFuoriServizio: "Interdire l'area fino alla messa in sicurezza",
    azioni: [
      "Delimitare temporaneamente l'intera area inibendo il passaggio",
      "Fare apporre opere provvisionali sostitutive temporaneamente",
      "Vietare l'accesso alle persone non autorizzate fino alla messa in sicurezza",
      "Verificare altre aperture o bordi non protetti nella stessa area",
      "Programmare la protezione definitiva (parapetto o copertura fissata)",
    ],
    casi: [
      {
        id: "1_bordo",
        nome: "Bordo di solaio o ponteggio",
        descrizione: "Bordo di solaio o ponteggio: parapetto assente o incompleto",
        testoFoto: "Parapetto mancante o incompleto",
        requisito: "Parapetto alto 100 cm, corrente intermedio e fermapiede",
        tipo: "Legge + Norma tecnica",
        riferimento: { testo: "Art. 113 D.Lgs. 81/2008; UNI EN ISO 14122-4; UNI 11962", verificato: false },
        suggerimento: "Installare parapetto robusto alto almeno 100 cm con corrente intermedio e fermapiede",
      },
      {
        id: "1_botola",
        nome: "Botola o apertura nel pavimento",
        descrizione: "Botola o apertura nel pavimento: vuoto o apertura non protetta",
        testoFoto: "Protezione non conforme o mancante",
        requisito: "Chiusura con copertura completa e resistente, o parapetto su tutti i lati, o altra opera provvisionale di perimetrazione",
        tipo: "Norma tecnica",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Chiudere la botola con idonea copertura resistente, o installare parapetto alto almeno 100 cm con corrente intermedio e fermapiede, o altro sistema che impedisca la caduta",
      },
      {
        id: "1_generico",
        nome: "Bordo o apertura non protetti (tipo non riconoscibile)",
        descrizione: "Bordo o apertura non protetti",
        testoFoto: "Bordo o apertura non protetti",
        requisito: "Parapetto alto 100 cm, corrente intermedio e fermapiede",
        tipo: "Legge + Norma tecnica",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Installare parapetto completo: corrente superiore, corrente intermedio e fermapiede",
      },
    ],
    ai: {
      cosaVedere: "Bordo di solaio, balcone, copertura, scala o ponteggio da cui una persona può cadere nel vuoto, dove il parapetto manca oppure è incompleto (manca il corrente superiore, il corrente intermedio o la tavola fermapiede). Apertura nel pavimento o nel solaio (botola, foro per scale o impianti, vano ascensore) senza copertura resistente e senza parapetto intorno. Contano anche le protezioni solo apparenti: catena, nastro, corda, pannello appoggiato e non fissato.",
      comeRiconoscere: "Struttura tubolare con impalcati, o bordo esterno di solaio o copertura: caso 1_bordo. Foro, botola o vano nel piano di calpestio: caso 1_botola. Se il tipo non si capisce: caso 1_generico.",
      cosaNonE: "Parapetto presente e completo, anche se sporco, scrostato o di colore diverso. Apertura coperta da piastra o grigliato fissato e resistente. Apertura protetta da parapetto su tutti i lati. Bordo con muro pieno o parete alta come un parapetto. Dislivello evidentemente minimo (un gradino, un cordolo). Foro troppo piccolo per far cadere una persona.",
      fotoDubbia: "Se il bordo o l'apertura non si vedono bene, la foto è troppo lontana, controluce o troppo buia per capire se c'è una protezione o una copertura, non segnalare come certo: usare 'verifica_necessaria' e chiedere una foto più vicina. Non stimare altezze o dimensioni.",
      confronto: "Elencare quali elementi del requisito si vedono e quali mancano: corrente superiore, corrente intermedio, tavola fermapiede, copertura fissata, parapetto su tutti i lati. Descrivere ciò che si vede (es. 'solo una catena', 'copertura appoggiata non fissata') senza stimare altezze in centimetri.",
    },
  },
  {
    n: 2,
    nome: "Caduta dall'alto per scala alla marinara senza gabbia",
    rischio: "CADUTA DALL'ALTO",
    gravita: "media",
    fuoriServizio: "dipende",
    messaggioFuoriServizio: "Fermare il lavoro sulla scala e vietarne l'uso fino alla messa in sicurezza",
    notaFuoriServizio: "Proposto solo se c'è una persona sulla scala. Se la scala non è in uso restano le azioni immediate.",
    azioni: [
      "Se presenza di persone sulla scala, farle scendere in sicurezza e segnalare con cartello di divieto di accesso",
      "Se la scala deve essere usata comunque, utilizzare imbracature con cordino a doppio gancio",
      "Verificare che le altre scale fisse dell'area abbiano la gabbia",
      "Programmare l'installazione della gabbia o del sistema anticaduta",
    ],
    casi: [
      {
        id: "2_scala",
        nome: "Scala fissa a pioli (alla marinara) alta, senza gabbia",
        descrizione: "Scala alla marinara senza protezione posteriore (gabbia di sicurezza)",
        testoFoto: "Scala fissa senza gabbia di protezione",
        requisito: "Le scale fisse a pioli oltre una certa altezza devono avere una protezione posteriore (gabbia) o un sistema anticaduta",
        tipo: "Legge / norma tecnica",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Installare gabbia di protezione o sistema anticaduta a guida; fino a quel momento limitare l'uso della scala",
      },
    ],
    ai: {
      cosaVedere: "Scala fissa a pioli, verticale (alla marinara), ancorata a una parete, una struttura o un serbatoio, di altezza evidente (più piani), senza gabbia o struttura di protezione che circondi la schiena di chi sale. Indicare SEMPRE se una persona sta usando la scala (campo persona_esposta): serve per decidere il fuori servizio.",
      comeRiconoscere: "Un solo caso: 2_scala. Distinguere dalla scala portatile (appoggiata, non fissata): non rientra in questa condizione.",
      cosaNonE: "Scala fissa bassa, di altezza modesta (accesso a un piccolo piano rialzato), che non richiede gabbia. Scala con gabbia o con sistema anticaduta a guida. Scala portatile appoggiata. Scala a gradini con corrimano.",
      fotoDubbia: "Se non si vede l'altezza complessiva della scala o la parte posteriore, non segnalare come certo: usare 'verifica_necessaria' e chiedere una foto che mostri tutta la scala. Non stimare l'altezza in metri.",
      confronto: "Presenza o assenza della gabbia o del sistema anticaduta a guida. Presenza di una persona sulla scala. Stato visibile degli ancoraggi alla parete.",
    },
  },
  {
    n: 3,
    nome: "Caduta dall'alto per persona in quota senza protezione anticaduta",
    rischio: "CADUTA DALL'ALTO",
    gravita: "alta",
    fuoriServizio: "si",
    messaggioFuoriServizio: "Fermare subito il lavoro in quota finché la persona non è protetta",
    azioni: [
      "Fermare il lavoro in quota",
      "Far scendere la persona in sicurezza",
      "Verificare imbracatura, cordino e punto di ancoraggio",
      "Individuare un ancoraggio o una linea vita idonei",
      "Verificare formazione e addestramento all'uso dei DPI anticaduta",
    ],
    casi: [
      {
        id: "3_assente",
        nome: "Imbracatura assente",
        descrizione: "Imbracatura assente: persona in quota senza protezione anticaduta",
        testoFoto: "Persona in quota senza imbracatura",
        requisito: "Chi lavora in quota senza protezioni collettive (parapetto) deve usare un sistema di protezione individuale anticaduta: imbracatura con cordino collegato a un punto di ancoraggio idoneo",
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Far scendere la persona, oppure farle indossare imbracatura e cordino agganciati a un ancoraggio idoneo",
      },
      {
        id: "3_non_agganciata",
        nome: "Imbracatura non agganciata",
        descrizione: "Imbracatura non agganciata: cordino non collegato a un ancoraggio",
        testoFoto: "Imbracatura non agganciata",
        requisito: "L'imbracatura deve essere collegata con il cordino a un ancoraggio idoneo durante tutto il lavoro in quota",
        tipo: "Legge / norma tecnica",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Agganciare il cordino a un ancoraggio idoneo prima di proseguire il lavoro",
      },
      {
        id: "3_ancoraggio",
        nome: "Agganciata a struttura non idonea",
        descrizione: "Agganciata male: ancoraggio non idoneo",
        testoFoto: "Aggancio a struttura non idonea",
        requisito: "Il punto di ancoraggio deve poter sostenere il carico di una caduta (struttura resistente o linea vita)",
        tipo: "Norma tecnica",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Spostare l'aggancio su un ancoraggio certificato o su una linea vita",
      },
      {
        id: "3_piattaforma",
        nome: "Piattaforma senza trattenuta",
        descrizione: "Piattaforma elevabile: imbracatura di trattenuta assente",
        testoFoto: "Piattaforma senza trattenuta",
        requisito: "Nelle piattaforme elevabili l'operatore deve indossare imbracatura con cordino di trattenuta agganciato al punto previsto, anche se c'è il parapetto",
        tipo: "Norma tecnica",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Far indossare imbracatura e cordino di trattenuta prima di operare",
      },
      {
        id: "3_non_verificabile",
        nome: "Protezione anticaduta non verificabile",
        descrizione: "Persona in quota: protezione anticaduta non verificabile",
        testoFoto: "Protezione anticaduta non verificabile",
        requisito: "Chi lavora in quota senza protezioni collettive (parapetto) deve usare imbracatura con cordino collegato a un punto di ancoraggio idoneo",
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Verificare da vicino imbracatura, cordino e punto di ancoraggio",
      },
    ],
    ai: {
      cosaVedere: "Persona che lavora o si muove su tetto, bordo di solaio, ponteggio, piattaforma o altra posizione con rischio di caduta nel vuoto, senza parapetto o altra protezione collettiva, e: senza imbracatura visibile; oppure con imbracatura ma con cordino libero o penzolante; oppure con cordino agganciato a un elemento evidentemente inadeguato (tubo sottile, ringhiera, cavo, tavola). Persona in cestello o piattaforma elevabile senza imbracatura e cordino di trattenuta, anche se la piattaforma ha il parapetto.",
      comeRiconoscere: "Nessuna imbracatura addosso: 3_assente. Imbracatura visibile ma cordino non collegato: 3_non_agganciata. Cordino collegato a un elemento chiaramente non resistente: 3_ancoraggio. Persona in cestello o piattaforma senza imbracatura: 3_piattaforma. Se non si capisce: 3_non_verificabile (sempre con certezza 'verifica_necessaria').",
      cosaNonE: "Persona a terra o su un piano fisso protetto da parapetto completo (esclusi cestelli e piattaforme elevabili). Persona lontana, di spalle o coperta di cui non si vede l'equipaggiamento. Mancanza di elmetto o gilet: è la scheda 6.",
      fotoDubbia: "Se la persona è lontana, di spalle o coperta e non si capisce se indossa l'imbracatura o dove è agganciata, non segnalare come certo: usare 'verifica_necessaria' e chiedere una foto più vicina. Non giudicare la resistenza reale dell'ancoraggio: segnalare solo i casi evidentemente inadeguati.",
      confronto: "Presenza dell'imbracatura. Presenza e posizione del cordino. Elemento a cui è agganciato. Presenza di parapetto o altra protezione collettiva nell'area.",
    },
  },
  {
    n: 4,
    nome: "Inciampo per materiale a terra sui passaggi",
    rischio: "INCIAMPO",
    gravita: "bassa",
    fuoriServizio: "no",
    messaggioFuoriServizio: "",
    azioni: [
      "Rimuovere il materiale dal passaggio",
      "Riordinare i materiali in un'area di deposito dedicata",
      "Sistemare o proteggere i cavi e i tubi",
      "Indicare un percorso alternativo libero",
      "Verificare le altre vie di passaggio dell'area",
    ],
    casi: [
      {
        id: "4_materiali",
        nome: "Materiali o attrezzature depositati sul passaggio",
        descrizione: "Materiali o attrezzature a terra sul passaggio",
        testoFoto: "Passaggio ostruito da materiali",
        requisito: "Le vie di circolazione devono essere sgombre da ostacoli; i materiali vanno depositati ordinatamente fuori dai passaggi",
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Rimuovere o riordinare i materiali in un'area di deposito, lasciando il passaggio libero",
      },
      {
        id: "4_cavi",
        nome: "Cavi o tubi stesi a terra sul passaggio",
        descrizione: "Cavi o tubi stesi a terra sul passaggio",
        testoFoto: "Cavi stesi sul percorso",
        requisito: "I cavi e i tubi non devono attraversare i passaggi, oppure devono essere protetti (passacavi) o sollevati",
        tipo: "Buona prassi",
        riferimento: { testo: "", verificato: false, nessunoSeBuonaPrassi: true },
        suggerimento: "Sollevare o proteggere i cavi con passacavi, oppure cambiare il loro percorso",
      },
    ],
    ai: {
      cosaVedere: "Oggetti mobili appoggiati a terra su un passaggio o in una zona dove le persone camminano: materiali da costruzione, elementi di ponteggio da montare, attrezzature, cavi o tubi stesi. È un passaggio se è un corridoio, un accesso, una via evidente o se ci sono tracce di calpestio.",
      comeRiconoscere: "Materiali e attrezzature (oggetti): 4_materiali. Cavi o tubi (linee flessibili): 4_cavi.",
      cosaNonE: "Materiale ordinatamente depositato in un'area delimitata o lungo un muro, lontano dal percorso. Elementi fissi che sporgono (è la scheda 5). Oggetti che non invadono il passaggio e lasciano una via libera ampia.",
      fotoDubbia: "Se non si capisce dov'è il passaggio o se l'oggetto lo ostruisce davvero, usare 'verifica_necessaria' e chiedere una foto più ampia. Non segnalare piccoli oggetti isolati (un attrezzo, un pezzo di legno) se il passaggio resta ampio e libero.",
      confronto: "Tipo di oggetto. Se occupa tutta o parte della larghezza del passaggio. Se esiste un percorso alternativo libero.",
    },
  },
  {
    n: 5,
    nome: "Inciampo per strutture sporgenti a terra",
    rischio: "INCIAMPO",
    gravita: "bassa",
    fuoriServizio: "no",
    messaggioFuoriServizio: "",
    azioni: [
      "Segnalare l'ostacolo con nastro o vernice ben visibile",
      "Proteggere la parte sporgente (coprire staffe e ferri)",
      "Ricollocare, accorciare o eliminare l'elemento se possibile",
      "Delimitare il passaggio o deviare il percorso",
      "Verificare altri punti analoghi nella stessa zona",
    ],
    casi: [
      {
        id: "5_ponteggio",
        nome: "Elementi di ponteggio sporgenti (basi, ancoraggi, tubi)",
        descrizione: "Elemento fisso sporgente a terra nella zona di passaggio",
        testoFoto: "Elemento sporgente sul percorso",
        requisito: "I passaggi devono essere liberi da ostacoli; se non è possibile rimuoverli, gli ostacoli devono essere protetti e segnalati",
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Proteggere e segnalare l'elemento sporgente (colore, nastro, protezione), oppure ricollocarlo",
      },
      {
        id: "5_staffe",
        nome: "Staffe, ferri o altri elementi fissi sporgenti",
        descrizione: "Elemento fisso sporgente a terra nella zona di passaggio",
        testoFoto: "Elemento sporgente sul percorso",
        requisito: "I passaggi devono essere liberi da ostacoli; se non è possibile rimuoverli, gli ostacoli devono essere protetti e segnalati",
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Proteggere o coprire la parte sporgente e segnalarla, oppure accorciarla o eliminarla",
      },
    ],
    ai: {
      cosaVedere: "Elementi fissi, o ancorati a una struttura, che sporgono dal terreno o dal piano di calpestio, o dal perimetro di una struttura (ponteggio), in una zona dove si cammina: staffe, ferri, tubi, basi di ponteggio, piastre. Valgono se non sono protetti o segnalati.",
      comeRiconoscere: "Elemento di ponteggio (basi, ancoraggi, tubi): 5_ponteggio. Staffe, ferri o altri elementi fissi: 5_staffe. Elemento mobile appoggiato a terra: è la scheda 4.",
      cosaNonE: "Elementi sporgenti già protetti o segnalati. Sporgenze in alto, sopra la testa (rischio urto, non inciampo). Elementi lontani dai passaggi.",
      fotoDubbia: "Se non si capisce se l'elemento è fisso o appoggiato, o se si trova su un passaggio, trattarlo come materiale a terra (4_materiali) oppure usare 'verifica_necessaria' e chiedere una foto più chiara.",
      confronto: "Se l'elemento è protetto o segnalato. Quanto invade il passaggio (poco o molto). Se esiste un percorso alternativo libero.",
    },
  },
  {
    n: 6,
    nome: "Mancanza DPI",
    rischio: "MANCANZA DPI",
    gravita: "media",
    fuoriServizio: "no",
    messaggioFuoriServizio: "",
    azioni: [
      "Far indossare subito il DPI mancante",
      "Verificare che il DPI sia disponibile",
      "Ricordare l'obbligo a tutti i presenti",
      "Verificare la consegna dei DPI e la formazione",
      "Controllare gli altri lavoratori della zona",
    ],
    // Scheda 6: un solo rilievo per persona/gruppo; requisito e suggerimento
    // si compongono con i DPI mancanti indicati dall'AI.
    dpi: {
      elmetto: {
        nome: "elmetto",
        requisito: "Il casco di protezione è obbligatorio",
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Far indossare l'elmetto a tutte le persone presenti nell'area di lavoro",
      },
      gilet: {
        nome: "gilet alta visibilità",
        requisito: "Gli indumenti ad alta visibilità sono richiesti",
        tipo: "Legge / norma tecnica",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Far indossare il gilet ad alta visibilità",
      },
      scarpe: {
        nome: "scarpe antinfortunistiche",
        requisito: "Calzature di sicurezza obbligatorie in cantiere",
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "Far indossare le calzature di sicurezza",
      },
    },
    casi: [
      {
        id: "6_dpi",
        nome: "DPI mancante o non indossato",
        descrizione: "DPI mancante o non indossato",
        testoFoto: "DPI non indossato",
        requisito: "", // composto dai DPI mancanti
        tipo: "Legge",
        riferimento: { testo: "", verificato: false },
        suggerimento: "",
      },
    ],
    ai: {
      cosaVedere: "Persone presenti nell'area di lavoro senza: elmetto di protezione; gilet o indumento giallo o arancione ad alta visibilità; solo se ben visibili, scarpe antinfortunistiche. Elmetto in mano, appeso allo zaino o sul braccio conta come non indossato.",
      comeRiconoscere: "Un solo caso: 6_dpi. Un solo rilievo per persona o gruppo, indicando nel campo dpi_mancanti tutti i DPI mancanti (elmetto, gilet, scarpe).",
      cosaNonE: "Persone in ufficio, in baracca o in zone chiaramente fuori dal cantiere operativo. Persone di spalle o lontane di cui non si vede l'equipaggiamento. Imbracatura anticaduta (è la scheda 3). Il colore dell'elmetto non conta. Scarpe se non ben visibili. Altri DPI (guanti, occhiali, protezione udito, ecc.): non segnalare.",
      fotoDubbia: "Se la persona è lontana, di spalle o parzialmente coperta, non segnalare: chiedere una foto più vicina. Per le scarpe segnalare solo se si vedono chiaramente.",
      confronto: "Elenco dei DPI visibili e dei DPI mancanti per ogni persona o gruppo.",
    },
  },
];

// --- Utilità --------------------------------------------------------------
export const TUTTI_I_CASI = SCHEDE.flatMap((s) => s.casi.map((c) => ({ ...c, scheda: s })));
export const trovaCaso = (id) => TUTTI_I_CASI.find((c) => c.id === id);

export function testoRiferimento(rif) {
  if (rif && rif.verificato && rif.testo) return rif.testo;
  if (rif && rif.nessunoSeBuonaPrassi) return "Buona prassi (nessun riferimento normativo)";
  return "Riferimento da verificare";
}

/**
 * Costruisce la scheda completa che l'app mostra per un rilievo dell'AI.
 * Tutti i testi normativi arrivano dal catalogo, mai dall'AI.
 */
export function componiRilievo(r) {
  const caso = trovaCaso(r.caso);
  if (!caso) return null;
  const s = caso.scheda;
  const g = GRAVITA[s.gravita];

  let { requisito, tipo, suggerimento, descrizione, testoFoto } = caso;
  let riferimento = testoRiferimento(caso.riferimento);

  if (s.dpi) {
    const mancanti = (r.dpi_mancanti || []).filter((k) => s.dpi[k]);
    const lista = mancanti.length ? mancanti : ["elmetto"];
    const voci = lista.map((k) => s.dpi[k]);
    requisito = voci.map((v) => v.requisito).join(". ");
    suggerimento = voci.map((v) => v.suggerimento).join(". ");
    tipo = [...new Set(voci.map((v) => v.tipo))].join(" / ");
    riferimento = [...new Set(voci.map((v) => testoRiferimento(v.riferimento)))].join("; ");
    const nomi = voci.map((v) => v.nome).join(", ");
    descrizione = `DPI non indossato: ${nomi}`;
    testoFoto = `DPI non indossato: ${nomi}`;
  }

  let proponiFuoriServizio = s.fuoriServizio === "si" ||
    (s.fuoriServizio === "dipende" && !!r.persona_esposta);

  return {
    casoId: caso.id,
    schedaN: s.n,
    nomeScheda: s.nome,
    gravita: s.gravita,
    titolo: `RISCHIO ${g.etichetta} - ${s.rischio}`,
    descrizione,
    testoFoto,
    requisito,
    tipo,
    riferimento,
    suggerimento,
    azioni: s.azioni.map((a) => ({ testo: a, fatto: false })),
    fuoriServizio: {
      proponi: proponiFuoriServizio,
      messaggio: s.messaggioFuoriServizio,
      nota: s.notaFuoriServizio || "",
      attivo: false,
    },
    priorita: g.priorita,
    sla: g.sla,
    // Dati dall'AI (solo descrittivi)
    certezza: r.certezza === "verifica_necessaria" ? "verifica_necessaria" : "certo",
    cosaSiVede: r.cosa_si_vede || "",
    elementiPresenti: r.elementi_presenti || [],
    elementiMancanti: r.elementi_mancanti || [],
    personaEsposta: !!r.persona_esposta,
    richiestaFoto: r.richiesta_foto || "",
    stato: "Da valutare",
    nota: "",
  };
}
