# ARCHITECTURE_CAPSULE_UI.md
> **Kategori:** Agentic UI, Människa-Maskin-Interaktion & Visuell Telemetri
> **Miljö:** React, Live API (WebSockets)
> **Syfte:** Definiera hur systemets bakgrundsprocesser, säkerhetsgrindar och asynkrona agenter (W2/W3) visualiseras för människan utan att överbelasta den strömmande röstupplevelsen (W1), med ett starkt fokus på att minimera kognitiv friktion.

## 0. Executive Summary (Analys)
Detta dokument fastställer reglerna för Ouroboros "Agentic UI". Eftersom systemet drivs av kontinuerliga ljud- och textströmmar (Live-First), kan traditionella chatt-gränssnitt inte hantera den asynkrona mängden data. UI:t måste bygga på **"Industrial Clarity"**, där bakgrundsarbete visualiseras diskret, destruktiva åtgärder fångas i interaktiva kort, och utvecklingsmiljön delas upp i logiska paneler.

## 1. Den Fysiska Layouten (3-Panel Workspace)
För att stödja den fulla "End-to-End Agentic Sandbox"-upplevelsen ska gränssnittet (App.tsx) frångå enkla chattvyer till förmån för en tredelad skärmuppdelning:
*   **Vänster Panel (Cockpit):** Chat/Voice-gränssnitt, system-input och anslutningsstatus (Microphone Activity). Här hanteras interaktionen med W1.
*   **Mittenpanel (Maskinrummet):** Visar Terminal HUD (Xterm.js) för rå utdata från WebContainers, samt den interaktiva VFS-trädvyn (Workspace Explorer) för att granska filstrukturen.
*   **Höger Panel (Preview Iframe):** En inbäddad webbläsare som lyssnar på WebContainerns `server-ready`-event. När agenten spinner upp en lokal server (t.ex. Vite eller http-server) renderas resultatet live här.

## 2. Visuell Telemetri (Terminal Rail HUD)
Att skriva ut all bakgrundslogik i huvudchatten skapar kognitiv överbelastning för människan.
*   **Mekanik:** När bakgrundsarbetare (W2/W3) exekverar kod eller komprimerar minne, ska detta *inte* visas som chattmeddelanden.
*   **Lösning:** Använd en "Terminal Rail HUD" – en diskret, pulserande statusindikator (exempelvis "System I/O Processing"). Den faktiska loggen strömmas tyst till Mittenpanelens Xterm.js-instans för transparens, utan att störa den verbala röstströmmen.

## 3. Asynkrona Interventionskort (Intent Previews via CIBA)
Eftersom AARM-grinden skyddar systemet mot farliga handlingar, måste UI:t kunna hantera blockeringar ("Context-Dependent Defer") elegant.
*   När AARM pausar ett destruktivt eller molneskalerande verktygsanrop, får ljudströmmen inte dö.
*   Gränssnittet genererar ett **Intent Preview-kort** (Generative UI) inuti Vänster Panel på naturligt språk.
*   Användaren ges tre tydliga val: **Proceed** (Kör), **Cancel** (Avbryt), eller **Edit** (Justera parametrar manuellt).

## 4. Akustisk UX & Hantering av Barge-in (Virtual Playhead)
Ett stort problem i röst-agenter är när människan avbryter agenten mitt i ett tal (Barge-in) under pågående I/O-arbete.
*   **Virtual Playhead:** För att förhindra "Split-Brain" (där minnet sparar att agenten sa hela meningen, men människan bara hörde halva), måste UI-klienten fästa tidsstämplade markörer i WebRTC-strömmen.
*   Om ett avbrott sker, informerar klienten Live API:et om exakt var ljudströmmen klipptes, så att agentens kontextuella förståelse överensstämmer med verkligheten.
*   **Mjukvarubuffert:** Under tunga, asynkrona text-injektioner (t.ex. Rationale Logs via `send_realtime_input`) måste klienten asynkront köa upp eventuell mänsklig röstinmatning för att undvika att krocka med systemets interna uppdateringar.

## 5. Frictionless UX & Kognitiv Avlastning (Förenkling för användaren)
Ett huvudsyfte med gränssnittet är att transformera Ouroboros från ett komplext utvecklarverktyg till en plattform redo för massanvändning. Användaren måste skyddas från onödig kognitiv belastning genom designfilosofin **"Industrial Clarity"**:
*   **Inga Dolda Tillstånd (No Hidden State):** Gränssnittet ska vara exceptionellt rent och fritt från redundanta inställningar. Aktiva lägen och bakgrundsarbetare måste vara visuellt uppenbara via små, tydliga statuslampor (exempelvis grått för vila, orange för arbete) istället för att blinka med massiv text som rullar.
*   **Visuell Rening (Chatt vs. Maskinrum):** För att chatten inte ska bli en oläslig bubbla som spyr ur sig tusentals rader maskinkod (som installationsloggar), isoleras detta i terminalen längst ner. Huvudchatten bevaras som en ren, mänsklig och strategisk samarbetsyta.
*   **Naturligt Språk istället för JSON:** När AARM presenterar ett "Intent Preview"-kort för att pausa en farlig handling, får det aldrig visas som råa API-parametrar. Det måste översättas till omedelbart begripligt naturligt språk (t.ex. *"Radera budgetrapporten för 2026"*).
*   **Adaptiva Gränssnitt & Snabba Val:** Gränssnittet ska ändra form baserat på uppgiftens krav. Enkla beslut ska presenteras som snabbknappar direkt i samtalsflödet, medan mer komplexa uppgifter kan expandera till en tabellvy eller playground-vy. 
*   **Router Skill för Användaren:** För att bota kognitiv överbelastning när antalet möjliga verktyg och funktioner multipliceras, ska användaren inte behöva memorera dussintals kommandon. UI:t (eller huvudagenten) fungerar som en "Router Skill" som vägleder användaren till rätt underliggande färdighet, så att människan bara behöver interagera med en enda startpunkt.
