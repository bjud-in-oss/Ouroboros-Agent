# ADR 0001: Dual-Folder Shadow Architecture (Drive-Native Relay Coding)

**Status:** accepted [1]

## Kontext & Problem
Vi bygger ett "Live-First" Agent OS där autonoma agenter ständigt skriver och utvärderar kod. Om agenten redigerar filer direkt i den aktiva arbetskatalogen triggas Vites "File-Watcher", vilket startar om utvecklingsservern och omedelbart dödar agentens WebSocket-anslutning. 

## Beslut
Vi inför en "Dual-Folder Shadow Architecture" där filhantering och kodexekvering separeras helt:
1. **Google Drive är Single Source of Truth:** All källkod och systemdokumentation behandlas som rena textsträngar. Drive hanterar låsning och datakrockar via Optimistic Concurrency Control (E-Tags).
2. **WebContainers är den isolerade testbänken:** Agenten laddar ner koden till en skuggmapp (t.ex. `/tmp/test-app`) inuti Linux-sandlådan i webbläsaren. Där körs kompilering och tester.
3. **Stafettkodning (Relay Coding):** Om testerna i skuggmappen passerar, skickar agenten tillbaka delta-uppdateringen till Drive och låser upp filen med sitt E-Tag för nästa agent i stafetten.

## Övervägda Alternativ (Considered Options) [1]
* **Fullständig Git-integration (isomorphic-git) inuti WebContainers:** Förkastades. Git är optimerat för asynkront mänskligt samarbete över dagar/veckor. För autonoma agenter som arbetar i millisekunder med "Micro-Chunking" (en fil i taget) skapar Git-merges och branch-hantering en onödig, tung nätverks- och minnesoverhead.

## Konsekvenser (Consequences) [1]
* **Extremt förenklad I/O:** Gränsen mellan minneshantering (text) och mjukvaruutveckling (kod) försvinner; agenten använder exakt samma Drive-protokoll för båda.
* **Degradering av Git:** Git nedgraderas från en kritisk infrastruktur i den inre AI-loopen till ett valfritt export-plugin för människor som vill samarbeta med större utvecklarteam i efterhand.
