# CURRENT FOCUS: MCP-Verktyg för Text-agenten & Felhantering

## Status
- **Tillstånd:** FÖRSONAS -> SKAPA (Cykel 1)
- **Nuvarande hinder:** Text-agenten (geminiService.ts) saknar MCP-verktyg för att styra TerminalPanel. Systemet har tidigare kraschat lokalt pga saknade beroenden och COEP-headers på Netlify.
- **Riktning:** Att förändra (Skapa utåtriktade verktyg så agenten kan interagera med världen).

## Mål för nästa Cykel (1: Impact Analysis)
1. Analysera `services/geminiService.ts` och `services/mcpService.ts`.
2. Designa JSON-scheman för `shell_exec` så att text-chatten kan starta processer.
3. Säkerställa att kommandots utdata strömmas till `TerminalPanel` via `liveOrchestrator.ts`.
4. Planera hur filhanteringsverktyg (`read_file`, `write_file`) styrs om från Google Drive till den lokala WebContainerns VFS.
