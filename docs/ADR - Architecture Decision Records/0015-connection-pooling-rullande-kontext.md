# ADR 0015: Connection Pooling & Rullande Lokalt Kontextminne

## 1. Beslutskontext
För att Ouroboros Fraktal-arkitektur ska fungera måste agenter (Förändra, Vända, Förlikas) kunna byta uppgifter och lämna över stafettpinnen (The Acoustic Handoff). Ursprungligen förlitade vi oss på Googles `Session Resumption` för att bevara agenternas kontextminne när de parkerades. 
**Kritisk upptäckt:** Källor från Googles utvecklarforum bevisar att "Session Resumption" med Ephemeral Tokens (vilket vi måste använda för säkerhet) lider av en obehandlad amnesi-bugg. Agenterna tappar allt minne. Även felkod 1011 (`uses: 1`) blockerar återanslutningar och riskerar nätverkskrascher (HTTP 429) då servern inte frigör stängda anslutningar tillräckligt snabbt för Free Tier (max 3 anslutningar).

## 2. Arkitekturbeslut
1. **Connection Pooling:** Vi överger formellt "Session Resumption". Istället håller Orkestratören ("Förlikas") alltid exakt 3 WebSocket-anslutningar vid liv (en för varje agent i triaden). Agenterna stängs inte ner vid stafettbyten; de styrs via asynkrona ljud- och texttriggers i den redan öppna kabeln.
2. **Lokalt Rullande Minne:** Eftersom Googles servrar raderar minnet, flyttas ansvaret ner till vår lokala React-Orkestratör. Orkestratören sammanställer "Aktuellt Kontextfönster" för varje Kanban-uppgift och injicerar det explicit via `send_realtime_input`.
3. **80%-Komprimeringsverktyget:** Den lokala Orkestratören mäter datamängden. När kontextfönstret når 80% kapacitet, aktiveras ett bakgrundsverktyg som tyst komprimerar historiken, låser fast kärnreglerna (Paradigm/Systemprompt), och skjuter in ett nystädat minne till agenterna.

## 3. Konsekvensanalys
* **Positivt:** Vi undviker API-krascher, vi skyddar API-nyckeln och får absolut, deterministisk kontroll över exakt vad AI:n minns (inget raderas tyst i en dold FIFO-kö hos Google).
* **Negativt:** Ökad kodkomplexitet i frontend-orkestratören. Kräver stenhård visuell transparens i gränssnittet.