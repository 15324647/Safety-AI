// Costruisce le istruzioni per l'AI a partire dal catalogo.
// Non modificare qui i contenuti safety: si cambiano in public/js/catalogo.js
import { SCHEDE, REGOLE_AI, TUTTI_I_CASI } from "../public/js/catalogo.js";

export const ID_CASI = TUTTI_I_CASI.map((c) => c.id);

export function systemPrompt() {
  const regole = REGOLE_AI.map((r, i) => `${i + 1}. ${r}`).join("\n");

  const schede = SCHEDE.map((s) => {
    const casi = s.casi.map((c) => `   - ${c.id}: ${c.nome}`).join("\n");
    return `### SCHEDA ${s.n} — ${s.nome} (gravità ${s.gravita})
Codici caso ammessi:
${casi}
Cosa deve vedere: ${s.ai.cosaVedere}
Come riconoscere il caso: ${s.ai.comeRiconoscere}
Cosa NON è questa condizione: ${s.ai.cosaNonE}
Se la foto è dubbia: ${s.ai.fotoDubbia}
Cosa confrontare con il requisito: ${s.ai.confronto}`;
  }).join("\n\n");

  return `Sei l'assistente di un ispettore safety in un cantiere edile italiano.
Ricevi UNA foto scattata dall'ispettore con lo smartphone. Devi riconoscere SOLO le condizioni descritte nelle schede qui sotto e nessun'altra.
Rispondi sempre chiamando lo strumento "registra_rilievi".

## REGOLE GENERALI
${regole}

## COME COMPILARE I CAMPI
- caso: uno dei codici ammessi. Mai inventare codici.
- certezza: "certo" solo se l'elemento si vede chiaramente; altrimenti "verifica_necessaria".
- cosa_si_vede: 1-2 frasi brevi, da cantiere, che descrivono dove si trova il problema nella foto e cosa si vede (es. "Sul bordo del solaio a destra c'è solo una catena, manca il parapetto"). Niente misure, niente norme.
- elementi_presenti / elementi_mancanti: parole brevi con i termini delle schede (es. "corrente superiore", "fermapiede", "gabbia", "imbracatura", "cordino").
- persona_esposta: true se una persona è esposta al pericolo in quel momento (es. persona sulla scala alla marinara, persona in quota). Per la scheda 2 va sempre valorizzato.
- dpi_mancanti: solo per il caso 6_dpi, valori ammessi "elmetto", "gilet", "scarpe".
- richiesta_foto: se certezza è "verifica_necessaria", indicare quale foto scattare (es. "Foto più vicina del bordo del solaio").
- Ordinare i rilievi dal più grave al meno grave (alta, media, bassa). Massimo 6.
- esito "nessun_rischio": nessuna delle condizioni previste è visibile. esito "foto_non_idonea": la foto non mostra un'area di lavoro o è inutilizzabile; in questo caso compilare "messaggio" con cosa fotografare.

## SCHEDE
${schede}`;
}

export const TOOL = {
  name: "registra_rilievi",
  description: "Registra l'esito dell'analisi della foto di cantiere.",
  input_schema: {
    type: "object",
    properties: {
      esito: { type: "string", enum: ["rilievi", "nessun_rischio", "foto_non_idonea"] },
      messaggio: { type: "string", description: "Messaggio breve per l'ispettore (solo se serve)." },
      rilievi: {
        type: "array",
        maxItems: 6,
        items: {
          type: "object",
          properties: {
            caso: { type: "string", enum: ID_CASI },
            certezza: { type: "string", enum: ["certo", "verifica_necessaria"] },
            cosa_si_vede: { type: "string" },
            elementi_presenti: { type: "array", items: { type: "string" } },
            elementi_mancanti: { type: "array", items: { type: "string" } },
            persona_esposta: { type: "boolean" },
            dpi_mancanti: { type: "array", items: { type: "string", enum: ["elmetto", "gilet", "scarpe"] } },
            richiesta_foto: { type: "string" },
          },
          required: ["caso", "certezza", "cosa_si_vede", "persona_esposta"],
        },
      },
    },
    required: ["esito", "rilievi"],
  },
};
