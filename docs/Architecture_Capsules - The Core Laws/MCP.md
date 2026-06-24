# ARCHITECTURE_CAPSULE_MCP.md

> **Kategori:** Händerna, Isolerade Sandlådor, VFS & Mjuka Tidsgränser

> **Miljö:** Ouroboros Agent OS (WebContainers & Live API)

> **Syfte:** Definiera hur agenternas verktyg (MCP) interagerar med den fysiska miljön genom isolerade sandlådor, hur W3 agerar barnmorska vid skarp kodning, samt hur Veto-protokollet och WAL säkerställer oförstörbar kvalitet genom naturlig friktion.

## 0. Executive Summary (Analys)

Denna kapsel dikterar hur systemet rent fysiskt påverkar sin miljö. Istället för att de tre parallella arbetarna (W1, W2, W3) slåss om samma filsystem, introduceras strikt **sandlåde-isolering**. W1 och W2 använder Model Context Protocol (MCP) inuti isolerade virtuella Linux-miljöer (WebContainers) för att riskfritt experimentera och utvärdera. 

Ur den **samtidiga, naturliga friktionen** mellan W1:s vision och W2:s tester i sandlådorna föds underlaget för systemets transformation. W3 agerar barnmorska och är den enda som har skrivrättigheter till den skarpa produktionsmiljön (Google Drive via WAL) under Cykel 4. Hela processen skyddas av Veto-protokollet och mjuka tidsgränser för att säkerställa den heliga grundlagen "Document BEFORE Implementation" .

## 0.1 Begrepp och Ordlista

* **Sandlåde-Isolering:** Separation av exekveringsmiljöer. W1 och W2 opererar i egna WebContainers, medan W3 hanterar systemets skarpa Write-Ahead Log.

* **WAL (Write-Ahead Log):** Händelsestyrd säkerhetslogg i IndexedDB. Kodändringar från W3 sparas som `PENDING` och flushas atomärt till Drive först när de är förlikade och godkända.

* **The Veto Protocol (Mandatory Dissent):** Den kodifierade, naturliga friktionen. W1 och W2:s skyldighet att granska W3:s `PENDING`-kod utifrån sina respektive riktningar innan den godkänns . Vid underkännande (Veto) blockeras flushningen.

* **Mjuka Tidsgränser (Soft Deadlines):** Istället för fasta loop-tak skickar orkestratören dynamiska tidsbudgetar (t.ex. "Avrunda snyggt, tiden är knapp") för att tvinga fram en organisk exit och returnera resultat i tid.

## 1. Arbetsfördelning och Isolerade Sandlådor

För att låta den naturliga friktionen verka fritt utan att orsaka kraschar eller "Split-Brain"-scenarier på Google Drive, har arbetarna helt separata fysiska befogenheter när de anropar verktyg (`shell_exec`, VFS-operationer):

* **W1 (Vision / Förståelse Framåt):** Arbetar i **Sandlåda A**. W1 drar i visionen, bygger "kladdkod" och skissar testbyggen helt utan risk för att störa produktionen.

* **W2 (Död & Sorg / Förståelse Bakåt):** Arbetar i **Sandlåda B**. W2 analyserar kraschar, bygger TDD-tester för att bevisa varför den gamla vägen dog, och dissekerar återvändsgränder utan att nudda W1:s bygge.

* **W3 (Barnmorskan / Förlikning):** Observerar sandlådorna. Som den neutrala, läkande kraften har W3 exklusiv tillgång till den **Skarpa Miljön** (Google Drive/Produktion).

## 2. Kognitiv Pipelining och Exekveringscykler

Systemet väver samman planering och implementation genom asynkron pipelining.

### Cykel 1–3: Parallell Planering (Document BEFORE Implementation)

Innan någon skarp kod skrivs måste agenterna enas. W1 och W2 utforskar i sina sandlådor. W3 observerar båda och planerar den logiska förlikningen i klyftan. Tillsammans skapar de den skarpa systemdokumentationen (`CURRENT_FOCUS.md`, `AGENT_MEMORY.md`) i Lager 3 . **Dokumentationen går alltid först.**

### Cykel 4: Sekventiell Materialisering (Födas Igen)

När planen är fastslagen i Cykel 1–3 stiger W1 och W2 åt sidan från produktionen. W3 (Barnmorskan) tar över taktpinnen ensam. W3 skriver den skarpa koden och loggar handlingen inuti systemets WAL (IndexedDB) med statusen `PENDING`.

## 3. The Veto Protocol & System Flush (Den Naturliga Friktionens Prövning)

W3:s `PENDING`-kod blir inte verklighet förrän den har kvalitetssäkrats från två motsatta håll, vilket är där den naturliga friktionen agerar domare:

* **Motsatt Granskning:** W1 (bedömer om visionen framåt uppnåddes) och W2 (bedömer om testerna/bakåtförståelsen respekterades) granskar W3:s föreslagna implementation inuti sina sandlådor .

* **ALLOW (System Flush):** Om båda arbetarna godkänner koden som en renare skapelse, anropar systemet `commitEvent()` i WALManager. Koden ändrar status till `FLUSHED` och skrivs atomärt till Drive.

* **DENY (Veto):** Om W3 tvingat fram en glättig kompromiss lägger W1 eller W2 in sitt Veto . Den `PENDING`-märkta händelsen kastas, systemet rullar tillbaka till säkert läge, och processen återgår till Cykel 1 med det nya misslyckandet som grund. Under denna granskningsfas kan W3 asynkront förbereda "As-Built"-dokumentation, vilken i sin tur enbart flushas om Veto-protokollet passerats.