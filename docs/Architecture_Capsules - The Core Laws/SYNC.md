# ARCHITECTURE_CAPSULE_SYNC
## Ouroboros 2.0: Federerad Agentsynk, OCC & Write-Ahead Logging

**Dokumentstatus:** Aktiv Arkitekturritning  
**Miljö:** Live-First (WebSockets), Federerat Agentnätverk (Root Repo), Asynkron JSON-messaging  
**Syfte:** Fastställa det tekniska ramverket för att lösa Split-Brain, hantera skrivkrockar i delade miljöer, och införa en 100 % feltolerant Write-Ahead Log (WAL) för millisekundexakt session-resumption.

---

## 1. Probleminventering: "Split-Brain" i ett Federerat Nätverk

När Ouroboros övergår från en ensam agent till ett federerat "Root Repo" där flera agents (Workers) och människor arbetar mot samma Google Drive-filsystem parallellt, uppstår det klassiska distribuerade systemproblemet: **Write-Write Conflicts (Split-Brain)**.

1. Agent A läser `app.ts` för att fixa en bugg.
2. Under tiden Agent A utvärderar koden (kognitiv loop tar 10 sekunder) ändrar en människa manuellt i `app.ts` på Google Drive.
3. Agent A skickar sin ovetande skrivning till Drive och **skriver över** människans arbete.

Lösningen är **Optimistic Concurrency Control (OCC)**, implementerad direkt i `driveService.ts`.

---

## 2. Optimistic Locking via Google Drive ETags

Google Drive-API:et har inbyggt stöd för `ETag` (Entity Tag) / Revision IDs. Ett ETag är en sträng som representerar den exakta versionen av en fil vid en specifik tidpunkt.

### 2.1 Implementering i `driveService.ts`
För att skydda data måste vi tillämpa strikt etag-validering vid varje mutationsbegäran (`PATCH` eller `PUT`):

1. **Vid Read (`GET`):** Ouroboros hämtar filen från Drive och sparar det associerade `etag`-värdet i det lokala IndexedDB-cachen tillsammans med filinnehållet.
2. **Vid Update (`PATCH`):** När agenten vill spara koden, tvingar `driveService.ts` fram skickandet av HTTP-headern `If-Match: "<ETAG_VALUE>"`.

**Typ-specifikation för `driveService.ts`:**

```typescript
interface DriveFileContext {
  fileId: string;
  content: string;
  etag: string; // Kritisk för OCC
}

async function updateFileOptimistic(fileId: string, newContent: string, currentEtag: string) {
  const response = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'If-Match': currentEtag, // Optimerat lås
      'Content-Type': 'text/plain'
    },
    body: newContent
  });

  if (response.status === 412) {
    throw new Error('PRECONDITION_FAILED'); // Krock upptäckt!
  }
  
  return await response.json(); // Returnerar nytt etag
}
```

---

## 3. Transaktionsfel & "Kognitiv Rebase" (412 Precondition Failed)

Om `updateFileOptimistic` returnerar `412 Precondition Failed` betyder det att filen modifierats av någon annan sedan agenten senast läste den. Här får systemet absolut inte krascha, och agenten får inte radera sin logik. Den måste utföra en asynkron **Wake-Up Sync**.

### Flödesschema för Wake-Up Sync (Rebase)

1. **412 Precondition Failed triggas:** `driveService.ts` fångar felet och avbryter nätverksanropet. Inget data korrumperas på Drive.
2. **System Interrupt:** Agentens aktiva WebSocket-loop meddelas via ett asynkront event (`SYNC_COLLISION`).
3. **Fetch New Truth:** Agenten tvingas ladda ner den absolut senaste versionen av filen från Google Drive och dess nya ETag.
4. **Kognitiv Rebase:** 
   - Agentens systemprompt tilldelas en "Diff-Kapsel" som visar skillnaden mellan agentens egen version och molnets version.
   - Ouroboros bedömer (Eval-Driven) om dess ursprungliga plan fortfarande är giltig:
     - *Scenario A (Ingen konflikt):* Människan lade bara till en kommentar. Agenten regenererar sin uppdatering (patchar sin kod på den nya) och försöker igen med det nya ETaget.
     - *Scenario B (Direkt konflikt):* Människan skrev om exakt den funktion agenten jobbade på. Agenten kastar sin skrivning, skapar en WAL-logg (om avbrytande) och frågar användaren via chatten hur de ska gå vidare.

