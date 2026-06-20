# ARCHITECTURE_CAPSULE_MCP.md - V2 Model Context Protocol & Execution Interface

## 1. Syfte och Omfång
Denna kapsel definierar gränssnittet för Ouroboros "händer" – Model Context Protocol (MCP) och exekveringen av terminalkommandon via `shell_exec`. Den reglerar hur systemet växlar mellan realtidsinteraktioner och strukturerade verktygsanrop, samt hur modellens kognitiva djup kontrolleras under exekvering.

## 2. Inkrementell Verktygsdefinition (`shell_exec`)
Modellens förmåga att påverka sin omgivning sker via native funktionsanrop. Verktyget `shell_exec` deklareras i systemets `FunctionDeclaration` med strikt typade parametrar för att garantera strukturerad utdata från motorn.

### Verktygsstruktur (OpenAPI-schema)
* **Namn:** `shell_exec`
* **Beskrivning:** Exekverar ett terminalkommando inuti webbläsarens lokala WebContainer (Workspace Kernel).
* **Parametrar (Strikt JSON-schema):**
  * `command` (Type.STRING, Required): Det exakta terminalkommandot som ska köras (t.ex. `npm run build`, `cat src/constants.ts`).
  * `rationale` (Type.STRING, Required): En intern motivering som förklarar varför detta kommando körs, i enlighet med Forge-protokollet.

## 3. Kognitiv Styrning: `thinkingBudget` vs `thinkingLevel`
För att förhindra hallucinationer under komplex kodexekvering måste MCP-lagret tvinga modellen till inre resonemang (Thinking). Detta styrs explicit beroende på vilken generation av Preview-modell som körs över Live-kabeln:

| Modell-generation | Kontrollparameter | Konfiguration för MCP (Hög Kognition) |
| :--- | :--- | :--- |
| **Gemini 2.5 Flash Live Preview** | `thinkingBudget` | Sätts till ett dedikerat token-antal eller `-1` för maximalt dynamiskt utrymme. |
| **Gemini 3.1 Flash Live Preview** | `thinkingLevel` | Sätts stenhårt till `"medium"` eller `"high"` under kodexekvering. |

*Obs: Denna konfiguration låses vid sessionens handskakning (`BidiGenerateContentSetup`) och kan inte ändras per-turn utan att sessionen startas om.*

## 4. Hybrid-Execution: När REST kompletterar Live
Även om den aktiva agent-loopen strömmar asynkront över Live WebSockets, behåller arkitekturen REST API-anrop (`generateContent`) för specifika, isolerade operationer:
1. **Cold Boot Snykronisering:** Vid initial laddning används REST för att läsa av `app-data.json` och validera filträdet på Google Drive innan WebSockets initieras.
2. **State Sanity Checks:** Om en Live-worker rapporterar ett kritiskt fel eller drabbas av nätverks-timeout, kan Orkestratören skjuta ett isolerat REST-anrop för att verifiera om WebContainern fortfarande lever, utan att störa röst- eller strömningskanalerna.

## 5. Exekveringsflöde och Parser-regler
1. När modellen anropar `shell_exec` genereras ett `BidiGenerateContentToolCall`-paket.
2. Parsern i `geminiService.ts` måste extrahera `id`, `name` och `args` från paketet.
3. Innan kommandot skickas vidare till terminalen utlöses ett asynkront "Instant-Ack" för att hålla sessionen vid liv.