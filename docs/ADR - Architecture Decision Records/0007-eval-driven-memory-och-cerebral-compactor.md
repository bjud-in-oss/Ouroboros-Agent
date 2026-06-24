## ADR-007: Från Mekanisk Trunkering till Eval-Driven Memory (EDM) & Cerebral Compactor

**Status:** Accepterad [Retroactive Record]
**Datum:** 2026-06-22

**Kontext och Problem:**
I tidigare versioner förlitade sig systemet på en mekanisk "Truncation Shield" eller en "Tail-limit" för att förhindra att Live-sessionens kontextfönster sprängdes när det fylldes av terminalutskrifter och chattbrus. Denna metod kapade historiken i blindo, vilket orsakade plötslig digital amnesi där agenten glömde avgörande arkitekturbeslut [1, 2]. Samtidigt ackumulerades "Knowledge Entropy" när all information okritiskt sparades till Drive, vilket ledde till identitetsdrift över tid.

**Beslut:**
Den mekaniska trunkeringen har skrotats helt [3, 4]. Istället införs en asynkron bakgrundsprocess kallad **Cerebral Compactor** som aktiveras när arbetsminnet (Tier 1) närmar sig en kritisk gräns (exempelvis 70 %) [2, 5, 6]. Denna process använder **Eval-Driven Memory (EDM)** som ett strikt kvalitetsfilter. Minneslagringen baseras nu på ett objektivt prestandamått, t.ex. Planning Efficiency Index (PEI >= 0.8) [7, 8]. Endast framgångsrik kod och strategi som bevisligen fungerade destilleras till kompakta JSON-kapslar och flyttas till långtidsminnet (Tier 2 på Google Drive) [4, 8, 9]. Skräp och syntaxfel raderas, och rena misslyckanden omvandlas till avgränsade "Hindsight Notes" [6, 7].

**Konsekvenser:**
*   **Förhindrar Amnesi:** Agentens historik och arkitekturbeslut raderas inte längre godtyckligt, utan komprimeras intelligent.
*   **Verktygsdriven Precision:** Agentens långtidsminne (Själen) fylls exklusivt med verifierade sanningar, vilket ökar minnets tillförlitlighet drastiskt [7].
*   **Optimerad Token-ekonomi:** Onödigt brus från Live-strömmen rensas, vilket gör det billigare och snabbare att återuppta sessioner via Session Resumption [9].
