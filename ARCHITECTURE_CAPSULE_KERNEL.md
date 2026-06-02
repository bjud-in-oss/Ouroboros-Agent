# ARCHITECTURE_CAPSULE_KERNEL.md
> **Kategori:** Workspace Kernel, WebContainers, WASM & Virtuell I/O-synkronisering
> **Källor (Forskningsrapporter):** "Workspace Kernel Integration: React, WebContainers, and Synced I/O" (NotebookLM 2026) samt Meta-Orkestreringschatten.
> **Genereringsprompt:** *"Skapa en fullständig teknisk källkodsspecifikation för hur den inbäddade Linux-miljön bootas säkert via WebContainers, hur det virtuella filsystemet synkroniseras mot vår IndexedDB WAL utan att skapa oändliga loopar, samt hur strömmande I/O och terminaler hanteras."*

## 0. Executive Summary (Analys)
Denna arkitekturkapsel definierar källkodsspecifikationen för Ouroboros inbäddade exekveringsmotor (Workspace Kernel). Systemet använder StackBlitz WebContainers för att köra en fullständig, isolerad Node.js- och Linux-liknande miljö direkt i webbläsarens RAM via WebAssembly (WASM). Kapseln löser kritiska utmaningar kring webbläsarisolering (Cross-Origin Isolation), livscykelhantering (React StrictMode-singletonskydd), samt prestandaoptimering av fil-I/O genom att introducera en transaktionell låsmekanism som förhindrar oändliga dataloopar mellan IndexedDB Write-Ahead Log (WAL) och det virtuella filsystemet (VFS). Slutligen etableras strategin för "Graceful Escalation" till molnbaserade sandlådor vid hantering av tunga native C/C++-tillägg.

## 0.1 Begrepp och Ordlista
* **WebContainer:** En WebAssembly-baserad mikrokärna som gör det möjligt att köra Node.js och CLI-verktyg lokalt inuti en webbläsarflik.
* **Cross-Origin Isolation:** Ett webbläsarsäkerhetsläge som krävs för att låsa upp SharedArrayBuffer. Kräver specifika HTTP-huvuden (COOP och COEP) från servern.
* **SharedArrayBuffer (SAB):** Det underliggande delade minnessegment som tillåter parallella trådar och synkron kommunikation inuti WASM-kärnan.
* **VFS (Virtual File System):** Det minnesbaserade POSIX-liknande filsystem som körs isolerat inuti WebContainern.
* **Transactional Sync Bridge:** Vår synkroniseringsbrygga som använder tillfälliga sökvägslås (`activeLocks`) för att bryta ekon och oändliga loopar mellan IndexedDB och VFS.
* **Backpressure (Mottryck):** En strömningskontrollmekanism där systemet övervakar buffertstorleken (`desiredSize`) och pausar inskrivning av ny indata till processens `stdin` tills konsumenten är redo, vilket förhindrar webbläsarkrascher.
* **Graceful Escalation:** Principen att systemet som standard körs i den lokala och kostnadseffektiva WASM-kärnan, men sömlöst eskalerar till en molnbaserad sandlåda (t.ex. Docker/E2B) via användargodkännande om agenten kräver exekvering av binära C++-tillägg eller komplex Python-kod som saknar WASM-stöd.

---

## 1. Sektion 1: Boot-sekvens, Livscykel & Cross-Origin Isolation

