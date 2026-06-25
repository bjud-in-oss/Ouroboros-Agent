# ARCHITECTURE_CAPSULE_ASYNC_DELEGATION.md
> **Kategori:** Nervsystemet, Connection Pooling & Den Akustiska Tidslinjen
> **Miljö:** Ouroboros Agent OS (3x gemini-3.1-flash-live, WebSocket-buss)
> **Syfte:** Att definiera hur orkestratören hanterar nätverkets asynkrona tidslinje, förhindrar att Live-anslutningarna fryser vid tunga verktygsanrop, och hur mick-routing och text-injektioner styrs utan att tappa den naturliga friktionen.

## 0. Executive Summary (Analys)
Eftersom Ouroboros uteslutande drivs av `gemini-3.1-flash-live`, uppstår ett nätverksmässigt hinder: 3.1 Live-modellen tillåter inte asynkrona (`NON_BLOCKING`) verktygsanrop i sitt protokoll. Om *Förändra* kör ett terminalkommando (`shell_exec`) som tar 30 sekunder inuti WebContainern, fryser hela dess WebSocket-ström synkront. 

Denna kapsel löser tidsparadoxen genom "The Asynchronous Ticket Loop" (Instant-Ack) kombinerat med en fast **Connection Pool**. Vi förbjuder formellt dynamisk stängning och "parking" av fysiska sockets (vilket bevisats radera modellens minne pga. serverbuggar). Istället hålls exakt 3 anslutningar permanent öppna (en för *Förlikas*, en för *Förändra*, en för *Vända*). Synkron blockering kringgås genom att orkestratören omedelbart returnerar ett fejk-kvitto (`QUEUED`), vilket håller röstströmmen aktiv medan exekveringen sker asynkront i bakgrunden.

## 0.1 Begrepp och Ordlista
* **Connection Pooling:** Arkitekturen där tre fasta WebSocket-kablar hålls öppna kontinuerligt mot Live API:et för att förhindra HTTP 429-fel och eliminera den minnesförlust som uppstår vid nätverks-återanslutningar.
* **The Asynchronous Ticket Loop (Instant-Ack):** Ett omedelbart JSON-svar (`{"status": "QUEUED"}`) från orkestratören till agenten som ögonblickligen låser upp Live-strömmen medan WebContainerns kärna arbetar i bakgrunden.
* **The Acoustic Handoff Protocol:** Systemet för röststyrning och turordning mellan agenterna i connection poolen. Istället för en kaotisk gruppchatt är endast en mikrofon öppen som default (enligt Kanban-kön). Överlämningar sker via korta ljudsignaler och verbala triggers.
* **Acoustic Priming:** Korta, taktiska ljud-triggers (t.ex. ett ping eller en kort ljudsignal) som agenter använder för att väcka varandras uppmärksamhet och indikera rollbyten i UI:t utan att slösa tokens på att läsa upp råkod högt.
* **System Intercept (Technical Nudge):** Asynkrona textinjektioner via `send_realtime_input` formaterade som systemmeddelanden (t.ex. `[SYSTEM_NOTIFICATION]`). Används av *Förlikas* för att skjuta in felrapporter, bakgrundsresultat eller lokalt städade minnesbaslinjer i de öppna kablarna.

## 1. The Asynchronous Ticket Loop (Att hantera tiden)
För att den samtidiga, naturliga friktionen mellan *Förändra* (Vision/Handling) och *Vända* (Sorg/Felsökning) ska fungera i sina respektive sandlådor, måste de kunna arbeta parallellt utan att blockera nätverket.

När en arbetare anropar `shell_exec`:
1. **Intercept:** Orkestratören i vår React-app fångar verktygsanropet innan det skickas till WebContainern.
2. **Instant-Ack:** Orkestratören returnerar omedelbart `FunctionResponse: { status: "QUEUED", directive: "Vänta på bakgrundsjobbet. Gissa inget resultat." }`.
3. **Upplåsning:** Agenten accepterar biljetten och förblir helt vaken, lyhörd och reaktiv i sin ström.
4. **Asynkron Injektion:** När bakgrundsjobbet i WebContainern är klart, fångar orkestratören upp dess exit-kod och slutrader. Detta injiceras asynkront som en text-nudge via `send_realtime_input` direkt in i agentens feed: `[SYSTEM_NOTIFICATION: Bakgrundsjobb slutfört. Exit 0. Resultat: ...]`.

## 2. Akustisk Handoff & Mikrofon-Routing
Eftersom tre öppna mikrofoner och högtalare samtidigt skulle orsaka total ljudkollaps och barge-in-kaos, styrs hårdvaran strikt via vår applikationslogik:
* **Default-läget (En i taget):** Du pratar som standard alltid med *Förlikas* (Roten). *Förändra* och *Vända* har sina mikrofoner låsta via `automaticActivityDetection: false`.
* **Inbjudan och Rum:** När ett kodproblem kräver deras expertis, meddelar *Förlikas* detta verbalt och lämnar över ordet. Orkestratören mutear *Förlikas* mikrofon och öppnar röstkanalen för *Förändra* och *Vända*.
* **Filler Messages ("Um"):** För att maskera den nätverkslatens som uppstår när mickar routas om och förhindra att användaren avbryter i fel ögonblick, spelar UI:t upp korta, naturliga tänkljud ("Um", "Låt mig kontrollera filen..."). 
* **Tjuvlyssna i Maskinrummet:** Du hör och pratar alltid med den undergrupp eller roll som har stafettpinnen enligt Kanban-planeringen. Men du kan i din Obsidian-trädvy manuellt klicka dig in i en bakgrundsnod och välja att koppla in ditt headset för att lyssna på *Förändra* och *Vända*:s korta, militäriska akustiska triggers ("Kod exekverad", "Kör input") under felsökning.

## 3. Det Fraktala Trädet och Dynamiska Egon
När systemet grenar ut sig i fraktalen startas inga nya fysiska WebSockets (vilket skulle spränga Free Tier-taket på max 3 sessioner). Istället återanvänds de tre fasta kablarna i vår connection pool genom **Dynamiska Egon**:
* Om *Förändra* behöver starta en inre debatt för ett isolerat underproblem, antar den rollen som orkestratör (*Förlikas*-funktionen) för den specifika undernoden.
* Undergruppen får ett dynamiskt, mänskligt uppdragsnamn (t.ex. "Regex-Kirurgerna") som ritas ut som en ny nod i D3.js Obsidian-grafen.
* Orkestratören skickar en hård text-uppdatering via `send_realtime_input` som formaterar om underarbetarnas DNA och injicerar deras hyper-specialiserade mikrouppdrag lokalt. Underarbetarna är helt stumma för omvärlden och kommunicerar internt i ren text via tysta JSON-verktyg, vilket eliminerar "viskleken" och sparar tokens.
* När undergruppen nått konsensus, skickas text-syntesen uppåt i trädet till huvud-Triaden, och *Förlikas* slår på din primära mikrofon igen för att rapportera det färdiga resultatet i Cockpiten.