---

## 4. Händelsestyrd Write-Ahead Log (WAL) i IndexedDB

För att Ouroboros ska kunna agera i flyktiga miljöer (WASM, E2B) med stenhårda tidsgränser måste varje tanke och skrivning kunna frysas ner och återupptas omedelbart. "WAL" är den atomiska logg som gör session resumption möjlig på millisekunden.

### 4.1 Livscykeln för en atomisk WAL-händelse

Istället för att mutera state direkt (Direct Mutation), läggs en avsikt in i WAL:en *innan* nätverksanropet går till Drive.

1. **Action Intent:** Agenten beslutar sig för att uppdatera `style.css`.
2. **Append to WAL:** Webbläsaren sparar omedelbart ett JSON-event i `IndexedDB` (betydligt stabilare och större än LocalStorage).
3. **Flush (Execution):** Systemet utför uppdateringen mot Google Drive (med OCC).
4. **Commit:** Om Drive accepterar (status 200), markeras händelsen i WAL:en som `flushed`.

### 4.2 Specifikation: WAL Event JSON Schema

```json
{
  "eventId": "evt_948a72b1-11x2-43fa...",
  "timestamp": "2026-05-30T19:42:10.500Z",
  "type": "FILE_MUTATION",
  "payload": {
    "fileId": "1aB2cD3eF4gH5iJ6kL7mN8oP9",
    "path": "/frontend/style.css",
    "diff": "@@ -15,4 +15,5 @@\\n body {\\n   margin: 0;\\n+  background: #000;\\n }",
    "expectedEtag": "\"v1_xyz\""
  },
  "status": "pending_flush" 
}
```

### 4.3 Crash Recovery (Återuppvaknandet)

Om strömmen går, webbläsaren kraschar, eller E2B-containern får en timeout (efter 1 timme), är data aldrig förlorat:

1. När användaren öppnar Ouroboros igen och bootar upp Root Repo.
2. Systemet läser av `IndexedDB` och letar efter alla events där `status === 'pending_flush'`.
3. Systemet utför en **Replay** av dessa loggar. Den kollar varje ETag mot Google Drive och flushar framåt i tiden tills state är 100 % synkat.
4. Först därefter öppnas WebSocket-anslutningen till Gemini och agenten startas med en absolut oförorenad, millisekundexakt uppfattning av verkligheten.

---

## 5. Resilience Architecture (Backoff, Jitter & Retry Buckets)

I vår händelsestyrda WebSocket-miljö måste exekveringsmotorn kunna hantera transienta nätverksfel, `HTTP 500 Backend Errors` samt `HTTP 429 Too Many Requests` utan att överbelasta Google Workspace eller Nylas API-infrastruktur.

1. **Capped Exponential Backoff med Jitter:** Om ett anrop misslyckas, beräknas nästa väntetid exponentiellt men med ett stenhårt maxtak (Capped). För att förhindra **Thundering Herd-problemet** adderas **Jitter** (en slumpmässig tidsvariation).
2. **Local Token Bucket för Retries:** För att förhindra att en felande agent går in i en evig omförsöksloop, implementeras en lokal Token Bucket för omförsök.
3. **Single-Level Retry Rule:** Omförsök (Retries) får **endast** exekveras på en enda nivå i arkitekturen (React-klientens exekveringshärva).

---

## 6. Klientdriven Congestion Control (ATB & AATB)

1. **Adaptive Token Bucket (ATB):** Varje Worker-agent kör en intern klientsides-algoritm. Vid lyckade API-anrop ökar agenten sin token-genereringshastighet. Vid `HTTP 429` halveras hastigheten omedelbart.
2. **Assisted Adaptive Token Bucket (AATB):** I det federerade nätverket delar agenterna asynkront med sig av sin telemetri gällande förbrukade kvoter över WebSocket-bussen.
3. **Dataminimering via Partial Responses:** Varje `GET`-anrop i `driveService.ts` tvingas använda URL-parametern `fields`.
