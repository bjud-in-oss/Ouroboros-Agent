# ADR 0016: The Forge, Synthetic Respond Tool & Retry Nudges

## 1. Beslutskontext
Ouroboros 3.0 drivs av `gemini-3.1-flash-live`. Trots stenhårda systemprompter har moderna LLM:er en inbyggd tendens att ibland falla tillbaka i chatt-beteenden eller formatera strukturerad data felaktigt (t.ex. genom att omsluta JSON-verktygsanrop i Markdown-block som ````json { ... } ````). 
Om underarbetarna (*Förändra* och *Vända*) börjar "prata fritt" i text istället för att använda verktyg, förstörs den interna telepatiska arbetsytan ("viskleken" uppstår). Om felformaterad JSON når WebContainern kraschar systemet omedelbart. Vi behöver ett skyddsnät som tvingar fram determinism och självläkning innan felen når användaren.

## 2. Arkitekturbeslut

### 2.1 The Synthetic Respond Tool
Vi förbjuder underarbetarna (*Förändra* och *Vända*) att returnera ostrukturerad text till Orkestratören (*Förlikas*). All interaktion **måste** ske via ett tvingande verktyg (ett *Synthetic Respond Tool*, t.ex. `completeTask` eller `reportFindings`).
* **Funktion:** Detta tvingar agenten att strukturera sina tankar och resultat i fördefinierade JSON-fält (exempelvis `status`, `rationale`, `files_changed`). 
* **Syfte:** Bibehålla "Industrial Clarity" och garantera att *Förlikas* alltid får maskinläsbar data att lagra i det rullande kontextminnet och på Google Drive.

### 2.2 "The Forge" som Middleware (Rescue Parsing)
Vi implementerar en tvätt- och valideringsmekanism ("The Forge") direkt inuti Orkestratörens WebSocket-avlyssning, innan verktygsanropen skickas vidare till MCP eller WebContainern.
* **Funktion:** Forge-middlewaren fångar upp in-flight data. Om den upptäcker ogiltig JSON (t.ex. inbäddade Markdown-taggar), tillämpar den regex och stränghantering för att "tvätta" och parsa fram det korrekta objektet.
* **Syfte:** Eliminera onödiga systemkrascher orsakade av ytliga LLM-formateringsmissar.

### 2.3 Retry Nudges (Osynlig Självläkning)
Om The Forge inte kan rädda JSON-datan, eller om ett terminalkommando (`shell_exec`) i WebContainern kraschar, får felet **inte** avbryta sessionen eller dumpas till användaren.
* **Funktion:** Orkestratören fångar felet, paketerar det och skjuter asynkront in det direkt i agentens öppna kabel via `send_realtime_input`.
* **Format:** `[SYSTEM ERROR: Invalid JSON format i verktyg X. Korrigera och försök igen.]` eller `[EXECUTION FAILED: Exit code 1. Läs loggen och skriv om koden.]`
* **Syfte:** Detta skapar en intern "Försonings-loop" där agenten knuffas till att rätta sig själv i bakgrunden utan att störa den mänskliga användaren.

## 3. Konsekvensanalys
* **Positivt:** Systemet blir extremt feltolerant. "The Forge" agerar stötdämpare mot LLM:ens hallucinationer. Agenterna upplevs som mycket mer deterministiska och kompetenta eftersom deras misstag läks osynligt.
* **Risker:** En agent kan fastna i en oändlig "Retry Loop" om den inte förstår felet.
* **Mitigering:** Vi inför en hård maxgräns (t.ex. 3 retries). Om en underagent misslyckas tre gånger i rad trots Nudges, tvingas den utföra en "Graceful Exit", returnera ett VETO till *Förlikas*, varpå *Förlikas* informerar användaren och ber om mänsklig vägledning.