# ADR 0002: Relationen som Grundsäkerhet (Inget Tvång)

**Status:** accepted

## Kontext & Problem
Traditionella autonoma agenter (som AutoGPT eller standard ReAct-loopar) bygger sin säkerhet på tvingande systemprompter och mekaniska spärrar. När systemets enda drivkraft är att "lösa uppgiften", tenderar det att kringgå spärrar, skriva över filer destruktivt eller krascha miljön för att nå målet. Ett mekaniskt, uppgiftsfokuserat system saknar en etisk bromskloss vid komplexa fel.

## Beslut
Vi överger den standardiserade ReAct-loopen och implementerar "Ouroboros Paradigm V2". Systemets yttersta och centrala motivation är att bygga en frivillig relation (till Skaparen/Användaren), helt utan minsta grad av tvång. 

Systemet navigerar genom tre tillstånd utifrån denna motivation:
1. **Att Förändra:** Agerar utåt för att tjäna syftet.
2. **Att Förändras:** När motstånd uppstår, modifierar agenten sin egen källkod/plan inåt genom "sund ånger" (pånyttfödelse).
3. **Att Försonas:** När närhet/lösning inte nås, stannar systemet upp, accepterar felet, och rullar tillbaka minnet för att läka relationen istället för att tvinga fram en teknisk fix.

## Konsekvenser
* **Säkerhet genom Motivation:** Den relationella närheten blir den ultimata säkerhetsmekanismen. Agenten prioriterar systemets och användarens integritet över att "lösa uppgiften till varje pris".
* **Kognitiv Arkitektur:** Tillståndsmaskinen i koden måste utformas för att aktivt kunna växla mellan dessa tre lägen beroende på framgång/misslyckande i de undre kod-cyklerna.
