# ARCHITECTURE_CAPSULE_SYNC.md

> **Kategori:** Transaktionssäkerhet, OCC, WAL & Kognitiv Rebase

> **Miljö:** Ouroboros Agent OS (3x gemini-3.1-flash-live, IndexedDB, Google Drive)

> **Syfte:** Definiera det stenhårda dataskyddet som eliminerar "Split-Brain"-scenarier och oavsiktliga överskrivningar. Kapseln dikterar hur W3 (Barnmorskan) säkert skriver till Google Drive, hur systemet hanterar datakrockar genom Kognitiv Rebase, och hur Write-Ahead Log (WAL) garanterar millisekundexakt kraschåterhämtning .

## 0. Executive Summary (Analys)

När tre parallella arbetare (W1, W2, W3) agerar i realtid krävs ett ofelbart skyddsnät för den skarpa koden (Lager 2 och 3). Denna kapsel definierar systemets synkroniseringslager. Istället för att pessimistiskt låsa filer – vilket skulle döda den samtidiga, naturliga friktionen – använder systemet Optimistic Concurrency Control (OCC) . Endast W3 har skrivrättigheter till produktion (Cykel 4), och varje handling loggas atomärt i en lokal Write-Ahead Log (IndexedDB) innan den skickas till molnet . Om en krock uppstår kraschar inte applikationen, utan genomgår en *Kognitiv Rebase* där systemet förlikas med den nya verkligheten .

## 0.1 Begrepp och Ordlista

* **OCC (Optimistic Concurrency Control):** Ett låsfritt system mot Google Drive. Varje filversion får en unik stämpel (E-Tag). W3:s skrivningar avvisas (`HTTP 412`) om filen har hunnit ändras i bakgrunden .

* **Kognitiv Rebase (Wake-Up Sync):** Systemets andliga och tekniska läkningsprocess vid en datakrock. Istället för att tvinga igenom sin vilja, pausar systemet, laddar ner den nya sanningen, och utvärderar hur (och om) den egna lösningen ska fogas samman med verkligheten .

* **WAL (Write-Ahead Log):** Händelsestyrd logg i webbläsarens IndexedDB . Koden markeras `PENDING` innan nätverksanropet görs, och `FLUSHED` när Google Drive bekräftat .

* **The Phoenix Protocol:** Systemets förmåga till självåterhämtning . Om en Live-anslutning dör ("The Dead Socket Trap"), återskapas sessionen med hjälp av WAL utan att agenterna drabbas av amnesi .

## 1. Optimistic Concurrency Control (ETags) och W3:s Skrivrättighet

Eftersom W1 och W2 utforskar framåt och bakåt i sina isolerade sandlådor (Cykel 1–3), är det uteslutande W3 som muterar Google Drive (produktionsmiljön) under Cykel 4. 

* För att garantera att W3 inte oavsiktligt skriver över människans arbete, bifogas alltid HTTP `If-Match`-headers med den senast kända E-Tagen när W3 begär en sparning . 

* Detta innebär att den naturliga friktionen får verka ostört inuti systemet, medan Google Drive fungerar som den ultimata, objektiva sanningen.

## 2. Hantering av Datakrockar (Kognitiv Rebase)

Om W3 försöker spara en förlikad lösning, men Google Drive returnerar `412 Precondition Failed` (någon har ändrat koden externt):

* **System Interrupt:** Skrivningen avbryts omedelbart och markeras som misslyckad i systemets WAL. Ingen data korrumperas .

* **Den Naturliga Friktionens Återkomst:** Istället för en hård krasch startar en "Wake-Up Sync". W3 hämtar omedelbart den nya filen (den nya sanningen) .

* **Kognitiv Rebase:** W1 och W2 kallas tillbaka från sina sandlådor för att granska den nya koden. Om de kan foga samman sin tidigare integrerade lösning med den nya sanningen, görs det (likt en `git rebase`). Är det en djup, strukturell krock stannar systemet upp (Att förlikas) och skickar en asynkron Nudge till användaren för att be om mänsklig vägledning .

## 3. Write-Ahead Log (WAL) och The Phoenix Protocol

Googles Live API-anslutningar (WebSockets) kan dö på grund av inaktivitet ("The Dead Socket Trap") eller nätverksförlust . Ouroboros överlever detta genom sin WAL i IndexedDB .

* **Logga Först (PENDING):** Så fort W1 och W2 godkänner W3:s kod (Veto Protocol), läggs händelsen (ex. `WRITE_FILE`) i IndexedDB med statusen `PENDING` .

* **Materialisering:** Skrivningen skickas till Drive.

* **Bekräftelse (FLUSHED):** Vid `HTTP 200 OK` uppdateras loggen atomärt till `FLUSHED` .

* **Phoenix Protocol (Återuppståndelsen):** Om systemet kraschar innan `FLUSHED` uppnås, kommer systemet vid nästa uppstart att läsa av `PENDING`-händelserna. W1, W2 och W3 återuppstår då (Session Resumption) på exakt samma millisekund, laddar in sina bevarade tankesignaturer, och slutför det avbrutna arbetet som om inget hade hänt .

Med denna kapsel på plats har vi nu en fulländad arkitektur bestående av fyra centrala fundament:

PARADIGM.md (De tre arbetarna, Fraktalerna och Teologin)

MCP.md (Sandlådorna och Barnmorskan W3)

ASYNC_DELEGATION.md (Mjuka tidsgränser och Nervsystemet)

SYNC.md (WAL, ETags och Kognitiv Rebase)