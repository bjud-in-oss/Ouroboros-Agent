# ADR 0014: Migrering till Monorepo via npm workspaces

## 1. Beslutskontext
Ouroboros-systemet bestod tidigare av isolerade repos för att skydda LLM:ens kontextfönster. Detta skapade dock hög friktion vid synkroniserade uppdateringar. Med introduktionen av vår AAID Dev-Loop har vi insett att fysisk uppdelning av repot är onödig om vi förlitar oss på *lexikal isolering*. Samtidigt har vi utvecklat `acoustic-priming-test` som bevisat att vi kan styra AI-agenter via ljud. Dessa system måste nu enas.

## 2. Arkitekturbeslut
1. **Verktygsval:** Vi konsoliderar hela Ouroboros-ekosystemet till en monorepo via inbyggda `npm workspaces`. Detta väljs framför externa verktyg (Turborepo) för maximal enkelhet och noll beroenden i Chromebook-miljön.
2. **Paketstruktur:** Rotmappen kommer nu innehålla:
   - `packages/ouroboros-agent` (Själva kärnan och UI)
   - `packages/mcp-bridge` (Lager 2: Verktygsbryggan)
   - `packages/acoustic-priming-test` (Vår isolerade testmodul för ljud-triggers)
3. **Lexikal Isolering (AI Studio):** Människan och AI Studio arbetar mot en enda app/session. Vi navigerar repot asynkront via explicit filhämtning från `00_KNOWLEDGE_INDEX.md` (Dev-Loop 1). AI:n laddar aldrig in hela repot.
4. **Abstraktionslager:** Paket får inte direktimportera varandras logik kors och tvärs utan tydliga TypeScript-kontrakt och Vitest-stubbar.

## 3. Konsekvensanalys
* **Positivt:** Blixtsnabb utveckling. Testerna täcker systemöverskridande kodbrott omedelbart. Test-logiken från `acoustic-priming-test` kan nu importeras direkt in i Orkestratören i `ouroboros-agent`.
* **Risk:** AI Studio-assistenten frestas att begära breda felsökningar över alla mappar samtidigt. *Mitigering:* Systemprompten i AI Studio förbjuder ostrukturerade källkodssökningar.