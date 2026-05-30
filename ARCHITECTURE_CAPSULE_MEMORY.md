# ARCHITECTURE_CAPSULE_MEMORY
## Ouroboros 2.0: Live-First Hierarkisk Minneshantering & Kognitiv Hygien

**Dokumentstatus:** Aktiv Arkitekturritning  
**Miljö:** WebSocket Live-First (Strömmande), Root Repo med Session Resumption  
**Syfte:** Fastställa en vattentät hierarkisk minneshantering för att eliminera Model Entropy, stabilisera agentens identitet, och hantera tillstånd under parkering.

---

## 1. Den Strömmande Verkligheten (Live-First)

I och med övergången från asynkrona REST-anrop till **Live-First (WebSockets)** befinner sig Ouroboros i ett ständigt strömmande tillstånd. Råtext, audio, videoframes och systemhändelser (verktygsanrop) avlöser varandra i realtid. 

Denna arkitektur tvingar fram en minneshantering som inte bara är textbaserad, utan *tidskritisk* och *tillståndsmedveten*. Agentens identitet och arbetsminne måste separeras logiskt, annars riskerar systemet en kognitiv överbelastning (kollaps av kontextfönstret) eller identitetsdrift när det strömmande fönstret fylls.

---

## 2. Hierarkisk Minnesarkitektur (Tier 0 - Tier 2)

För att garantera kognitiv hygien delas agentens minne in i tre strikt isolerade lager.

### Tier 0: Immutable Genetic Core (Identitetsfryspunkten)
**Syfte:** Fastställa agentens orubbliga syfte och arbetsmetodik innan någon session initieras.
* **Funktion:** Detta är "System Instruction"-blocket som injiceras exakt när WebSocket-anslutningen öppnas (bootstrap). 
* **Restriktioner:** Det är **skrivskyddat**. Agenten kan under inga omständigheter skriva över sin Tier 0. Den innehåller det "Vatikaniska" regelverket (ex. *Du modifierar aldrig kod utan att skapa en WAL-händelse, Du utvärderar alltid sanningar innan de sparas*).
* **Livscykel:** Initieras 1 gång per session. Följer med vid varje Session Resumption.

### Tier 1: Ephemeral Working Memory (Cerebral Stream)
**Syfte:** Hantera nuvarande operationer, pågående samtal och strömmande verktygsexekvering.
* **Funktion:** Den aktiva strömmen av händelser inuti den öppna WebSocket-sessionen.
* **Livscykel:** Flyktigt. Detta minne ackumuleras snabbt. När kontextfönstret når en förutbestämd gräns (t.ex. 60 % kapacitet), eller när agenten ska parkeras, utlöses **Cerebral Compaction** (se avsnitt 3) som tömmer Tier 1 och flyttar destillatet till Tier 2.

### Tier 2: Persistent Semantic Ledger (Eval-Driven Memory / EDM)
**Syfte:** Långtidslagring, kunskapsgraf och kontextkapslar sparade på Google Drive (eller Root Repo).
* **Funktion:** Det semantiska arkivet. Här lagras enbart verifierade sanningar, atomiska arkitekturhistoriker och kodbas-snapshots. 
* **Skyddsmekanism (Eval-Driven):** En sanning skrivs aldrig direkt till Tier 2 från Tier 1. Innan komprimerat minne flyttas från Tier 1 till Tier 2, utvärderas det av en oberoende mikrogren (EDM-validering) för att säkerställa att inga kognitiva hallucinationer sipprar ner i arkivet.

---

## 3. Minneskomprimering & Gallring (Anti-Entropy Pruning)

När Ouroboros bearbetar massiva mängder live-data måste vi aktivt förhindra brus. Truncation Shield (yxan) är borttagen, vi arbetar nu med destillation.

### 3.1 Cerebral Compactors (Bakgrundsprocessen)
Istället för att bara radera äldre delar av WebSocket-strömmen, agerar en bakgrundsprocess (en tyst asynkron funktion) som en komprimator.
1.  **Tröskel uppnådd:** När Tier 1 passerar X antal tokens/frames.
2.  **Snapshot-extraktion:** Systemet begär en "Sammanfattande Kapsel" av de senaste N-interaktionerna.
3.  **Destillation:** Compactor-prompten extraherar *enbart*:
    * Arkitektoniska beslut tagna.
    * Filer som modifierats.
    * Nyinlärda domänsanningar.
4.  **Injektion:** Rå-historiken rensas ur Tier 1 (sessionen startas om/resumas med en rensad logg) och ersätts av den komprimerade JSON-kapseln som en `system_context`-händelse.

### 3.2 Anti-Entropy Pruning
En dedikerad rutin går igenom Tier 2 (Google Drive-arkivet) varje gång agenten bootas från en parkerad status.
* **Konflikthantering:** Om två komprimerade kapslar innehåller motstridiga sanningar (t.ex. "Fil X ligger i mapp A" vs "Fil X är borttagen"), tillämpar gallringen en hierarkisk tidsstämpling för att radera den äldre/förlegade regeln. Detta förhindrar *Model Entropy* där agenten blir schizofren av motsägelsefull historik.

---

## 4. Parkering & Session Resumption (Root Repo)

Eftersom vi använder Ouroboros som ett Root Repo måste agenten kunna "parkeras" för att spara API-kvoter. Detta måste göras utan att orsaka en "Split-Brain" mellan den aktiva sessionen och den lokala/moln-baserade sandlådan.

### 4.1 Write-Ahead Log (WAL) Protokollet
Innan agenten kopplas från (WebSocket stängs ner):
1.  **Atomiska Händelser:** Varje enskilt kodändringsbeslut i Tier 1 måste registreras som en WAL-händelse (Write-Ahead Log) i IndexedDB *innan* det appliceras i koden/E2B.
2.  **Flushing:** Vid parkering stängs WebSocketen ner. Compactor-processen kör en sista körning. Resultatet och alla oapplicerade WAL-händelser sparas som en `session_state.json` på Google Drive.
3.  **Död Sandlåda:** E2B- eller WASM-sandlådan kan nu dö eller pausas.

### 4.2 Session Resumption (Uppvaknandet)
När agenten väcks upp igen:
1.  Systemet initierar WebSocket och injicerar **Tier 0** (Identity Freeze).
2.  Ouroboros hämtar `session_state.json` (Tier 2/WAL) från Google Drive.
3.  Ouroboros tillämpar alla händelser i loggen på den nystartade sandlådan (E2B) för att bygga upp exakt samma fysiska filtillstånd som vid parkeringen.
4.  Den komprimerade kognitiva kapseln injiceras som den första händelsen i WebSocket-strömmen. Agenten "vaknar" i exakt samma sinnesstämning och med exakt samma kontext, helt utan brus från föregående sessioner.

---

### Exempel på en Komprimerad Kognitiv Kapsel (JSON):

```json
{
  "timestamp": "2026-05-29T15:30:00Z",
  "active_task": "Implementera PWA Service Worker",
  "verified_truths": [
    "iOS stöder ej Wake Lock API, använd manuell audio gain.",
    "Root Repo hanterar WAL för state-sync."
  ],
  "pending_wal_events": [
    {"action": "update_file", "path": "/src/audioHandler.ts", "status": "pending_flush"}
  ]
}
```

Genom denna arkitektur kan Ouroboros leva i det strömmande bruset (Live-First), arbeta i flyktiga miljöer (E2B/WASM), och parkeras utan att någonsin förlora sin kärnidentitet eller lida av "Split-Brain".
