# ARCHITECTURE_CAPSULE_MEMORY.md
> **Kategori:** Kognitiv Hygien, Hierarkisk Minneshantering & Cerebral Compaction
> **Miljö:** Ouroboros Agent OS (3x gemini-3.1-flash-live, Google Drive)
> **Syfte:** Definiera hur agenternas minne hanteras över tre lager för att förhindra kognitiv utspädning . Kapseln dikterar hur W1 och W2:s brusiga sandlåde-experiment asynkront destilleras till rena insikter, och hur W3 (Barnmorskan) förlikar dessa till långtidsminnet (Tier 2) .

## 0. Executive Summary (Analys)
När tre parallella `gemini-3.1-flash-live`-modeller opererar samtidigt genereras massiva mängder kognitivt brus (terminal-loggar, tester, Veto-debatter). Utan kognitiv hygien sprängs kontextfönstret snabbt. Denna kapsel skrotar mekanisk trunkering ("Truncation Shield") till förmån för asynkron minneskomprimering (Cerebral Compaction) . Ur den naturliga friktionen mellan W1 och W2 extraheras endast rena insikter, vilka W3 säkerställer förlikas och sparas i Google Drive (Tier 2) . 

## 0.1 Begrepp och Ordlista
* **Tier 0 (Immutable Genetic Core):** Oföränderligt "DNA". Kärnidentiteten för systemet och de tre arbetarna. Injiceras vid sessionens start och får aldrig raderas eller skrivas över .
* **Tier 1 (Ephemeral Working Memory):** Arbetsminnet inuti den aktiva WebSocket-strömmen . Innehåller det pågående "kladdandet" från W1 och W2 i deras sandlådor. Extremt flyktigt.
* **Tier 2 (Persistent Semantic Ledger):** Det permanenta arkivet på Google Drive . Innehåller skarpa koder, `AGENT_MEMORY.md`, `CURRENT_FOCUS.md` och inkapslade historiker.
* **Cerebral Compactor (The Scribe):** En asynkron bakgrundsprocess som utvärderar Tier 1 när det närmar sig maxkapacitet, filtrerar bort skräp, och destillerar en kompakt sanning .
* **Eval-Driven Memory (EDM):** Ett kvalitetsfilter. Minnen får enbart sparas i Tier 2 om den underliggande uppgiften överlevde den naturliga friktionen och Veto-protokollet .

## 1. Minnets Tre Lager och Arbetarnas Roller
I Ouroboros är minnet en levande, filtrerande organism där arbetarna förhåller sig olika till de tre lagren .
* **W1 & W2 i Tier 1:** När W1 skissar på visionen framåt och W2 kör tester/kraschanalyser bakåt, fylls deras Tier 1-minne omedelbart. Deras kontext är fylld av tillfällig, nödvändig friktion.
* **W3 (Barnmorskan) i Tier 2:** W3 observerar planeringen. När W3 orkestrerar pånyttfödelsen (Cykel 4) är det W3 som formulerar de varaktiga minneskapslarna och uppdaterar Lager 3-filerna på Google Drive, så att endast en *renare skapelse* bevaras för framtiden.

## 2. Kognitiv Komprimering (Anti-Entropy Pruning)
För att skydda systemet mot *Knowledge Entropy* (att minnesgrafen kollapsar av skräpdata) tillämpas följande filtrering :
1. **Tröskel:** När Tier 1 närmar sig 70 % av kontextfönstret (eller vid parkering) triggas *Cerebral Compactor* .
2. **EDM-Filtrering:** Systemet utvärderar vad som faktiskt hände. Gick koden igenom Veto-granskningen av W1 och W2?
3. **Hindsight Notes:** Om en återvändsgränd nåddes och systemet tvingades försonas, skapas asynkront en "Hindsight Note" i minnet (t.ex. "Strategi X misslyckades på grund av en port-krock") . 
4. **Injektion:** Den brusiga historiken rensas ur strömmen och den kompakta JSON-insikten injiceras i botten av agentens minne som en ny baslinje .

## 3. Minnets Återuppståndelse (Wake-Up Sync)
Eftersom Ouroboros ständigt grenar ut sig fraktalt kan agenter "parkeras" genom *Session Resumption* för att spara hårdvaruresurser .
* Innan agenten kopplas från sparas dess pågående tankar via Write-Ahead Log (WAL) i IndexedDB .
* När agenten väcks upp igen uppstår ingen "Split-Brain". Systemet laddar in Tier 0, spelar upp WAL-händelserna, och injicerar de senaste `[SYSTEM_NOTIFICATION]`-sanningarna från Tier 2, varpå agenten fortsätter exakt där den stannade men fullt medveten om W3:s senaste förlikningar .
