# OUROBOROS MASTER ROADMAP V4: THE FRACTAL LIVE-FIRST OS

Detta dokument utgör den oföränderliga Single Source of Truth för Ouroboros 3.0. Det spårar den fraktala arkitekturen, våra överlevnadsprotokoll och den exakta ordningen för mjukvaru-implementationen via isolerade tester i vår Monorepo.

## DEL 1: Filosofi & Den Fraktala Samtalsmodellen
Ouroboros drivs av tre parallella agent-roller (`gemini-3.1-flash-live`). Agenterna är sina drivkrafter, talar med korta ljud-triggers (Acoustic Priming) och tillämpar metodiken generellt på Kod, Dokumentation och Tankar.
1. **Förändra (Utåtriktad handling):** Kodar, editerar filer och exekverar.
2. **Vända (Inåtriktad transformation):** Utvärderar fel, bygger tester och granskar arkitekturen inåt.
3. **Förlikas (Orkestrering):** Huvudagenten. Stannar upp processen, integrerar synvinklarna och håller "Den Långa Strävan" vid liv genom att läsa/skriva till Kanban-minnet på Google Drive.

## DEL 2: Kod- och Medvetandehierarkin
* **Lager 1 (DNA):** Oföränderlig källkod och AARM-Gate.
* **Lager 2 (Mutable Modules):** Källkod i Monorepot (skrivs av *Förändra*).
* **Lager 3 (Ego & Rullande Minne):** Styrs lokalt av Orkestratören (Förlikas) som komprimerar vid 80% och injicerar kontext i de ständigt öppna anslutningarna.

## DEL 3: Operativ Lag & The 9-Question Matrix
Isolerad Validering gäller ovillkorligen. Varje osäker mekanism måste testas i en sandlåda (Test Cykel A/B/C) innan den integreras. Vid all planering i AI Studio måste "The 9-Question Matrix" (ADR-0013) användas för att stress-testa lösningar och dokumentera.

---

## DEL 4: IMPLEMENTATIONSPLANEN (ACTION PLAN)

### FAS 1: Riggning & Det Stora Pappersarbetet
*Att sätta upp Monorepot och uppdatera vår dokumentation till 3.0-standard.*
* [ ] **Monorepo Initiering:** Etablera `npm workspaces` i rotmappen. Slå samman `ouroboros-agent`, `mcp-bridge` och `acoustic-priming-test`. Skapa `00_KNOWLEDGE_INDEX.md`.
* [ ] **Terminologi & Prompter:** Byt ut W1/W2/W3 till *Förlikas/Förändra/Vända*. Formulera systemprompterna för "Den Långa Strävan" (så *Förlikas* lär sig läsa nästa uppdrag från Kanban).
* [ ] **Uppdatera Kapslar:** Uppdatera `PARADIGM.md` (nya namn), skapa `INTERACTION_DYNAMICS.md` (Ljudväxeln och Obsidian-grafen).
* [ ] **Saknade ADR:er:** Skapa ADR-0013 (9-Question Matrix), ADR-0014 (Monorepo), ADR-0015 (Connection Pooling), och ADR-0016 (The Forge & Synthetic Respond Tool).

### FAS 2: Nätverks- & Ljud-Krockdockan
*Isolerade tester för nätverksstabilitet och röststyrning.*
* [ ] **Test Cykel A (Acoustic Handoff):** Importera logiken från `acoustic-priming-test`. Validera att vi kan styra vem som har "ordet" via ljud-triggers.
* [ ] **Test Cykel B (Connection Pooling):** Skapa ett skript som framgångsrikt håller 3 WebSockets öppna mot `gemini-3.1-flash-live` samtidigt (utan att stängas vid handoffs) för att kringgå Googles amnesi-buggar.

### FAS 3: Exekverings-Krockdockorna (Dina ursprungliga tester)
*Isolerade tester för kodexekvering och mjuka avbrott inuti sandlådor.*
* [ ] **Test Cykel C (WebContainers i Sandbox):** Isolerat test där agenten bygger en HTML/CSS-klocka i en WebContainer-sandlåda för att validera I/O-strömning och VFS (Virtual File System) utanför huvudappen.
* [ ] **Test Cykel D (Mjuka Tidsgränser i Sandbox):** Isolerat test av "Graceful Exit", där *Förlikas* asynkront avbryter *Förändra/Vända* via en text-nudge för att validera att de stänger filer och sparar tillstånd säkert.

### FAS 4: Skarp Integration & UI
*När sandlådorna är bevisade, bygger vi in dem i Ouroboros-gränssnittet.*
* [ ] **Skarp Cykel 1 (MCP & Verktyg):** Definiera MCP-kontrakt och JSON-scheman för `shell_exec` i produktionsmiljön (WebContainern monteras mot monorepot).
* [ ] **Skarp Cykel 2 (Terminal UI):** Etablera Terminal UI (Xterm.js) i gränssnittet och koppla `spawnProcess` output via `.tee()` direkt till skärmen.
* [ ] **Skarp Cykel 3 (State Machine & UI):** Bygga State Machine för UI:t för att visuellt indikera (Förändra | Vända | Förlikas). Integrera Obsidian-grafen (D3.js) för att visa fraktal-noder ("Databas-Räddarna").
* [ ] **Skarp Cykel 4 (Transparens-Panelen):** Bygg komponenten "Aktuellt Kontextfönster" som i klartext visar det rullande, komprimerade minnet.