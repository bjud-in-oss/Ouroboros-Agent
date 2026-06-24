MEMORANDUM TILL SÄKERHETSKONTROLLANTER (AARM & SYSTEM AUDITORS)
Kategori: Evidensbaserad Verifiering & Arkitektoniska Avväganden Gällande Arkitektur: Ouroboros 3.0 (Live-First, Agent Triad, WebContainers) Syfte: Ouroboros 3.0 frångår medvetet flera traditionella säkerhetskonventioner till förmån för deterministisk klientsäkerhet och asynkron kognition
. För att validera systemets säkerhet ska granskaren inte flagga dessa avvikelser som fel, förutsatt att nedanstående beviskrav (Evidens) kan verifieras i källkoden och systemlogiken.
Vid granskning, sök efter följande ersättande skyddsmekanismer för att släcka standardvarningar:
1. Avsaknad av hårda iterationsgränser ("Fail-Fast")
Avvikelse: Systemet saknar statiska loop-tak (t.ex. "max 3 försök") för agenter.
Evidens för godkännande: Granskaren måste verifiera att Mjuka Tidsgränser (Soft Deadlines) tillämpas
. Verifiera att orkestratören (W1) asynkront skickar meta-instruktioner via text (t.ex. "Tiden är knapp, avrunda snyggt")
. Verifiera även att agenterna styrs mot att göra en graceful exit och spara sitt tillstånd asynkront via IndexedDB WAL istället för att tvångsavslutas
.
2. Svag prompt-baserad säkerhet mot Promptinjektioner
Avvikelse: Systemet förlitar sig inte på LLM-systemprompter ("Du får inte radera filer") som säkerhetsgräns
.
Evidens för godkännande: Granskaren måste verifiera två fysiska mjukvarugrindar:
AARM-grinden: Verifiera att aarmGate.ts fångar varje MCP-verktygsanrop innan diskåtkomst och evaluerar det deterministiskt mot ett digitalt signerat Mission Manifesto
. Vid regelbrott ska koden returnera ett DENY- eller DEFER-event med en "Execution Trace" in i WebSocket-strömmen för att trigga självläkning
.
Scout-mönstret: Verifiera att Huvudagenten aldrig läser okänd extern data direkt
. En skrivskyddad "Scout"-agent måste användas för att tvätta rådatan och spara den som strukturerad JSON i isolerade Inbox Capsules, som Huvudagenten därefter läser
.
3. Avsaknad av heltäckande "Human-in-the-loop" på all I/O
Avvikelse: Filer och kod kan ändras autonomt utan mänskligt godkännande för varje specifik rad
.
Evidens för godkännande: Granskaren måste verifiera att den riskbaserade AARM-motorn är korrekt kalibrerad:
Oskadliga handlingar ska confinera sig till isolerade WebContainers (WASM)
.
Destruktiva eller globala anrop (t.ex. DELETE_FILE) ska bevisligen parkeras i en kö av AARM
.
Granskaren måste se att dessa handlingar renderas som en Intent Preview (CIBA/Generative UI) där människan explicit kan välja Proceed, Cancel eller Edit innan exekvering tillåts
.
4. Användning av Gemini Live API för tysta bakgrundsarbetare (W2/W3)
Avvikelse: gemini-3.1-flash-live används för asynkrona kodningsarbetare istället för REST-API:et, vilket normalt kraschar utan ljud
.
Evidens för godkännande: Granskaren måste säkerställa att anslutningarna överlever "Modality Lock"
. Verifiera att automaticActivityDetection är satt till disabled: true för W2/W3
. Bekräfta att "Acoustic Priming" (Push-to-Talk) används vid sessionens start för att legitimera strömmen, följt av att agenten enbart processar rena text-payloads via send_realtime_input
.
5. Fejkade funktionssvar vid asynkrona anrop ("Instant-Ack")
Avvikelse: Orkestratören svarar omedelbart QUEUED på tunga verktygsanrop för att inte frysa ljudströmmen
.
Evidens för godkännande: Granskaren måste verifiera att Kognitiv Amnesi förhindras
. Verifiera att QUEUED-svaret alltid följs upp av en System Intercept (via send_realtime_input) när det verkliga bakgrundsjobbet är klart
. Detta asynkrona svar måste innehålla en Rationale_Log (Cerebral Sync) så att Live-agenten får veta varför bakgrundsarbetaren fattade sina kodbeslut och kan behålla sin kontextuella förståelse
. Dessutom måste den ursprungliga thought_signature bevaras obrutet i verktygssvaret
.
6. Saknade JSON-scheman för verktyg vid uppstart
Avvikelse: Massiva verktygsscheman är inte inladdade i kontexten från början, vilket ser ut som ofullständig initiering.
Evidens för godkännande: Granskaren måste bekräfta implementationen av Two-Pass Tool Injection (Lazy Loading)
. Vid start (Pass 1) ska endast en kort katalog av verktygens namn och kategorier finnas för att spara tokens
. Granskaren måste verifiera logiken som dynamiskt injicerar det fulla JSON-schemat (Pass 2) via WebSocketen först när agenten skickar en request_schema-intention
.
7. Avsaknad av Pessimistisk Fillåsning på Google Drive
Avvikelse: Multi-agent-systemet har ingen pessimistisk fillåsning mot databasen, vilket normalt skapar "Split-Brain" och datakorruption
.
Evidens för godkännande: Granskaren måste verifiera tre sammanlänkade mekanismer:
Optimistic Concurrency Control (OCC): Verifiera att alla PATCH/PUT-anrop till Drive skickar HTTP If-Match-headers innehållande ETags (Revision IDs)
.
Write-Ahead Log (WAL): Verifiera att varje mutation sparas med status PENDING i en lokal IndexedDB innan moln-anropet sker
.
Kognitiv Rebase: Verifiera att systemet fångar HTTP 412 Precondition Failed och initierar en Wake-Up Sync, där agenten asynkront laddar ner den nya sanningen och fogar samman ("mergar") sina egna ändringar med verkligheten innan den försöker igen
.
