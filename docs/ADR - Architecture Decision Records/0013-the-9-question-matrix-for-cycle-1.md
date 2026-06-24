# 0013: The 9-Question Matrix for Cycle 1 (Research & Interrogation)

**Status:** accepted

#### Kontext & Problem
När AI-agenter (t.ex. AI Studio) ombeds implementera nya funktioner lider de ofta av "Eager to Please"-syndromet, vilket innebär att de genar förbi arkitektonisk planering och hoppar direkt till kodskrivning. Detta leder till "stuprörskodning", där nya moduler inte integreras korrekt med systemets övergripande lagar (som WAL, AARM eller VFS).

#### Beslut
Vi uppdaterar systeminstruktionerna för `CYCLE 1: Research & Interrogation`. Innan agenten tillåts presentera en lösning eller skriva kod, **måste** den först generera och besvara en "9-Question Matrix" riktad mot användarens förslag . Dessa frågor (Vad, Varför, Syfte, Resultat, Källor, Beroenden, etc.) tvingar agenten att stress-testa konceptet .

#### Konsekvenser
Detta skapar initial "friktion" och förlänger planeringsfasen, men det garanterar "Industrial Clarity" . Det isolerar systemets fundamentala logik och tvingar AI:n att validera integrationen mot befintliga arkitekturkapslar innan kod exekveras.
