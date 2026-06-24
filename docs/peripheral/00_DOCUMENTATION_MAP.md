# 00_DOCUMENTATION_MAP.md - Ouroboros Dokumentationsstruktur

**1. Vad?** Ett tudelat system: Arkitekturkapslar (Kärnlagar) och ADR (Beslutshistorik) under `docs/`.
**2. Varför?** Separerar aktuella regler (Hur) från gammal historik (Varför) for att undvika kognitiv överbelastning och hallucinationer.
**3. Källa?** Ouroboros-metodiken ("Context Window Bloat") samt branschstandard för ADR.
**4. Funktion?** Kapslarna är levande dokument som styr koden. ADR är frysta loggböcker över vägval.
**5. Användning?** Lazy Loading. Agenten läser enbart den specifika kapsel som krävs för uppgiften.
**6. Uppkomst?** För att rensa rotmappen och skapa en navigerbar minneskarta för AI-agenter.
**7. Fungerar det?** Ja, övertydliga mappstrukturer agerar som inbyggda prompter.
**8. Bevis?** Micro-Chunking av kontext minskar bevisligen minnesspill och ökar precisionen.
**9. Framtid?** Möjliggör "Rekursiv Autonomi" där systemet själv skriver nya ADR och underhåller lagarna säkert.
