# AGENT MEMORY (Konsoliderad)

## Paradigmskifte
Vi har övergått till Ouroboros Paradigm V2. Systemet agerar i tre riktningar:
1. **Att förändra:** Utåtriktad handling (Skriva kod, köra processer i terminalen).
2. **Att förändras:** Inåtriktad transformation (Agenten skriver om sina egna muterbara verktyg och minne baserat på insikt).
3. **Att försonas:** Läkande och integration. När fel uppstår (ex. terminal-krasch) måste systemet stanna, läka sitt minne och synkronisera med människan utan att forcera fram en lösning.

## Kritiska Lärdomar (Från Forge)
- **Context Compaction:** Terminal-loggar och minne måste ha en "tail-limit" för att förhindra minnesläckor i kontextfönstret.
- **Retry Nudges:** Systemet ska fånga fel och be agenten försöka igen inuti en Försonas-loop.
- **Agentens Lager:** `ARCHITECTURE_CAPSULE`-filer är Lager 1 (Oföränderliga lagar). Agentens MCP-verktyg är Lager 2 (Muterbara). Detta dokument är Lager 3 (Plastiskt kontext).

## Historik
- Vi har byggt en `TerminalPanel` (Xterm.js) som lyssnar asynkront på `liveOrchestrator`. 
- Kärnan har säkrats med Graceful Degradation (VFS Guard) mot plattformar som saknar COOP/COEP-headers (som Netlify/AI Studio preview).