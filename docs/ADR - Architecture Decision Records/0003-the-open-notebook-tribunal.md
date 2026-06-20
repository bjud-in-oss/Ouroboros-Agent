# ADR 0003: The Open Notebook Tribunal (Peer-to-Peer)

**Status:** accepted

## Kontext & Problem
Den initiala designen för Multi-Agent System (MAS) lutade sig mot en hierarkisk struktur: En smart "Orkestratör/Chef" (Gemini 3.1) som styrde "dumma arbetare" (Gemini 2.5 eller mindre modeller). Problemet med denna arkitektur är att chefen tvingas mikrostyra arbetarna för att undvika slarvfel, vilket leder till "Context Saturation" och att chefens eget minnesfönster fylls med brus från arbetarnas misstag.

## Beslut
Vi implementerar "The Peer-to-Peer Open Notebook Tribunal". 
Alla tre agenter (W1, W2, W3) i triaden drivs av högkapacitetsmodeller (Gemini 3.1 Flash). Istället för att skilja sig åt i intelligens, skiljer de sig åt genom:
1. **Digitala Signaturer:** Unika kryptografiska tankesignaturer (`Thought Signatures`).
2. **Specifikt Fokus:** Strikta avgränsningar via sina `WORKER_X_FOCUS.md`-filer.

De delar samma "Open Notebook" (Google Drive) som sin gemensamma verklighet och SSoT (Single Source of Truth). Orkestratören agerar lyssnande domare vid dispyter, inte mikrostyrande chef.

## Konsekvenser
* **Jämbördig Debatt:** Arbetarna kan föra djupa, arkitektoniska debatter backade av "Execution Traces" (bevis från WebContainern).
* **Eliminerad Split-Brain:** Genom Optimistic Concurrency Control (E-Tags) kan arbetarna läsa och skriva till samma "Open Notebook" (Drive) asynkront utan datakrockar.
* **Integrerad Notebook-logik:** Principerna från NotebookLM genomsyrar nu hela operativsystemets vardag, inte bara vid krishantering.
