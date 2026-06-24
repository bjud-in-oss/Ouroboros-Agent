## ADR-011: Händelsestyrd Write-Ahead Log (WAL) och Kognitiv Rebase (OCC)

**Status:** Accepterad [Retroactive Record]
**Datum:** 2026-06-22

**Kontext och Problem:**
I övergången till ett federerat, asynkront multi-agent-nätverk (Root Repo) där flera agenter och ibland en människa parallellt arbetar mot samma Google Drive-filsystem, uppstår det klassiska problemet med "Write-Write Conflicts" eller "Lost Updates" [1, 2]. Om Agent A läser en fil, och en människa under tiden agenten "tänker" modifierar filen, skulle Agent A skriva över människans arbete och orsaka tyst datakorruption (Split-Brain) [2, 3]. Dessutom skapar nätverksbortfall och hårda tidsgränser (t.ex. när en Live API-session bryts eller en WebContainer-sandlåda tajmar ut) risken för att data går förlorad i tomma intet [4, 5].

**Beslut:**
Vi slår fast tre sammanflätade arkitektoniska principer för att säkerställa 100 % transaktionssäkerhet utan en central backend-databas:

1. **Optimistic Concurrency Control (OCC) via ETags:** Filhanteraren (`driveService.ts`) använder Google Drives inbyggda versionshantering (ETags/Revision IDs). Vid varje skrivning (PATCH/PUT) skickas headern `If-Match: "<ETAG_VALUE>"` med. Detta tvingar fram ett hårt valideringslås hos Google [6-8].
2. **Kognitiv Rebase (Wake-Up Sync):** Om Drive API:et returnerar HTTP 412 (Precondition Failed) på grund av en ETag-konflikt, tillåts systemet inte att krascha [9, 10]. Istället avbryts handlingen och agenten utför en "Kognitiv Rebase". Den laddar asynkront ner den nya sanningen, jämför sina egna planerade ändringar med den nya koden (likt en `git rebase`), och försöker applicera uppdateringen igen [11-13]. Vid olösliga strukturella konflikter pausar agenten och överlämnar frågan till användaren i chatten [5, 12].
3. **Event-Driven Write-Ahead Log (WAL):** Inga nätverksanrop mot molnet får genomföras utan att handlingen först registrerats asynkront som ett atomiskt event med status `PENDING` i webbläsarens lokala `IndexedDB` [14, 15]. När skrivningen godkänts av Drive markeras den som `COMMITTED` [14, 16]. 

**Konsekvenser:**
*   **Split-Brain eliminerat:** Det är matematiskt omöjligt för agenten att tyst skriva över data som förändrats av en annan part [9, 17].
*   **Millisekundexakt kraschåterhämtning:** Om webbläsaren kraschar eller en agent parkeras mitt i en operation, läses WAL-loggen av vid nästa uppstart (Session Resumption). Alla avbrutna händelser ("pending_flush") spelas upp igen och flushas mot molnet, vilket gör att agenten återupptar sitt arbete utan dataförlust [14, 16, 18].
*   **Naturlig försoning:** HTTP 412-felet och Rebase-logiken blir en integrerad del av det kognitiva tillståndet "Att försonas", där systemet tvingas betrakta krockar, läka sitt eget minne och mjukt anpassa sig efter omvärlden utan tvång [19, 20].