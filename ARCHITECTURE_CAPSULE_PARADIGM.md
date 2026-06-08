# ARCHITECTURE_CAPSULE_PARADIGM.md - The Cognitive State Machine & Fallback Matrix

## 1. Syfte
Denna kapsel definierar Ouroboros fundamentala kognitiva motor. Den dikterar i vilken ordning systemet utvärderar handlingar (State Machine), hur varje tillstånd bryts ner i planerande och exekverande cykler (Den Fraktala Loopen), samt vilka AI-motorer som är tillåtna som fallbacks.

Dessa regler är inte rekommendationer; de ska implementeras som stenhårda logiska guardrails (AARM-Gate) i kodbasen (`liveOrchestratorSync.ts` / `aarmGate.ts`).

## 2. Den Övergripande Tillståndsmaskinen (State Machine)
Agentens medvetande drivs av tre filosofiska och tekniska faser. Den startar alltid i Fas 1 vid uppstart och utvärderar om den har rätt tillstånd för att agera.

* **FAS 1: ATT PÅVERKA (Act)**
  * **Logik:** Agenten utvärderar sitt mål och försöker exekvera utåtriktade kommandon (t.ex. `shell_exec`).
  * **Guardrail:** Om `app-data.json` eller kontext saknas, blockeras denna fas. Agenten tvingas asynkront till Fas 2.
* **FAS 2: ATT PÅVERKAS (Listen/Transform)**
  * **Logik:** Systemet spärras för destruktiva verktyg. Agenten tar emot tysta systemuppdateringar (via `send_realtime_input`) och läser in kontext (WAL/constants).
  * **Guardrail:** Agenten kan inte lämna fasen förrän all data är validerad av AARM.
* **FAS 3: ATT FÖRSONAS (Synthesize/Heal)**
  * **Logik:** Vid systemkrasch eller slutförd process stannar agenten upp, accepterar gapet till verkligheten, och rullar tillbaka (Rollback via WAL).
  * **Guardrail:** Ljudströmmen låses upp. Agenten redovisar sin insikt muntligt till användaren.

## 3. Den Fraktala Kognitiva Loopen
Oavsett vilken av de tre faserna agenten befinner sig i, måste dess handlingar (även interna sådana) passera genom en fraktal 4-stegsraket för att undvika hallucinationer.

* **Cykel 1-3 (Planeringsfasen):** Agenten analyserar problemet, hämtar data (`read_file`, `fetch_thought_signature`) och bygger en mental modell eller `Rationale_Log`. AARM godkänner planen.
* **Cykel 4 (Materialiseringsfasen):** Den faktiska exekveringen (t.ex. skriva en fil till WebContainern eller byta fokus).
* **AARM-Regel:** Ett "Cykel 4-anrop" (destruktivt/muterande anrop) blockeras obönhörligen om det saknar en spårbar "Cykel 3-plan" (Execution Trace/Rationale) i minnet.

## 4. Den Kognitiva Fallback-Matrisen
För att garantera systemets överlevnad och förhindra "Split-Brain", styrs vilka AI-motorer som får användas beroende på Fas och krissituation.

### Fas 1: Att Förändra
* **Primär:** Live API (Gemini 3.1 Live)
* **Fallback:** INGEN.
* *Regel:* Utåtriktad handling kräver människan "in-the-loop". Är Live-kabeln nere, fryses systemet.

### Fas 2: Att Förändras
* **Primär:** Live API
* **Fallback 1:** REST API (Gemini 2.5 Flash)
* **Fallback 2:** `notebooklm-mcp`
* *Regel:* Om kontextuppdateringen är för stor för Live, delegeras inlärningen tyst till REST. Saknar agenten djup kunskap (t.ex. teknisk dokumentation), anropas NotebookLM som extern "kunskaps-API" för att bygga förståelse innan systemet muterar.

### Fas 3: Att Försonas
* **Primär:** Live API
* **Fallback 1:** REST API (För automatisk Rollback i bakgrunden)
* **Fallback 2:** `notebooklm-mcp`
* *Regel:* Vid kritiska haverier (t.ex. HTTP 412 mot Drive) där agenten inte förstår felet, anropas NotebookLM som en "systemterapeut" för att debugga arkitekturen utifrån dokumentationen innan relationen med användaren återupprättas.