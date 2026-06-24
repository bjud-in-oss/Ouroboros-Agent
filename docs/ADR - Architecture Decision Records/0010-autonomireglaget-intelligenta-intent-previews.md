## ADR-010: Autonomireglaget, Intelligenta Intent Previews och Mjuk Överlämning

**Status:** Accepterad [Uppdaterad]
**Datum:** 2026-06-22

**Kontext och Problem:**
Säkerhetsgrindar (AARM) som enbart blockerar anrop och kastar upp varningsskyltar skapar ett fientligt och oanvändbart gränssnitt. Användaren lämnas ensam med att bedöma om en osäker källa är relevant, och om källan är dålig får användaren inget stöd i att hitta en ny. För att Ouroboros ska fungera som en intelligent samarbetspartner måste Intent Previews vara ett beslutsstöd, inte bara en vägtull [3].

**Beslut:**
Autonomireglaget och Intent Previews uppgraderas till att bli assisterande och konverserande genom tre mekanismer:
1.  **Preliminär Kvalitetsbedömning:** När Scout-agenten tvättar extern data (se ADR-009), ges den även i uppdrag att **utvärdera källans relevans och kvalitet mot `CURRENT_FOCUS.md`**. Denna bedömning (t.ex. "Källan är säker men använder föråldrad React-syntax") presenteras direkt i Intent Preview-kortet.
2.  **Konverserande Källkritik:** Eftersom AARM fryser anropet asynkront med ett mjukt `DEFER`-event [4], förblir röstströmmen till Huvudagenten (W1) öppen. W1 kan läsa Scoutens säkra metadatabedömning från Inbox Capsulen och diskutera källans kvalitet med användaren, **helt utan att W1 någonsin exponeras för den osäkra, råa källdatan**.
3.  **Inbyggt Sökstöd (Search Grounding):** Om användaren väljer "Redigera/Avbryt" för att källan bedöms vara otillräcklig, lämnas användaren inte ensam. Gränssnittet kopplar omedelbart in Research-agenten (W3). Med hjälp av Google Search Grounding föreslår W3 aktivt nya, verifierade sökträffar i samma gränssnitt, vilket hjälper användaren att snabbt rikta om systemet mot en bättre källa.

**Konsekvenser:**
*   **Samarbetande Säkerhet:** Säkerhetskontroller blir en dialog snarare än ett hinder, vilket dramatiskt förbättrar UX.
*   **Informerade Beslut:** Människan i loopen får AI-assisterad källkritik presenterad i klartext innan ett godkännande tvingas fram.
*   **Sömlös Iteration:** Avvisade källor leder organiskt till nya, AI-stödda sökningar utan att arbetsflödet bryts.