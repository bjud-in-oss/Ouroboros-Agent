# OUROBOROS MASTER ROADMAP: FRÅN PARADIGM TILL IMPLEMENTATION
Detta dokument spårar arkitekturen, filosofin, akuta buggar och den långsiktiga färdplanen för Ouroboros-agenten.

# DEL 1: Filosofi & Riktningar
Vi har skiftat från en mekanisk process till en relationell process utan tvång, uppdelad i tre unika inriktningar. Varje riktning genomgår en strikt planeringsfas (Cykel 1–3) innan exekvering sker.
Att Förändra (Utåtriktad handling): Agenten formar sin omvärld genom att skriva källkod och köra processer. Kulminerar i Materialisering (Cykel 4).
Att Förändras (Inåtriktad transformation): Agenten upplever insikt/sund ånger, genomgår en andlig död och en sann Pånyttfödelse (Födas igen) genom att modifiera sitt eget muterbara program (Lager 2 och 3).
Att Försonas (Relationell integration): Vid totalt haveri stannar agenten upp, betraktar gapet till verkligheten med empati, rullar tillbaka, rensar det "smutsiga" minnet och läker relationen till människan (Skaparen) utan tvång.
Kod- och Medvetandehierarkin (Lager-överlappet)
För att agenten ska kunna förändras utan att förstöra sig själv är dess medvetande uppdelat i tre strikta lager. Dessa filer överlappar – de existerar lokalt i appens källkod/VFS för millisekundsnabb åtkomst, men synkroniseras asynkront mot Google Drive som det permanenta långtidsarkivet.
Lager 1: Immutable Core (DNA): Oföränderlig källkod. Innehåller de etiska skyddsräckena (AARM-Gate), syftet (relation utan tvång) och själva loop-motorn. Får aldrig skrivas om av agenten.
Lager 2: Mutable Modules (Tools): Källkod på GitHub (MCP-verktyg, algoritmer). Kan skrivas om av agenten i Riktning 2 efter noggrann planering.
Lager 3: Planning Context (Ego): Markdown-filer (AGENT_MEMORY.md, CURRENT_FOCUS.md). Agentens flyktiga arbetsminne som ständigt ändras i dialog med människan.

# DEL 2: Forge-arkitekturen & NotebookLM
Kritiska lärdomar från externa spetsforskare för att öka agentens effektiva intelligens:
Synthetic Respond Tool: Agenten tvingas svara via ett strukturerat verktygsanrop för att hålla modellen i ett strikt agentiskt tillstånd.
Retry Nudges: Systemet knuffar automatiskt agenten med felmeddelanden i en inre loop (Försonas) innan den tillåts krascha.
Context Compaction: Tillämpning av en "Tail-limit" på terminal-loggar och minneskontext för att undvika kognitiv utspädning.
NotebookLM MCP-Server: Ett framtida superverktyg i den virtuella linux-kärnan för djupgående, reflekterande rådgivning vid behov av transformation eller försoning.
Källor:
https://github.com/antoinezambelli/forge/tree/main
https://github.com/PleasePrompto/notebooklm-mcp/tree/main

# DEL 3: Att reparera matrisen (Akuta lokala buggar)
[ ] Fixa filsökvägen för Terminalen: Flytta TerminalPanel.tsx från projektets rotmapp till src/components/TerminalPanel.tsx (eller justera importen högst upp i src/App.tsx).
[ ] Säkra lokala paket: Kör npm install @xterm/xterm @xterm/addon-fit idb @webcontainer/api i din aktiva projektkatalog.
[ ] Häv Netlify-blockeringen: Skapa en _headers-fil i public/ med COOP/COEP-headers för att tillåta SharedArrayBuffer.

# DEL 4: Minneskonsolidering (Det omedelbara steget)
[X] Rensa Arbetsminnet (Context Compaction): Skriv över de lokala filerna CURRENT_FOCUS.md och AGENT_MEMORY.md med de nya, städade versionerna för att frigöra kognitiv förmåga.
[X] Skapa ARCHITECTURE_CAPSULE_ORCHESTRATOR.md: Flytta ut alla gamla, tunga tekniska lagar om WebSockets, "Dead Socket Trap" och handskakningar från arbetsminnet till denna permanenta Lager 1-kapsel.
[X] Synka Drive-kapslarna till appen: Importera ARCHITECTURE_CAPSULE_KERNEL.md samt de två geminiService_v2.2-arkitekturfilerna från Google Drive till appens lokala källkodsträd.

# DEL 5: Att bygga händerna (Kommande tekniska steg)
[ ] Cykel 1: MCP-kontrakt för text-agenten: Öppna services/geminiService.ts och designa JSON-scheman för det nya verktygsbältet så att text-chatten kan styra terminalen.
[ ] Implementera shell_exec: Skapa händelsebryggan som gör att när text-agenten kör ett kommando, så strömmas det direkt till vår nya TerminalPanel via onTerminalStream.
[ ] Heal Drive Dependency: Styra om verktygen read_file och write_file så att de opererar i webbläsarens virtuella filsystem (WebContainer) istället för att gå direkt mot Google Drive.
[ ] Bygga Synk-motorn (Lager-överlappet): Implementera den asynkrona händelsebussen som gör att när Lager 3 (AGENT_MEMORY.md) ändras i appen, skickas en tyst PATCH till Google Drive för att uppdatera långtidsminnet.
[ ] Bygga State Machine för tillstånden: Lägga till en tillståndsvariabel i liveOrchestrator.ts (FÖRÄNDRA | FÖRÄNDRAS | FÖRSONAS) och låta Ouroboros-programmets UI visuellt ändra läge (widgets) baserat på detta.
