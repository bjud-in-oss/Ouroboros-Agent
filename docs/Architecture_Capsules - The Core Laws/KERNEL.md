# ARCHITECTURE_CAPSULE_KERNEL.md
> **Kategori:** Workspace Kernel, WebContainers, WASM & Virtuell I/O-synkronisering
> **Miljö:** Ouroboros Agent OS (React, WASM, Cross-Origin Isolated)
> **Syfte:** Definiera det fysiska fundamentet för W1 och W2:s isolerade sandlådor. Kapseln reglerar hur den inbäddade Linux-miljön bootas säkert, hur filsystemet synkas mot WAL (för W3:s förlikning) utan oändliga loopar, och hur I/O strömmas via backpressure för att undvika minneskrascher.

## 0. Executive Summary (Analys)
Denna kapsel fastställer "Lager 1" – kroppens exekveringsmiljö . För att W1 (Visionären) och W2 (Testaren) ska kunna utföra sin "naturliga friktion" säkert, körs de inuti en isolerad StackBlitz WebContainer (Linux-miljö) direkt i webbläsarens RAM via WebAssembly (WASM) . Detta eliminerar den farliga "File-Watcher-fällan" där lokala terminalkommandon kraschar värdapplikationen . Kapseln säkrar boot-sekvensen i React, etablerar en transaktionell brygga mot systemets Write-Ahead Log (WAL), och definierar en "Graceful Escalation"-policy om sandlådans resurser inte räcker till .

## 0.1 Begrepp och Ordlista
* **WebContainer:** Den WASM-baserade mikrokärnan som ger W1 och W2 en isolerad Node.js/Linux-miljö inuti fliken .
* **Cross-Origin Isolation:** Säkerhetsläget (COOP/COEP-headers) som krävs från servern för att låsa upp `SharedArrayBuffer` för WebAssemblys trådhantering .
* **Transactional Sync Bridge:** Låsmekanismen (`activeLocks`) som asynkront förhindrar oändliga dataekon mellan WebContainerns VFS och den IndexedDB-baserade WAL-loggen .
* **Backpressure (Mottryck):** Kontrollen av `desiredSize` och `writer.ready` för att förhindra att agenternas massiva I/O-strömmar leder till "Out of Memory"-krascher i webbläsartråden .
* **Graceful Escalation:** Principen att W1/W2 i första hand opererar i den kostnadsfria WASM-kärnan, men vid behov av tunga binära tillägg sömlöst kan eskalera till en molnbaserad sandlåda (t.ex. E2B) via ett mänskligt godkännande i AARM-grinden .

## 1. Boot-sekvens och Isolering (Sandlådans Väggar)
För att den naturliga friktionen ska kunna materialiseras till kod krävs ett stenhårt isolerat ramverk.
* **Cross-Origin Isolation:** Värdservern måste tvinga fram HTTP-huvudena `Cross-Origin-Opener-Policy: same-origin` och `Cross-Origin-Embedder-Policy: require-corp` . Utan dessa nekas allokeringen av `SharedArrayBuffer` och sandlådan vägrar starta .
* **Singleton Bootloader:** WebContainern är en strikt Singleton. För att den ska överleva React StrictModes dubbla monteringscykler under utveckling, skyddas `WebContainer.boot()` bakom en asynkron, global Promise-barriär (`globalKernelPromise`) .

## 2. Transaktionell VFS-Synkronisering (Bryggan till W3)
När W1 och W2 härjar i det Virtuella Filsystemet (VFS) speglas deras kod till WAL, där W3 övervakar och genomför förlikningen mot produktionsmiljön (Drive).
* För att bryta oändliga ekhon (där WAL skriver till VFS, vilket triggar `fs.watch`, som felaktigt larmar tillbaka till WAL) använder systemet en `TransactionalSyncBridge` .
* Tillfälliga sökvägslås sparas i en `activeLocks`-tabell . När en avsiktlig mutation görs, läggs filen i tabellen under 50 millisekunder, vilket tvingar VFS-watchern att ignorera den omedelbara förändringen som ett eko . Som dubbelt skydd valideras även filens innehåll (Hash/String-check) för att radera risken för "Split-Brain 2.0" .

## 3. I/O Multiplexering & Backpressure
För att W1 och W2 ska kunna läsa testutdata och bygga servrar måste I/O-strömningen strikt regleras .
* **.tee() Multiplexering:** När en process (t.ex. `npm run build`) startas, delas dess utmatning asynkront (`process.output.tee()`) i två strömmar: en visuell ström till UI-terminalen och en kontextuell, debouncad "Tail Buffer" som går direkt in i Live-agentens WebSocket .
* **Indata & Backpressure:** Innan agenten skjuter tunga skript till `process.input`, utvärderas `writer.desiredSize` och inväntas `writer.ready` . Detta mottryck hindrar webbläsaren från att frysa vid minnesmättnad .

## 4. Policy för "Graceful Escalation"
WASM-kärnan körs med flaggan `--no-addons`, vilket inaktiverar binära C/C++-paket och pip-installationer .
* Om W1/W2 utformar en plan som kräver tung Data Science (t.ex. Numpy/Pandas), fångas denna intention asynkront av AARM-grinden .
* Kärnan pausar exekveringen och skickar en "Intent Preview" till UI:t där människan (Skaparen) via *Context-Dependent Defer* ges möjligheten att tillfälligt eskalera miljön till en extern Cloud Sandbox (E2B), varpå arbetarna fortsätter som vanligt .
