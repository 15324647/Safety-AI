// Risposte SIMULATE per provare l'interfaccia senza AI (modalità demo).
// Non usare davanti al cliente: l'app mostra una fascia gialla "RISULTATI SIMULATI".
const SCENARI = [
  {
    esito: "rilievi",
    messaggio: "",
    rilievi: [
      {
        caso: "1_bordo", certezza: "certo", persona_esposta: false,
        cosa_si_vede: "Sul bordo del solaio a destra c'è solo una catena tesa. Manca il parapetto.",
        elementi_presenti: ["catena"], elementi_mancanti: ["corrente superiore", "corrente intermedio", "fermapiede"],
      },
      {
        caso: "6_dpi", certezza: "certo", persona_esposta: false, dpi_mancanti: ["elmetto", "gilet"],
        cosa_si_vede: "Operaio al centro senza elmetto e senza gilet alta visibilità.",
        elementi_presenti: ["scarpe antinfortunistiche"], elementi_mancanti: ["elmetto", "gilet"],
      },
      {
        caso: "4_materiali", certezza: "certo", persona_esposta: false,
        cosa_si_vede: "Tubi e giunti di ponteggio da montare appoggiati sul passaggio in primo piano.",
        elementi_presenti: [], elementi_mancanti: ["passaggio libero"],
      },
    ],
  },
  {
    esito: "rilievi",
    messaggio: "",
    rilievi: [
      {
        caso: "2_scala", certezza: "certo", persona_esposta: true,
        cosa_si_vede: "Scala fissa a pioli sul serbatoio, senza gabbia. Una persona sta salendo.",
        elementi_presenti: ["ancoraggi a parete"], elementi_mancanti: ["gabbia", "sistema anticaduta a guida"],
      },
      {
        caso: "5_staffe", certezza: "verifica_necessaria", persona_esposta: false,
        cosa_si_vede: "Alla base della scala sembra esserci un ferro sporgente dal pavimento, non segnalato.",
        elementi_presenti: [], elementi_mancanti: ["segnalazione", "protezione"],
        richiesta_foto: "Foto più vicina della base della scala",
      },
    ],
  },
  {
    esito: "rilievi",
    messaggio: "",
    rilievi: [
      {
        caso: "3_non_agganciata", certezza: "certo", persona_esposta: true,
        cosa_si_vede: "Operaio sul tetto con imbracatura, ma il cordino pende libero e non è agganciato.",
        elementi_presenti: ["imbracatura", "cordino"], elementi_mancanti: ["aggancio a punto di ancoraggio"],
      },
    ],
  },
  { esito: "nessun_rischio", messaggio: "", rilievi: [] },
];

let i = 0;
export async function analisiSimulata() {
  await new Promise((r) => setTimeout(r, 1800));
  const s = SCENARI[i % SCENARI.length];
  i++;
  return JSON.parse(JSON.stringify(s));
}
