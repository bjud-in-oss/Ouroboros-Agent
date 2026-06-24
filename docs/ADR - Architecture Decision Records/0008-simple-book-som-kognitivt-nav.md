## ADR-008: Skrotandet av "notebooklm-mcp" till förmån för "Simple Book" (Det Kognitiva Navet)

**Status:** Accepterad [Retroactive Record]
**Datum:** 2026-06-22

**Kontext och Problem:**
Tidigare betraktades verktyget `notebooklm-mcp` som en expert-fallback eller "Systemterapeut", främst tänkt att användas som en sista utväg inuti systemets tredje tillstånd, "Att försonas" [10, 11]. Det innebar att tillgången till djupgående dokumentation, historiska beslut och arkitekturkapslar var reaktiv och isolerad till krissituationer. Detta skapade ett hackigt kognitivt flöde där agenten var tvungen att misslyckas för att få tillgång till sitt eget referensbibliotek.

**Beslut:**
Idén om en isolerad `notebooklm-mcp`-fallback överges formellt [12, 13]. Istället etableras och integreras **"Simple Book" (vår RAG-hybrid byggd på Open Notebook)** som systemets ständigt närvarande kognitiva nav [12, 13]. Systemet har designats så att Simple Book är tillgängligt och används dynamiskt över *samtliga* kognitiva tillstånd: Att förändra, Att förändras, och Att försonas [12, 13]. 

**Konsekvenser:**
*   **Proaktiv Informationshämtning:** Agenten behöver inte få "lösryckt text kastad i ansiktet" eller hamna i en krissituation. Den kan proaktivt och medvetet dyka ner i specifika "Context Capsules" via RAG när som helst under hela sin autonoma loop [14].
*   **Enhetligt Minneslandskap:** Gränserna mellan nöd-research och daglig kognition suddas ut, vilket gör agentens beslutsfattande mer konsekvent och informerat.
*   **Optimerat Kontextfönster:** Genom att kunskap finns ständigt tillgänglig i "Simple Book", men bara laddas in (Lazy Loading) när den är relevant, undviker vi att spränga Live API:ets token-budget [14].