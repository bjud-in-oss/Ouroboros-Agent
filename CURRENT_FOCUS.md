# CURRENT FOCUS

## 1. The Dead Socket Trap & The Phoenix Protocol Fix
We discovered a blind spot during local stress testing: when Google closes the Live API WebSocket in the background due to inactivity, the socket dies silently. Checking if the session object exists (`this.session !== null`) yields a false positive. 
When `sendRealtimeInput` is called on a dead socket, it throws an asynchronous "CLOSING or CLOSED state" error, which our standard `try...catch` in `delegateTask` failed to catch synchronously. As a result, the worker gets stuck in the "Processing..." state until the 45-second watchdog intervenes. 

**Refinement:** We added a strict validation right before calling `sendRealtimeInput`. If the `worker.session` or socket is detached/closed, we throw a synchronous `Error` ("WebSocket disconnected. Forcing immediate Phoenix Protocol trigger."). This allows our main `catch` block in the Orchestrator to instantly strip locks and prompt a Phoenix Protocol reconnection on the next interaction.

## 2. Future Architectural Refactor (Agent 1)
**Issue:** Agent 1 (The Orchestrator) is currently running on the REST API (`gemini-3-pro-preview`). Because the full contextual history must be sent with every request, this rapidly consumes the API rate limit quota (HTTP 429 - Too Many Requests).
**Solution:** We need to rebuild Agent 1 to use the Live API (`gemini-3.1-flash`) exclusively. The Live API maintains context natively within the session, drastically reducing overhead payload and avoiding REST API rate limit saturation.

## 3. Model Name Inversion Bug (Live API)
**Issue:** Workers were "dead on arrival" with WebSockets immediately closing with status `CLOSING` or `CLOSED`. This was caused by an inversion in the Live API model naming convention (`gemini-2.5-flash-live` instead of the correct `gemini-live-2.5-flash-preview`).
## 4. The Live API Handshake Structure Refactor
**Issue:** Our Worker sessions are "dead on arrival" due to a fundamental structual handshake flaw, not inactivity. Placing `automaticActivityDetection` directly inside the configuration object corrupts the JSON schema for `@google/genai`, causing immediate connection termination.
**Solution:** We are preparing a structural refactoring of `services/liveOrchestrator.ts` to implement the correct structural blueprint (`realtimeInputConfig -> automaticActivityDetection -> disabled`). Concurrently, we will expand the WebSocket callbacks with `onopen`, `onclose`, and `onerror` to eliminate asynchronous blindness and improve debugging.

## 5. The Live API Realtime Input Payload Refactor
**Issue:** Text messages sent over the WebSocket are silently ignored by the server, leading to 45-second watchdog timeouts.
**Solution:** `sendRealtimeInput` receives an array (`[{ text: "..." }]`) instead of the flat object (`{ text: "..." }`) expected by the server. We will refactor the sending blocks in `liveOrchestrator.ts` (specifically `delegateTask` and similar functions) to use the correct flat object payload structure to prevent silent packet drops.

## 6. The Live API Tool Response Envelope Refactor
**Issue:** Responding to a tool call crashes the active session with the error `Error: Tool response parameters are required.`.
**Solution:** We are preparing a correction to the `onmessage` callback (specifically around line 287 and 593 in `services/liveOrchestrator.ts`) to wrap the tool responses in the strict `{ functionResponses: [...] }` envelope required by the SDK.

## 7. OUROBOROS VARV 1: LIVE-FIRST ARCHITECTURE BLUEPRINT
**Status:** Blueprint Låst
**Issue:** Vi genomför ett totalt paradigmskifte för att omvandla Ouroboros från en REST-app till ett distribuerat Agent OS (Root Repo).
**Solution:** Den strategiska blueprinten (Master Blueprint) är nu etablerad i minnet (`AGENT_MEMORY.md` och Arkitekturkapslarna `ARCHITECTURE_CAPSULE_MEMORY.md`, `ARCHITECTURE_CAPSULE_SECURITY.md`, `ARCHITECTURE_CAPSULE_SYNC.md`). Vårt nästa mål är att rita upp refaktoreringen av `App.tsx` och `liveOrchestrator.ts` för att initiera den Live-First-baserade WebSocket-motorn.
