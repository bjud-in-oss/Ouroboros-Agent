## ADR-009: Skydd mot "Forced Descent" via Scout-mönstret, Agent Parking och Inbox Capsules

**Status:** Accepterad [Uppdaterad]
**Datum:** 2026-06-22

**Kontext och Problem:**
När autonoma agenter läser okänd extern data (som webbsidor, källkod eller pull requests) är de extremt sårbara för "Indirect Prompt Injections" (IPI) eller "Forced Descent", där dolda instruktioner kapar agentens mål [1]. Att låta den primära Live-agenten läsa ostrukturerad rådata direkt utgör en oacceptabel säkerhetsrisk [2]. Tidigare övervägdes en svagare modell (Flash-Lite) för detta, men att introducera nya, avvikande modeller bryter mot vår enhetliga hårdvarustandard och skapar onödig komplexitet.

**Beslut:**
Huvudagenten får aldrig läsa extern, opålitlig data direkt [2]. Istället implementeras **Scout-mönstret via den befintliga Fraktala Tillståndsmaskinen och Agent Parking (Session Resumption)**. 
Vi introducerar ingen ny modell. När osäker data måste läsas, pausas en av våra befintliga bakgrundsarbetare (ex. W2) tillfälligt, och dess kognitiva tillstånd sparas i vår sekventiella kö (Durable Kanban). Den frigjorda `gemini-3.1-flash-live`-resursen används för att boota en tillfällig Scout-instans. **AARM-grinden tilldelar Scouten ett dynamiskt, extremt restriktivt och skrivskyddat *Mission Manifesto***. Scouten tvättar datan, utvärderar den, och paketerar den i en ofarlig "Inbox Capsule". Därefter stängs Scouten, och den ursprungliga arbetaren (W2) väcks upp igen på exakt samma millisekund.

**Konsekvenser:**
*   **Enhetlig Arkitektur:** Vi bibehåller vår standard med uteslutande `gemini-3.1-flash-live` för hela systemet, vilket förenklar underhåll och maximerar intelligens.
*   **Kognitiv Isolering:** Huvudagenten läser enbart strukturerade och ofarliga "Inbox Capsules", vilket neutraliserar injektionsrisken [2].
*   **Optimerat Resursutnyttjande:** Genom Session Resumption återanvänder vi befintliga WebSockets utan att spränga API-gränserna.
