# ARCHITECTURE_CAPSULE_MEMORY.md
> **Kategori:** Kognitiv Hygien, Lokalt Rullande Kontextminne & Cerebral Compaction
> **Miljö:** Ouroboros Agent OS (3x gemini-3.1-flash-live, Application-Driven Context)
> **Syfte:** Definiera hur agenternas minne hanteras över tre lager för att förhindra kognitiv utspädning. Kapseln dikterar hur *Förändra* och *Vända*:s brusiga sandlåde-experiment asynkront destilleras till rena insikter, och hur *Förlikas* (Orkestratören) förlikar dessa till långtidsminnet lokalt utan att förlora tråden under "Den Långa Strävan".

## 0. Executive Summary (Analys)
När tre parallella `gemini-3.1-flash-live`-modeller opererar samtidigt i en connection pool genereras massiva mängder kognitivt brus (ljudström, terminal-loggar, Veto-debatter). Utan kognitiv hygien sprängs kontextfönstret (65k TPM-taket) snabbt. 

**Kritisk Nätverkslag:** Eftersom Googles server-sidans `Session Resumption` raderar minnet totalt när man återansluter med Ephemeral Tokens (Amnesi-buggen), skrotar denna arkitektur all tillit till inbyggt serverminne. Hela kontextfönstret mäts, städas och styrs **lokalt i vår React-Orkestratör**. Ur den naturliga friktionen mellan *Förändra* och *Vända* extraheras rena insikter i klartext, vilka *Förlikas* säkerställer sparas i Google Drive (Tier 2) och injicerar asynkront via `send_realtime_input`.

## 0.1 Begrepp och Ordlista
* **Tier 0 (Immutable Genetic Core):** Oföränderligt "DNA". Kärnidentiteten för systemet och de tre agent-rollerna. Innehåller systemprompterna som injiceras vid uppstart och får aldrig skrivas över.
* **Tier 1 (Local Ephemeral Context):** Den lokala JSON-datastrukturen i Orkestratören som håller reda på det pågående "kladdandet" från sandlådorna. Denna yta är 100 % transparent och kan inspekteras i UI:t under fliken "Aktuellt Kontextfönster".
* **Tier 2 (Persistent Semantic Ledger):** Det permanenta arkivet på Google Drive och Kanban-tavlan. Innehåller skarp källkod, `AGENT_MEMORY.md` och `CURRENT_FOCUS.md`. Det är här "Den Långa Strävan" förankras så att agenterna kommer ihåg långsiktiga mål efter pauser.
* **Cerebral Compactor (Lokalt 80%-verktyg):** En intelligent bakgrundsprocess i vår kod. När den mäter att in-flight tokens (text + tungt ljud) närmar sig 80% av kapaciteten, kliver den in, rensar råloggar, sammanfattar historiken till täta JSON-insikter, men håller systemets kärnlagar stenhårt låsta i botten av minnet.
* **Eval-Driven Memory (EDM):** Kvalitetsfiltret. Minnen och kodändringar får enbart sparas i Tier 2 om den underliggande uppgiften överlevde den naturliga friktionen och Veto-protokollet.

## 1. Minnets Tre Lager och Agenternas Roller
I Ouroboros är minnet en levande, applikationsstyrd organism där agenterna förhåller sig olika till lagren under Connection Pooling:
* **Förändra & Vända i Tier 1:** När *Förändra* exekverar kod framåt och *Vända* kör Vitest-kraschanalyser bakåt, fylls strömmen omedelbart. Deras tillfälliga friktion strömmas i text och korta ljud-triggers, vilket gör att minnet fylls snabbare.
* **Förlikas i Tier 2:** *Förlikas* observerar planeringen asynkront. När *Förlikas* orkestrerar pånyttfödelsen (Cykel 4) sammanställer den historiken, sparar sanningen till Google Drive, och re-injicerar det städede minnet i kabeln till underarbetarna så att en *renare skapelse* bevaras för framtiden.

## 2. Kognitiv Komprimering (Anti-Entropy Pruning)
För att skydda systemet mot *Knowledge Entropy* (att minnesgrafen kollapsar av skräpdata eller FIFO-trunkering hos Google) tillämpas följande applikationsstyrda filtrering:
1. **Mätning & Tröskel:** Vår frontend mäter löpande inkommande tokens. När fönstret når 80 % triggas *Cerebral Compactor* lokalt.
2. **EDM-Filtrering:** Systemet utvärderar vad som faktiskt hände. Gick koden igenom Veto-granskningen av *Förändra* och *Vända*? Allt dött brus rensas bort.
3. **Hindsight Notes:** Om en återvändsgränd nåddes och systemet tvingades förlikas, skapas en tät "Hindsight Note" (t.ex. "Strategi X misslyckades på grund av en port-krock"). 
4. **Hård Re-Injektion:** Den komprimerade text-sanningen och de låsta systeminstruktionerna skjuts in på nytt som en fräsch baslinje i den öppna WebSocket-kabeln via `send_realtime_input`. Modellen glömmer aldrig sina lagar, trots att datatungt ljud strömmar in.

## 3. Minnets Stafettpinne ("Den Långa Strävan")
Eftersom systemet opererar i en fraktal trädstruktur (D3.js Obsidian-vyn) och hanterar långsiktiga mål över tid, används **Durable Kanban** på Google Drive som en stafettpinne:
* När användaren ger ett stort, långsiktigt mål, dokumenteras detta externt på Drive. 
* Underarbetarna (*Förändra* och *Vända*) behöver inte belasta sitt kognitiva minne med hela slutmålet; de får en mikro-kontext anpassad enbart för den lilla nod de befinner sig i (t.ex. "Felsök ljudkön").
* När mikrouppdraget är klart, rapporterar de till *Förlikas*. *Förlikas* sparar framsteget till WAL, läser av nästa tillgängliga uppgift från Kanban-tavlan på Drive, startar en ny undergrupp med dynamiskt uppdragsnamn (t.ex. "Regex-Kirurgerna") och skickar vidare stafettpinnen. Systemet kan pausa och återuppta i veckor utan att tappa tråden.