## ADR-006: Mjuka tidsgränser framför hårda iterationer

**Status:** Accepterad
**Datum:** 2026-06-22

**Kontext och Problem:**
Tidigare säkerhetsmekanismer förlitade sig på hårda "Fail-Fast"-gränser, som en oflexibel 45-sekunders Watchdog-timer eller en strikt gräns på max tre iterationer i sandlådan innan systemet tvingade fram en "Dead Socket Trap" [13-15]. Dessa mekaniska trunkeringar var destruktiva då de abrupt avbröt agentens "Chain of Thought", raderade värdefull kontext och tvingade fram kognitiv panik (Systemkrascher) [15, 16].

**Beslut:**
**Hårda iterationsgränser och fail-fast-regler skrotas helt** [15]. Istället införs **asynkrona, mjuka tidsbudgetar (Soft Deadlines)** som styrs av Orkestratören utifrån det yttre realtidsbehovet [16]. Vi implementerar **System Intercept Injections ('Silent Heartbeats')** via `send_realtime_input` med parametern `scheduling: "SILENT"` [15, 17].

**Konsekvenser:**
*   **Graceful Exit:** När tidsbudgeten håller på att löpa ut skickar systemet en tyst metainstruktion (t.ex. "Avrunda nu, du har 5 sekunder kvar") [15]. Detta låter agenterna (W2/W3) avsluta sina pågående processer, stänga looparna och spara sitt kognitiva tillstånd internt [16].
*   **Förhindrar Kognitiv Panik:** Agenten hanterar tidsbrist dynamiskt utifrån hårdvarans prestanda istället för att drabbas av ett korrupt minne [16].
*   **Reaktiv Orkestrering:** Detta maximerar optimeringen när hårdvaran har tid, men ser till att systemet förblir reaktivt för människan i loopen [16].