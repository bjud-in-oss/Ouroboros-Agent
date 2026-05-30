# ARCHITECTURE_CAPSULE_SECURITY.md
## Ouroboros 2.0: Event-Driven Ouroboros via WebSockets & AARM

**Dokumentstatus:** Aktiv Arkitekturritning  
**Kategori:** AARM, Verktygssäkerhet & Skydd mot Promptinjektioner
**Miljö:** Ouroboros "Live-First" (WebSocket / Event-Driven) 
**Kärnfokus:** Kognitiv säkerhet, Token-ekonomi och Skydd mot Prompt-injektioner

## 0. Executive Summary (Analys)
Detta dokument etablerar den deterministiska mjukvarugrinden för Ouroboros. I en WebSocket-arkitektur kan en LLM generera destruktiva verktygsanrop på millisekunder. Denna kapsel flyttar säkerhetsgränsen från bräckliga prompt-instruktioner till det fysiska exekveringslagret (React-appen). Kapseln löser även "Tool Bloat" (token-blödning från massiva JSON-scheman) och förhindrar att agenten drabbas av dolda kodinjektioner (Forced Descent) när den läser extern data.

## 0.1 Begrepp och Ordlista
* **AARM (Autonomous Action Runtime Management):** En stenhård middleware (grindvakt) i React-koden som fångar och utvärderar AI:ns verktygsanrop mot ett regelverk *innan* de tillåts nå filsystemet.
* **Mission Manifesto:** Ett digitalt signerat dokument som definierar agentens exakta befogenheter för den aktuella sessionen. Används av AARM för att neka handlingar vid "Intent Drift".
* **Two-Pass Tool Injection (Lazy Loading):** Strategin att först bara skicka verktygens *namn* över WebSocketen (Pass 1). Det tunga, token-dyra JSON-schemat injiceras (Pass 2) först när agenten explicit uttrycker att den behöver verktyget.
* **Scout Pattern & Inbox Capsules:** Att använda en svagare, skrivskyddad bakgrundsagent (Scout) för att läsa osäkra webbsidor/filer. Scouten tvättar bort skadliga instruktioner och lägger ren metadata i en "Inbox Capsule", som huvudagenten sedan säkert kan läsa.

---

## 1. Systemöversikt: Event-Driven Ouroboros via WebSockets
Ouroboros-arkitekturen har övergått från ett passivt REST-API till en "Live-First" händelsedriven modell via strömmande WebSockets. I denna miljö flödar ljud, text och JSON-meddelanden asynkront och kontinuerligt mellan React-ryggmärgen och Gemini. Verktygshantering sker nu via standarden Model Context Protocol (MCP).

Eftersom agenten nu bearbetar kontext och fattar beslut i realtid, förskjuts säkerhetsgränsen. Säkerhet kan inte längre garanteras av statiska systemprompter, då dessa snabbt kan "komprimeras bort" eller ignoreras när kontextfönstret fylls ("Context Window Compaction"). För att skydda den autonoma agenten mot bl.a. oavsiktlig minneskorruption, "Indirect Prompt Injections" och okontrollerade verktygsanrop, bygger denna arkitekturkapsel på tre stenhårda principer: Lazy Tool Loading, AARM i React-miljön och Scout-mönstret för säker inmatning.

---

## 2. "Two-Pass Tool Injection" & Lazy Tool Loading över WebSocket
Att injicera massiva JSON-scheman för alla tänkbara verktyg i början av en session skapar en omedelbar kognitiv överbelastning (Tool Bloat) och mättar kontextfönstret i onödan. För att förhindra detta anpassar vi Ouroboros "Context Capsules"-filosofi (där kunskap laddas in dynamiskt) till verktygshanteringen via Model Context Protocol (MCP).

### Implementering (The Two-Pass Protocol):
Istället för att servera hela verktygsbiblioteket över WebSocket-strömmen vid initiering, implementeras en tvåstegsraket:

