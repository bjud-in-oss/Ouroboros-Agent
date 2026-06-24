# ARCHITECTURE_CAPSULE_INTERACTION_DYNAMICS.md
> **Kategori:** Samtalsdynamik, Ljuddirigering & Fraktal Navigering (The Acoustic Handoff)
> **Syfte:** Att definiera gränssnittet och den akustiska stafett-växeln mellan människa, Orkestratör ("Förlikas") och Arbetare ("Förändra" & "Vända") utan att drabbas av "Split-Brain" eller ljudkollaps.

## 1. Den Fraktala Samtalsmodellen
Ouroboros frångår konceptet med tre stumma robotar. Alla agenter drivs av det multimodala Live API:et och kan tala. Turordningen styrs av den "Akustiska Telefonväxeln" via vår Kanban-arkitektur.
* **Paradigmets Roller:** De agerande systemen bär namnen av paradigmet självt: **Förändra** (Utför/Kodar), **Vända** (Utvärderar/Förstår fel) och **Förlikas** (Orkestrerar/Kommunicerar).
* **Universell Tillämpning:** Denna arbetsmetod tillämpas generiskt oavsett om målet är *Kod*, *Dokumentation* eller analys av *Tankar* (Execution Traces).

## 2. Den Visuella Obsidian-grafen & Kontexttransparens
Människan navigerar i systemets tankeprocesser visuellt.
* Varje gång "Förlikas" startar ett uppdrag, genereras ett dynamiskt uppdragsnamn (t.ex. "Databas-Räddarna"). En visuell nod skapas i React-appens D3.js-baserade Knowledge Graph.
* Genom att klicka på en nod går människan in i "det rummet". UI:t visar tre mikrofon-ikoner (en för varje agent i triaden).
* **Transparens-Fönstret:** Eftersom vi tillämpar Rullande Lokalt Kontextminne (ADR-0015), har UI:t i detta rum en dedikerad panel som i klartext visar *exakt* det textpaket och den kod som Orkestratören just nu skjutit in i agenternas minne.

## 3. The Acoustic Handoff Protocol (Ljuddirigering)
Eftersom flera mikrofoner öppna samtidigt orsakar feedback-kraschar, tillämpas absolut routing:
1. **Dörrvakten:** "Förlikas" (Roten) är alltid den som initierar fraktalen och bjuder in dig till rummet.
2. **Acoustic Priming:** Agenter pratar inte onödigt med varandra. Ljud används som korta "Acoustic Primings" (t.ex. ett ping eller "Jag tar över ordet") för att låsa upp nästa agents uppmärksamhet och indikera stafettbyte i UI:t. (Koncept validerat i `acoustic-priming-test`).
3. **Telepatisk Arbetsyta:** När gruppen arbetar internt inom noden, delar de kod och djup logik uteslutande via tysta JSON-verktyg och asynkrona köer, aldrig genom att diktera kod högt.

## 4. Filler Messages ("Um") och Mjuka Barge-ins
För att skapa realism och hindra användaren från att oavsiktligt avbryta en tänkande agent, spelar Orkestratören upp förinspelade eller genererade "Filler-ljud" (t.ex. "Låt mig titta på koden...") medan turordningen och VAD (Voice Activity Detection) dirigeras om.