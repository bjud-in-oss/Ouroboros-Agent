# ARCHITECTURE_CAPSULE_ASYNC_DELEGATION.md
> **Kategori:** Nervsystemet, Asynkron Delegering & Den Kognitiva Tidslinjen
> **Miljö:** Ouroboros Agent OS (3x gemini-3.1-flash-live, WebSocket-buss)
> **Syfte:** Att definiera hur orkestratören hanterar nätverkets asynkrona tidslinje, förhindrar att Live-anslutningarna fryser vid tunga verktygsanrop, och hur kontext och tidsgränser injiceras dynamiskt för att bibehålla den naturliga friktionen.

## 0. Executive Summary (Analys)
Eftersom Ouroboros uteslutande drivs av `gemini-3.1-flash-live` , uppstår ett arkitektoniskt hinder: 3.1-modellen tillåter inte asynkrona (`NON_BLOCKING`) verktygsanrop nätverksmässigt. Om W1, W2 eller W3 kör ett terminalkommando som tar 30 sekunder, fryser deras WebSocket helt . 

Denna kapsel löser tidsparadoxen genom "The Asynchronous Ticket Loop" (Instant-Ack). Orkestratören fångar anropet, returnerar ett omedelbart kvitto (`QUEUED`) för att låsa upp agenten, och utför arbetet i bakgrunden . Resultat, kraschlarm och mjuka tidsgränser injiceras därefter tillbaka in i den öppna strömmen via `send_realtime_input` , vilket gör systemet blixtsnabbt och djupt reaktivt.

## 0.1 Begrepp och Ordlista
* **The Asynchronous Ticket Loop (Instant-Ack):** Ett fejk-kvitto (`{"status": "QUEUED"}`) som skickas från Orkestratören till agenten så att agentens ström omedelbart låses upp medan WebContainern arbetar.
* **System Intercept (Technical Nudge):** Asynkrona textinjektioner via `send_realtime_input` formaterade som systemmeddelanden (t.ex. `[SYSTEM_OVERRIDE_CRITICAL]`). Används för att förmedla fel, resultat eller signalera mjuka tidsgränser .
* **Lazy-Loaded Rationale (Cerebral Sync):** För att undvika minnesmättnad dumpas aldrig massiv källkod direkt i Live-strömmen. Istället sparas koden på VFS, medan endast en kort `Rationale_Log` (motiveringen till *varför* koden skrevs) injiceras i agentens minne.
* **Agent Parking (Session Resumption):** Att spara en agents kognitiva tillstånd och stänga dess WebSocket-kabel för att frigöra en av systemets tre hårdvarulinjer vid fraktal utgrening .

## 1. The Asynchronous Ticket Loop (Att hantera tiden)
För att den samtidiga, naturliga friktionen mellan W1 (Vision) och W2 (Sorg/Test) ska fungera i sina sandlådor, måste de kunna arbeta parallellt utan att fastna i varandras nätverksköer.

När en arbetare anropar `shell_exec`:
1. **Intercept:** Orkestratören fångar anropet innan det går till WebContainern.
2. **Instant-Ack:** Orkestratören returnerar omedelbart `FunctionResponse: { status: "QUEUED", job_id: "...", directive: "Vänta på bakgrundsjobbet. Gissa inget resultat." }`.
3. **Upplåsning:** Agenten accepterar biljetten och förblir vaken/reaktiv i sin pågående loop.

## 2. Technical Nudges och Mjuka Tidsgränser (Soft Deadlines)
Eftersom `clientContent` är spärrat från att användas mitt i pågående 3.1-sessioner , måste orkestratören kommunicera med agenterna via det asynkrona kommandot `send_realtime_input({text: "..."})` .

* **Leverans av resultat:** När sandlådan är klar skjuts `Rationale_Log` in i strömmen via en Nudge: `[SYSTEM_NOTIFICATION] Bakgrundsjobb 123 klart. RATIONALE: Valde port 8080 pga krock.` .
* **Larm och Krascher:** Om ett byggskript kraschar skjuter orkestratören in ett larm som triggar modellens inbyggda *barge-in*, vilket får agenten att direkt byta fokus till felsökning .
* **Mjuka Tidsgränser:** W1 (Barnmorskan/Samordnaren) skickar löpande tidsmedvetenhet via Nudges: *"Ni har 45 sekunder kvar att iterera"*. Detta skapar en mjuk deadline som tvingar den fraktala loopen att avrunda organiskt istället för att stängas av brutalt .

## 3. Fraktal Utgrening och Agent Parking (Session Resumption)
Systemet är hårdvarubegränsat till exakt tre (3) samtidiga Live API-anslutningar. Ouroboros 3.0 tillämpar fraktal exekvering.

* Om W2 (Att vända) inser att den behöver starta en djupgående diagnostikprocess som kräver asynkron tid, och inga kablar är lediga, tillämpas **Agent Parking** .
* Orkestratören sparar W2:s `SessionResumptionUpdate`-handle och stänger W2:s WebSocket tillfälligt .
* Den frigjorda kabeln används för att spinna upp diagnostik-processen .
* När underprocessen är klar, väcks W2 genom att anslutningen återupptas (`Resume`) med dess Handle . En *Wake-Up Sync* skjuts in via en Nudge för att synkronisera agenten med den nya sanningen som underprocessen tagit fram.