*   **Pass 1 (Discovery & Capability Routing):** React-klienten (MCP Host) publicerar enbart ett "metaregister" (Capabilities Directory) till agenten över WebSocket-strömmen. Detta register innehåller endast korta beskrivningar av *kategorier* av verktyg (t.ex. `File_Operations`, `GitHub_Mutations`, `Data_Analysis`).
*   **Pass 2 (Lazy Loading / Just-In-Time Injection):** När agentens resonemangsström (Chain-of-Thought) indikerar en specifik intention (t.ex. "Jag behöver läsa loggfilen"), skickar den ett asynkront begäran-event (`request_schema(File_Operations)`). React-klienten lyssnar på detta event och strömmar in det exakta och kompletta JSON-schemat för enbart de verktygen (t.ex. `readFile`, `createFile`) direkt i agentens kontextfönster, precis när de behövs.

**Säkerhetsfördel:** Agenten kan aldrig anropa ett destruktivt verktyg i panik eller under påverkan av en tidig injektion, eftersom de tunga verktygens exakta anropssignaturer inte ens existerar i dess aktiva minne förrän de avsiktligt har begärts in.

## 2.1 Dynamisk Upptäckt via MCP-Zero och WebAssembly (WASM)

För att möjliggöra ett federerat nätverk där agenten hittar okända community-verktyg i farten, måste Pass 1 och Pass 2 kompletteras med dynamisk sökning och isolering.

1. **RAG-MCP & MCP-Zero Routing:** Istället för statisk injicering, indexeras alla tillgängliga MCP-verktygsfunktioner lokalt i en vektordatabas. När språkmodellen upptäcker en förmågebrist i sin "Chain-of-Thought", skickar den en strukturerad `request_schema`-intention. Ett "Hierarkiskt Vektorrouting"-steg (MCP-Zero) matchar asynkront intentionen mot verktygsindexet och injicerar endast relevant schema. Detta ökar Hit Raten för verktygsval från ~15% till över 90% (enligt A2X Progressive Disclosure-mätningar).
2. **WebAssembly (WASM) Sandlådor:** Dynamiskt laddade "Community Skills" får aldrig exekveras i värdsystemet. Alla dynamiska verktyg laddas i WebAssembly (WASM)-miljöer (likt ramverket IronClaw). WASM-sandlådan erbjuder en strikt "Capabilitetsbaserad" behörighetsmodell där verktyget saknar tillgång till miljövariabler eller nätverk som standard. API-nycklar lagras i ett AES-256-GCM krypterat valv och injiceras enbart vid nätverksgränsen.

---

## 3. AARM (Autonomous Action Runtime Management) i React
I en strömmande WebSocket-arkitektur kan en LLM-baserad agent generera skadliga eller felaktiga verktygsanrop på millisekunder. Enligt AARM-specifikationen utgör AI-modellen *inte* en säkerhetsgräns, utan säkerhetsgränsen måste ligga på applikationsnivån vid handlingens utförande (Action Layer). Därför källkodas AARM som en stenhård mjukvarugrind ("interceptor") i React.

### Implementering:
AARM byggs som en middleware-lyssnare på WebSocket-strömmen som fångar varje `:::TOOL_REQUEST:::` eller motsvarande MCP-anrop *innan* den skickas till `driveService` eller operativsystemet. 

**1. Cryptographic Intent Anchoring (Mission Manifesto):**
Innan sessionen startar definieras och signeras ett "Mission Manifesto" (en digitalt krypterad kontextkapsel som beskriver det strikta slutmålet och säkerhetsbegränsningarna). Detta manifest läses in i AARM-motorn och fungerar som den ultimata sanningen.

**2. AARM:s Valideringsgrind (Intercept & Evaluate):**
När React-klienten tar emot ett asynkront verktygsanrop över strömmen, fryses anropet tillfälligt. AARM-funktionen utvärderar handlingen (`a`) och den ackumulerade sessionkontexten (`C`) och klassificerar anropet deterministiskt enligt AARM:s ramverk:
*   **Forbidden Actions (Deterministiskt Avslag):** Hårdkodade regler (ex. `DELETE` på rotkataloger, ändringar utanför `.Ouroboros`-mappen). Om anropet matchar detta returneras `DENY` över strömmen oavsett kontext.
*   **Context-Dependent Deny:** AARM utvärderar anropet mot "Mission Manifesto". Även om verktyget (t.ex. `createFile`) är tillåtet, utvärderas parametrarna. Om agenten har "Intent Drift" och försöker skriva exfiltrerad data eller byta fokus från manifestets ursprungliga syfte, blockeras den omedelbart ("Context-Dependent Deny").
*   **Context-Dependent Defer (Självläkning):** Om anropet är otydligt eller saknar tillräcklig kontext, skickar AARM tillbaka ett `DEFER`-event ("Action Suspended") i strömmen. Detta tvingar modellen att omvärdera sin intention och förse AARM med tydligare resonemang innan åtgärden släpps igenom.