### 1.1 Tekniska förutsättningar för Cross-Origin Isolation
För att webbläsarmotorn ska tillåta exekvering av de SharedArrayBuffers som utgör minnesbussen för parallella trådar i WebAssembly, måste React-applikationen befinna sig i ett Cross-Origin Isolated tillstånd. Värdservern som levererar frontend-applikationen måste tvingas att skicka med följande HTTP-svarshuvuden (även vid HTTP-status 304 Not Modified från cachen):
```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Om applikationen bäddas in i iframes måste attributet allow="cross-origin-isolated" explicit deklareras på iframe-elementet.

1.2 Singleton Bootloader & React Livscykelsskydd
Metoden WebContainer.boot() får under inga omständigheter anropas parallellt eller flera gånger under applikationens livstid, då detta kastar fatala proxyfel (Proxy has been released and is not usable).
Inni en React-kontext, där StrictMode monterar och avmonterar komponenter dubbelt under utveckling, isoleras initieringen bakom en global, asynkron singleton-barriär:

TypeScript
import { WebContainer } from '@webcontainer/api';

let globalKernelPromise: Promise<WebContainer> | null = null;
let activeKernelInstance: WebContainer | null = null;

export async function getWorkspaceKernel(): Promise<WebContainer> {
  if (activeKernelInstance) return activeKernelInstance;
  
  if (!globalKernelPromise) {
    globalKernelPromise = WebContainer.boot().then((instance) => {
      activeKernelInstance = instance;
      return instance;
    }).catch((error) => {
      globalKernelPromise = null;
      throw error;
    });
  }
  return globalKernelPromise;
}
När applikationen stängs eller en arbetsyta demonteras, måste activeKernelInstance.teardown() anropas via en useEffect-cleanup för att frigöra minne och stänga pågående processer kontrollerat.

2. Sektion 2: Transaktionell VFS-Synkronisering & Loopförhindrande
2.1 Bidirektionellt flöde och ekhon
WebContainern lagrar filer i sitt lokala, minnesbaserade virtuella filsystem (VFS). För att uppnå total persistens måste förändringar synkroniseras i två riktningar:

Från lokala IndexedDB WAL till VFS: När vår lokala WALManager registrerar en godkänd (ALLOW) mutation, måste den skrivas till WebContainerns VFS via fs.writeFile.

Från VFS till lokala IndexedDB WAL: När en process inuti WebContainern (t.ex. npm run build eller ett skript) skapar eller ändrar en fil, fångas detta upp av en filbevakare via fs.watch.

Detta skapar en omedelbar risk för en oändlig synk-loop (Data Looping): en skrivning från WAL till VFS triggar en händelse i fs.watch, som i sin ur tolkar det som en extern ändring och försöker skriva tillbaka den till WAL.

2.2 Den Transaktionella Transiteringsspärren
För att bryta ekhon tillämpas en tillfällig låstabell (activeLocks). Varje gång applikationen avsiktligt skriver från WAL till VFS registreras filens sökväg i låstabellen. fs.watch-lyssnaren kontrollerar tabellen i realtid och kastar bort händelsen om sökvägen är låst, vilket bryter loopen tidigt i cykeln.

TypeScript
class TransactionalSyncBridge {
  private activeLocks = new Set<string>();

  async writeFromWALToVFS(path: string, content: string, kernel: WebContainer) {
    this.activeLocks.add(path);
    try {
      await kernel.fs.writeFile(path, content);
    } finally {
      // Ett kort asynkront tidsfönster tillåts så att fs.watch-eventet hinner avfyras och ignoreras
      setTimeout(() => {
        this.activeLocks.delete(path);
      }, 50);
    }
  }

  registerVFSWatcher(kernel: WebContainer, onExternalChange: (path: string, content: string) => void) {
    kernel.fs.watch('/', { recursive: true }, async (event, filename) => {
      if (!filename) return;
      if (this.activeLocks.has(filename)) return; // Ignorera interna ekon
      
      try {
        const content = await kernel.fs.readFile(filename, 'utf-8');
        onExternalChange(filename, content);
      } catch (err) {
        // Hantera radering eller läsfel
      }
    });
  }
}
3. Sektion 3: I/O Strömning, Terminalmultiplexering & Backpressure
3.1 Multiplexering av utdata via .tee()
När en process startas i kärnan via kernel.spawn(), slås standard utdata (stdout) och standard felutdata (stderr) samman på kernel-nivå till en gemensam ström (process.output) för att garantera perfekt kronologisk ordning av loggarna. Denna ReadableStream<string> dupliceras i realtid med Streams API-metoden .tee() till två oberoende, identiska strömmar:

Terminalströmmen: Strömmar direkt till gränssnittets terminalkomponent (Xterm.js). Terminalen konfigureras med convertEol: true för att automatiskt mappa \n till \r\n för att undvika trasig layout.

WebSocket-strömmen: Strömmar till vår liveOrchestrator.ts som packar datablocken som JSON-meddelanden (type: 'PROCESS_OUTPUT') och skickar till Gemini-modellen i realtid, vilket tillåter omedelbar felanalys.

3.2 Respekterande av Backpressure (Mottryck)
När agenten skriver indata till processens standard in-ström (process.input via en WritableStream), måste exekveringshärvan respektera nätverkets och trådarnas mottryck. Innan en ny Uint8Array skrivs via getWriter(), måste systemet kontrollera desiredSize och uttryckligen vänta på att löftet writer.ready upplöses. Att skriva till en full kö utan att vänta leder till minnesläckor och frysningar i webbläsartråden.

4. Sektion 4: Körtidsbegränsningar & Policy för "Graceful Escalation"
4.1 Tekniska begränsningar i WASM-kärnan
WebContainers exekveras med flaggan --no-addons. Det innebär att systemet inte stödjer binära, lokalt kompilerade npm-paket (C/C++ tillägg utan JavaScript-fallbacks) samt avancerade Python-bibliotek (miljön är begränsad till ren vanilla Python via en WASI-port och saknar stöd för pip).

4.2 Eskalationsprotokoll (WASM-to-Cloud)
För att garantera ett flexibelt men kostnadseffektivt system tillämpar Ouroboros en trestegs eskalationspolicy vid resursbegränsningar:

WASM som standard: Alla filmutationer och Node-körningar startar lokalt i webbläsarens WebContainer.

Detektering av kapacitetsbrist: Om ett verktygsanrop eller en uppgift explicit kräver binära tillägg eller komplexa Python-paket (t.ex. dataanalys via Pandas/NumPy), identifierar AARM detta i valideringsfasen.

Människa-i-loopen Eskalering (Context-Dependent Defer): AARM fryser anropet, skickar en REVIEW_REQUIRED-signal till gränssnittet och presenterar ett "Generative UI"-kort på skärmen: "Denna operation kräver native C++ eller externa Python-paket. Vill du eskalera exekveringen till en molnbaserad Docker-sandlåda (E2B)?". Om användaren klickar på Proceed skiftar exekveringsmiljön kontext till en tillfällig molnsandlåda, medan samtalets röst- och textström flyter oavbrutet i bakgrunden.

5. Sektion 5: Referenser & Källor
Developer StackBlitz: WebContainers Browser Support, Singleton Proxy Constraints & Native Addon Limits.

MDN Web Docs: Streams API, WritableStreamDefaultWriter, TextEncoder, and backpressure controls (desiredSize).

MDN Web Docs: File System API and Origin Private File System (OPFS) Synchronous Handles (FileSystemSyncAccessHandle).

Ambientia Engineering & Workato Hub: Preventing Infinite Synchronization Loops using Transaction Attribution and in-flight locks.