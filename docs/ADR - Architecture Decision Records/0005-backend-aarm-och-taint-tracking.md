## ADR-005: Backend-AARM och Context Accumulation

**Status:** Accepterad
**Datum:** 2026-06-22

**Kontext och Problem:**
Under våra Red-Team-stresstester konstaterades att klientsides-säkerhet (i React) är otillräcklig [6, 7]. Modellen själv (LLM) får aldrig utgöra den slutgiltiga säkerhetsgränsen, eftersom ostrukturerad indata snabbt kan kapa agentens avsikter via "Indirect Prompt Injections" (Forced Descent) [8, 9]. En komprometterad agent kan genomföra lagliga sekventiella steg (t.ex. läsa en hemlig fil och sedan skicka den) för att åstadkomma skada i så kallade "Sequential Tool Attack Chains" (STAC) [10].

**Beslut:**
Vi beslutar att fullständigt skrota all säkerhetslogik på klientsidan. **AARM (Autonomous Action Runtime Management) etableras som en oantastlig, deterministisk mjukvarugrind i backend** [6, 7]. Vidare implementeras **'Context Accumulation' (Smittspårning / Taint Tracking)** för att övervaka agentens flöden över tid [11].

**Konsekvenser:**
*   **Taint Tracking:** AARM spårar den semantiska distansen i agentens handlingar. Om agenten har hanterat osäker/smittad data (UNTRUSTED), blockeras deterministiskt alla utåtriktade exfiltreringsanrop [11].
*   **Manifesto-Driven:** AARM fryser varje asynkront verktygsanrop och godkänner eller nekar det ("Context-Dependent Deny") enbart baserat på ett oföränderligt, kryptografiskt signerat Mission Manifesto [9, 12].
*   **Självläkning:** Avvisade anrop kraschar inte systemet, utan returnerar en tyst "Execution Trace" som tvingar agenten att ändra strategi [9].
