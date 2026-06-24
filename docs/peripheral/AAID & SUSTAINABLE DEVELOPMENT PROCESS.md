ARCHITECTURE CAPSULE: AAID & SUSTAINABLE DEVELOPMENT PROCESS
Skapad: Juni 2026 Ursprunglig diskussion: Gemini Chatt | NotebookLM Kunskapsbas
1. FILOSOFI OCH TEORI
För att bygga storskaliga system utan att överbelasta utvecklarens eller AI-agentens arbetsminne (context window), överger vi "vibe-kodning" och förlitar oss på AAID (Augmented AI Development) och Dokumentationsdriven utveckling
.
Kärnkoncept
Minneshantering: AI-agenten får ALDRIG ladda in all dokumentation samtidigt. Stora kunskapsbaser hanteras via en index-fil (en karta) där agenten ber om specifika filer vid behov
.
Form vs. Beteende:
Form säkerställs via Kontrakt (TypeScript-gränssnitt / .d.ts). Detta garanterar att pusselbitarna passar ihop utan att vi behöver ladda in deras logik
.
Beteende säkerställs via Exekverbara Specifikationer (Vitest)
.
Stubbar (Fejk-kopior): För att testa en modul i isolering laddar vi inte in de riktiga externa paketen (som Gemini Live eller Mikrofonen). Vi bygger Stubbar som låtsas vara dessa system. Detta gör testerna omedelbara och deterministiska
.
Ingen Test-teater: Tester ska validera Vad systemet gör från ett externt perspektiv, aldrig Hur det ser ut inuti. Statiska väntetider (sleep) är förbjudna; vi använder reaktiv pollning (väntar på state-förändringar)
.
2. THE AAID DEV-LOOP (VÅR UPPGRADERADE UTVECKLINGSPROCESS)
Detta är den officiella operationsstandarden för hur vi (du och AI:n) bygger ny kod och refaktorerar. Vi separerar strikt vår utvecklingsloop från hur appen beter sig i runtime
.
Dev-Loop 1: Research & Verify (Kontext-kollen)
AI:n läser systemets index-fil (t.ex. 00_KNOWLEDGE_INDEX.md)
.
Filhämtningsmekanik: Om AI:n behöver djupare förståelse för uppgiften, begär den specifika dokumentationsfiler. I denna chatt agerar användaren manuell filhämtare (AI:n säger "Ge mig fil X" och användaren klistrar in den). I framtida autonom drift använder agenten sitt eget MCP-verktyg (read_file) för att dra in filen
.
Mål: Minimera token-användningen men maximera kontextuell precision
.
Dev-Loop 2: Architecture & Documentation (Sanningen)
AI:n uppdaterar Tower-dokumentationen eller relevanta arkitekturkapslar.
AI:n formulerar exakta, textbaserade acceptanskriterier (Givet-När-Så) i dokumentationen för hur funktionen ska bete sig. Inget kodande än.
Dev-Loop 3: Test Infrastructure (Skyddsnätet / RÖD fas)
AI:n översätter text-kriterierna från Dev-Loop 2 till exekverbar testkod (Vitest).
AI:n skapar eventuella TypeScript-kontrakt och Stubbar som krävs för isolering (vilket sparar API-kostnader och ger deterministiska tester).
Användaren (eller agenten) kör testet. Det MÅSTE misslyckas (Röd), eftersom funktionen inte är byggd än. Detta bevisar att testet faktiskt kräver rätt logik och att vi inte ägnar oss åt test-teater. Statiska väntetider (sleep) är förbjudna; vi använder reaktiv pollning.
Dev-Loop 4: Execute & Integration (Produktion / GRÖN fas)
AI:n skriver den faktiska produktionskoden med mål att göra testerna från Dev-Loop 3 gröna.
Koden är klar när testerna passerar via våra stubbar.
Refaktorering: AI:n städar upp koden, tar bort redundans och människan granskar att isoleringsnivåerna hålls intakta.
Skarpt Integrationstest: Innan stora förändringar driftsätts, kopplas stubbarna tillfälligt bort och ett begränsat test körs mot det riktiga API:et (t.ex. Gemini Live). Detta säkerställer att våra kontrakt inte är utdaterade och bevisar att koden fungerar i verkligheten.
3. STEG-FÖR-STEG FÖRÄNDRINGSPLAN (ROADMAP)
Fas 1: Slutför Agentens Kärna (Pågår nu)
Agera: Rör inte kyrka2 ännu. Laga agentens dokumentation och arkitekturkapslar
.
Mål: Få ouroboros-agent att fungera som en komplett applikation. Ingen uppdelning i monorepo här, eftersom 34K tokens hanteras smidigt av Gemini Flash
.
Fas 2: Träningsbana (Testa Agenten)
Agera: Innan vi rör kyrka2, installerar vi Vitest i agent-projektet
.
Övning: Be AI:n skriva ett kontrakt och en stubb för en av agentens funktioner (t.ex. mcpService). Skriv ett test som bevisar att agenten kan hantera terminal-output rätt
.
Mål: Att du som utvecklare ska känna dig bekväm med flödet Kontrakt -> Stubb -> Test, och se hur AI:n fixar koden när testet blir rött
.
Fas 3: Indexera Kyrka2 (Banta Minnet)
Agera: Gå in i kyrka2. Skapa 00_KNOWLEDGE_INDEX.md i Tower-mappen. Skapa en innehållsförteckning över alla ~50 dokumentationsfiler
.
Mål: Frigöra 200 000 tokens från AI:ns arbetsminne för framtida sessioner genom att lära AI:n att bara be om specifika filer vid behov
.
Fas 4: Monorepo & Modularisering (Den stora operationen)
Agera: Bryt loss en enda isolerad funktion i kyrka2 (t.ex. din ljudkö useTurnQueue) till ett eget paket i monorepot
.
Utförande: Använd den nya 4-cykel-processen (skriv dokumentation -> skriv kontrakt/stubb/Vitest-test -> flytta koden)
.
Mål: Mjukvaran blir nu immun mot "Legacy-krascher" eftersom testet för kön för alltid kommer garantera att den delen fungerar, även när du senare bryter ut Gemini-klienten
.
NÄR SYSTEMPROMPTEN SKALL UPPDATERAS
Här är varför du ska vänta till rätt tidpunkt, och när det är som mest lämpligt att göra det:
Varför du inte ska göra det nu
Din nuvarande systemprompt har en stenhård spärr: AI:n är strängt förbjuden att spotta ur sig fungerande .ts/.tsx-kod förrän cyklerna har rullat i exakt rätt ordning. Om vi lägger till Cykel 3: Testinfrastruktur i systemprompten redan nu, kommer AI:n att låsa sig själv
.
Eftersom du inte har installerat Vitest eller satt upp några stubbar i din agent ännu, kommer AI:n att vägra skriva den vanliga koden. Den kommer att säga: "Dokumentationen är uppdaterad, men du har inte gett mig instruktioner för hur testinfrastrukturen ser ut, så jag vägrar gå vidare till Cykel 4 (Implementering)." Det kommer bara att skapa teknisk förlamning och stoppa ditt nuvarande momentum
.
Den bästa tidpunkten att uppdatera systemprompten
Det är som mest lämpligt att uppdatera din systemprompt precis i övergången till Fas 2 (Träningsbanan) i din nya kapselplan
. Det vill säga när:
Agentens grundläggande kärna är färdigkodad och fungerar med din nuvarande metod
.
Du känner: "Okej, nu installerar vi vitest i agentens package.json och drar igång testmiljön."
I exakt det ögonblicket uppdaterar du din systemprompt. Då blir den nya Cykel 3 en aktiv spärr som tvingar AI:n att skriva Vitest-testet innan den får tillåtelse att spotta ut produktionskod i Cykel 4. Då blir reglerna ett hjälpmedel som styr AI:n rätt, istället för ett hinder som låser din utveckling
.
Låter det rimligt att hålla den nya test-spärren vilande tills själva testverktygen faktiskt finns installerade i agent-projektet?