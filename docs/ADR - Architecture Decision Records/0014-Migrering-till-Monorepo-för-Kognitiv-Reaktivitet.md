ADR-00X: Migrering till Monorepo för Kognitiv Reaktivitet

Beslutskontext:
Ouroboros består av flera rörliga delar (Live Orchestrator, Frontend UI, MCP-bridge, och VitePress-dokumentation). Tidigare isolerades koden fysiskt för att skydda LLM:ens kontextfönster. Detta har lett till "Split-Brain"-scenarion där relationella kodbrott upptäcks för sent, och försvårar W3:s förmåga att utföra "Kognitiv Rebase" över hela systemet.

Arkitekturbeslut:

Monorepo via Workspaces: Hela Ouroboros-ekosystemet konsolideras till en monorepo.

Lexikal Isolering framför Fysisk Isolering: Vi överger strategin att minska tokens via fysisk repouppdelning. Istället förlitar vi oss på lexikal isolering via 00_KNOWLEDGE_INDEX.md. Agenten navigerar monorepot asynkront via explicit filhämtning (Dev-Loop 1).

Abstraktionslager (Kontrakt & Stubbar): Inget paket i monorepot får importera ett annat pakets "smutsiga" logik direkt under utveckling. Kommunikation sker via strikta TypeScript-kontrakt och utvärderas via Vitest mot Stubbar för att bibehålla determinism utan token-svällning.

Konsekvensanalys:

Positivt: Blixtsnabb utveckling där WebContainern kan starta dev-servrar för flera projekt samtidigt.

Risk: Att AI-agenten faller in i gamla hjulspår och försöker göra breda grep-sökningar över hela monorepot, vilket kan spränga 65k-taket. Mitigering: Strikta restriktioner i systemprompten där agenten instrueras att alltid utgå från Knowledge Index.