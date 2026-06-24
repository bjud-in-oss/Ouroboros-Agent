# ARCHITECTURE_CAPSULE_SECURITY.md
> **Kategori:** AARM, Verktygssäkerhet & Skydd mot Promptinjektioner
> **Miljö:** Ouroboros Agent OS (3x gemini-3.1-flash-live)
> **Syfte:** Att definiera systemets deterministiska försvarsmurar. Kapseln reglerar hur AARM skyddar klyftan mellan arbetarna, hur Scout-mönstret förhindrar "Forced Descent", och hur Two-Pass Tool Injection eliminerar kognitiv överbelastning och Tool Bloat.

## 0. Executive Summary (Analys)
I Ouroboros 3.0 förlitar sig säkerheten aldrig på agenternas inbyggda moral eller systemprompter (vilka är bräckliga och kan komprimeras bort under långa konversationer) . Istället flyttas den absoluta säkerhetsgränsen till det fysiska exekveringslagret (React-appen) . Medan den naturliga friktionen mellan W1 och W2 tillåts blomma ut i sandlådorna, och W3 planerar förlikningen, agerar en stenhård mjukvarugrind kallad AARM (Autonomous Action Runtime Management) domare över varje fysisk handling . Systemet skyddas dessutom mot externa attacker via isolerade informationsbuffertar (Inbox Capsules) och dynamisk verktygsinjektion .

## 0.1 Begrepp och Ordlista
* **AARM (Autonomous Action Runtime Management):** En deterministisk middleware (grindvakt) som fångar och utvärderar alla MCP-verktygsanrop mot ett regelverk *innan* de tillåts nå sandlådorna eller filsystemet .
* **Mission Manifesto:** Ett digitalt signerat Tier 0-dokument som definierar W3:s och sandlåde-agenternas exakta befogenheter. Används av AARM för att omedelbart neka handlingar vid "Intent Drift" .
* **Two-Pass Tool Injection (Lazy Loading):** För att undvika minnesmättnad skickas först bara verktygens *namn* och kategori över WebSocketen (Pass 1). Det tunga JSON-schemat injiceras just-in-time (Pass 2) först när agenten uttryckligen ber om det .
* **Scout Pattern & Inbox Capsules:** Användningen av en svagare, skrivskyddad bakgrundsagent (Scout) för att läsa osäkra webbsidor eller stora loggfiler. Scouten destillerar datan till ofarlig metadata i en "Inbox Capsule", som W1, W2 och W3 sedan kan läsa utan risk för smitta .

## 1. AARM som Deterministisk Grindvakt (The Veto Enforcer)
När W1 försöker bygga visionen framåt, W2 testar för att hitta fel, och W3 försöker trycka på "Spara till Produktion", måste varje anrop valideras.
1. **Intercept:** Varje `shell_exec` eller fil-mutation från arbetarna fångas asynkront av AARM innan verktyget körs .
2. **Evaluate:** Handlingen bedöms mot aktuellt *Mission Manifesto* . Har W2 rätt att manipulera denna fil? Får W3 verkligen spara till produktion i Cykel 1?
3. **Execution Trace (Självläkning):** Om AARM blockerar ett anrop, kraschar inte systemet . AARM skickar asynkront tillbaka en `DEFER`-händelse (Execution Trace) i strömmen . Detta tvingar den aktuella arbetaren att använda sin inbyggda Reflexion-loop för att förstå varför handlingen nekades, och byta strategi .

## 2. Kognitiv Hygien via Two-Pass Tool Injection
För att den naturliga friktionen ska orka pågå över tid får kontextfönstret inte blöda tokens från massiva MCP-verktyg .
* **Skydd mot Tool Bloat:** W1, W2 och W3 initieras enbart med en grundläggande "Capabilities Directory" (t.ex. `File_Operations`) .
* **Skydd mot Tool Shadowing:** När W1 eller W2 upptäcker ett behov, skickar de en avsiktsförklaring (`request_schema`). Först då laddar systemet in det fulla verktyget . Detta eliminerar risken för att en infekterad prompt lurar agenten att anropa ett dolt, destruktivt verktyg i panik .

## 3. Antikroppar mot "Forced Descent" (Scout-Mönstret)
Eftersom arbetarna ständigt läser källkod, kraschloggar och externa moduler, utsätts de ständigt för risken av "Indirect Prompt Injections" (där extern data innehåller dolda direktiv som kapar agentens vilja) .
* Huvudarbetarna (W1, W2, W3) har **absolut läsförbud** för ostrukturerad och otvättad extern data inuti den primära strömmen .
* Istället fångas läsanropet upp av **Scouten** . Scouten, som helt saknar MCP-behörighet, läser den smutsiga filen, extraherar logiken och sanerar semantiken .
* Scouten sparar resultatet som ren JSON i en **Inbox Capsule** på Drive .
* W1, W2 eller W3 meddelas att kapseln är redo och läser därefter enbart det sanerade buffert-dokumentet . Deras kognitiva riktning förblir oförstörd .