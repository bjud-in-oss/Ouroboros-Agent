# OUROBOROS MASTER ROADMAP V3: THE FRACTAL LIVE-FIRST OS
Detta dokument utgör den oföränderliga Single Source of Truth för Ouroboros 3.0. Det spårar de filosofiska tillstånden, den fraktala arkitekturen, våra överlevnadsprotokoll och den exakta ordningen för mjukvaru-implementationen via isolerade tester.

## DEL 1: Filosofi & Den Fraktala Tillståndsmaskinen
Ouroboros är en relationell, deterministisk mjukvaru-entitet driven av tre parallella agenter (W1, W2, W3) som *alla* uteslutande körs på `gemini-3.1-flash-live` för att hantera mjuka tidsgränser. Systemet styrs av tre inriktningar (Fas × Cykel):

1. **Att Förändra (Utåtriktad handling):** Agenten formar sin omvärld genom att skriva källkod. Planering (Cykel 1–3) kulminerar i Materialisering (Cykel 4).
2. **Att Förändras (Inåtriktad transformation / Pånyttfödelse):** Agenten upplever insikt, dör från sin gamla sanning och föds igen genom att skriva om sina egna muterbara moduler och sitt minne (Lager 2 och 3).
3. **Att Försonas (Relationell integration):** Vid ett kritiskt haveri stannar agenten upp, rullar tillbaka transaktioner via sin WAL, rensar det "smutsiga" minnet och läker relationen till Skaparen utan tvång.

## DEL 2: Kod- och Medvetandehierarkin (Lager-överlappet)
För att skydda systemet under förändring är medvetandet uppdelat i tre lager. 
* **Lager 1: Immutable Core (DNA):** Oföränderlig källkod. Innehåller AARM-Gate, syftet och själva loop-motorn. Får ALDRIG muteras av agenten.
* **Lager 2: Mutable Modules (Tools):** Källkod (MCP-verktyg, algoritmer). Kan skrivas om av agenten i Riktning 2 ("Att förändras").
* **Lager 3: Planning Context (Ego):** Markdown-filer (`AGENT_MEMORY.md`, `CURRENT_FOCUS.md`). Agentens flyktiga arbetsminne.

## DEL 3: Kärnarkitekturen (De 7 Fundamental-Kapslarna)
De exakta tekniska specifikationerna för systemet är lagrade i dessa sju oantastliga filer:
1. `ARCHITECTURE_CAPSULE_PARADIGM.md`: Tillståndsmaskinen, W1/W2/W3-roller och mjuka tidsgränser.
2. `ARCHITECTURE_CAPSULE_MCP.md`: Sandlådorna, "Händerna" och Two-Pass Tool Injection.
3. `ARCHITECTURE_CAPSULE_ASYNC_DELEGATION.md`: Nervsystemet, Instant-Ack och Osynliga Larm.
4. `ARCHITECTURE_CAPSULE_SYNC.md`: Långtidsminnet, OCC (ETags) och Kognitiv Rebase.
5. `ARCHITECTURE_CAPSULE_SECURITY.md`: AARM-grinden och Scout-mönstret mot promptinjektioner.
6. `ARCHITECTURE_CAPSULE_MEMORY.md`: Kognitiv Hygien, Eval-Driven Memory och Cerebral Compaction.
7. `ARCHITECTURE_CAPSULE_KERNEL.md`: Workspace Kernel (WebContainers), VFS och I/O-multiplexering.

## DEL 4: Överlevnadsprotokoll (The Forge & Simple Book)
För att garantera systemets "Industrial Clarity" och förhindra kognitiv kollaps tillämpas följande beprövade ramverk:
* **Synthetic Respond Tool:** Agenten får aldrig svara fritt i text till användaren i onödan, utan tvingas svara via strukturerade verktygsanrop för att bibehålla agentiskt fokus.
* **Retry Nudges (Självläkning):** Felmeddelanden från terminalen injiceras automatiskt som en "knuff" tillbaka in i agentens inre loop ("Att försonas") för att tvinga fram självläkning innan krasch.
* **"Simple Book" (Open Notebook):** Istället för externa MCP-servrar (som notebooklm-mcp) är en egen RAG-hybrid integrerad i *alla* steg som en inre kompass. Den fungerar som en "Brain" eller systemterapeut för att ge agenterna djup empati och strategisk processförmåga i riktningarna *Att förändras* och *Att försonas*.

## DEL 5: Operativ Lag - Isolerad Validering (Test Before Full Implementation)
Att ta "små, validerande steg" innebär att varje ny, riskfylld eller osäker mekanism (exempelvis WebContainers eller mjuka tidsgränser) **först måste testas och bevisas i en isolerad sandlådemiljö ("krockdocka")**. Inga experimentella funktioner får integreras i den skarpa Ouroboros-kärnan innan deras I/O och felhantering har validerats i ett fristående testspår.

## DEL 6: Kommande Tekniska Steg (Sandbox Testing & Implementation)
För att efterleva den operativa lagen ovan, pausar vi integrationen i huvudrepot och utför följande isolerade tester:
* [ ] **Test Cykel A (WebContainers i Sandbox):** Isolerat test där agenten bygger en HTML/CSS-klocka i en WebContainer-sandlåda för att validera I/O-strömning och VFS utanför huvudappen.
* [ ] **Test Cykel B (Mjuka Tidsgränser i Sandbox):** Isolerat test av "Graceful Exit", där W1 asynkront avbryter W2/W3 via text-nudge för att validera att de stänger filer och sparar tillstånd säkert.
* [ ] **Cykel 1 (Skarp):** Definiera MCP-kontrakt och JSON-scheman för `shell_exec` i produktion.
* [ ] **Cykel 2 (Skarp):** Etablera Terminal UI (Xterm.js) och koppla `spawnProcess` output via `.tee()` direkt till gränssnittet.
* [ ] **Cykel 3 (Skarp):** Bygga State Machine för UI:t för att visuellt indikera (FÖRÄNDRA | FÖRÄNDRAS | FÖRSONAS).