**3. Tamper-Evident Receipts:**
För varje utvärderat verktygsanrop loggar React-appen ett kvitto som innehåller intentionen, beslutet (`ALLOW`, `DENY`, `DEFER`) och tidsstämpeln, vilket skapar ett immutabelt spår för felsökning.

---

## 4. Scout-mönstret & Inbox Capsules för Asynkron Sanering
Eftersom Ouroboros strömmar in extern data från webben och ljudtranskriptioner är risken för "Indirect Prompt Injection" enorm, där dolda instruktioner i rådata kapar agentens primära mål. Detta hanteras arkitektoniskt genom att frikoppla observation från kognition ("Scout Pattern").

### Implementering:
Vi etablerar en asynkron bakgrundstjänst – **Scouten** – som är totalt skrivskyddad utåt och körs i en isolerad miljö (sandbox). 

1.  **Asynkron Avlyssning:** När systemet tar emot en transkription, ett externt dokument eller ett webbsvar, går det inte direkt till huvudagentens WebSocket-ström. Istället skickas det till Scout-tjänsten.
2.  **Sanering & Metadatastrukturering:** Scouten är en svagare, snabb modell (ex. Gemini Flash-Lite) utan verktygsprivilegier ("Execution Privileges"). Scouten läser den osäkra rådatan, tvättar bort okända format/exekverbara strängar och extraherar enbart ren, strukturerad JSON-metadata (exempelvis: "Sammanfattning av loggen: fel på rad 42").
3.  **Inbox Capsules:** Scouten dumpar därefter denna strukturerade och ofarliga metadata i isolerade "Inbox Capsules" på Google Drive.
4.  **Huvudagentens Konsumtion:** Den tunga huvudagenten (Ouroboros Core) ligger skyddad bakom AARM. Den lyssnar enbart på säkra event från Inboxen. Genom att huvudagenten läser en strikt indexerad *sammanfattning* (Inbox Capsule) istället för ostrukturerad rådata elimineras möjligheten för en angripare att lura huvudagenten att bryta sig ur sin "Mission Manifesto".

Denna separation bevarar huvudagentens kognitiva skärpa och säkerställer att skadliga instruktioner som gömts i transkriptionen förblir harmlös text inuti ett buffert-dokument.

---

## 5. Agentic UX och Människa-i-Loopen (AARM)

Eftersom systemet drivs via en full-duplex WebSocket-anslutning där ljud och text strömmar i realtid (Live-First), får AARM:s säkerhetsavbrott aldrig frysa eller blockera den aktiva röstströmmen. Ett godkännandeförfarande (Human-in-the-Loop) implementeras via asynkrona "Generative UI" (GenUI)-mönster.

### 5.1 "Chat+" / Co-Creator Workspace Pattern
* Konversationen (röst/text) flödar oavbrutet i en primär kanal.
* När AARM identifierar ett destruktivt verktygsanrop (ex. `DELETE_FILE`), parkeras handlingen i en `[Pending Queue]` (AARM-härvan).
* En **"Intent Preview"** genereras på en sekundär canvasyta. Istället för råa JSON-parametrar visas den blockerade handlingen på naturligt språk med tre asynkrona val: `Proceed`, `Cancel` eller `Edit`. Agenten fortsätter tala oavbrutet medan kortet väntar.

### 5.2 CIBA (Client-Initiated Backchannel Authentication)
För agenter som körs i bakgrunden (när användaren inte har en aktiv flik öppen) nyttjas OAuth 2.0-utökningen **CIBA (RFC 9126)** via "Ping Mode". Agenten skickar en push-notis till användarens mobil/sekundära enhet. Agenten pollar inte i onödan, utan väntar asynkront på godkännande innan `WAL`-händelsen flushas.

### 5.3 Text-Audio Alignment (Virtual Playhead)
Om användaren avbryter agenten muntligt (barge-in) under en pågående exekvering, fäster systemet tidsstämplade markörer i WebRTC-strömmen. AARM och den kognitiva loopen vet exakt vilket ord användaren hann höra, vilket gör att agenten kan svara kontextuellt utan repetition.
