# CURRENT FOCUS

## 1. The Dead Socket Trap & The Phoenix Protocol Fix
We discovered a blind spot during local stress testing: when Google closes the Live API WebSocket in the background due to inactivity, the socket dies silently. Checking if the session object exists (`this.session !== null`) yields a false positive. 
When `sendRealtimeInput` is called on a dead socket, it throws an asynchronous "CLOSING or CLOSED state" error, which our standard `try...catch` in `delegateTask` failed to catch synchronously. As a result, the worker gets stuck in the "Processing..." state until the 45-second watchdog intervenes. 

**Refinement:** We added a strict validation right before calling `sendRealtimeInput`. If the `worker.session` or socket is detached/closed, we throw a synchronous `Error` ("WebSocket disconnected. Forcing immediate Phoenix Protocol trigger."). This allows our main `catch` block in the Orchestrator to instantly strip locks and prompt a Phoenix Protocol reconnection on the next interaction.

## 2. Future Architectural Refactor (Agent 1)
**Issue:** Agent 1 (The Orchestrator) is currently running on the REST API (`gemini-3-pro-preview`). Because the full contextual history must be sent with every request, this rapidly consumes the API rate limit quota (HTTP 429 - Too Many Requests).
**Solution:** We need to rebuild Agent 1 to use the Live API (`gemini-3.1-flash`) exclusively. The Live API maintains context natively within the session, drastically reducing overhead payload and avoiding REST API rate limit saturation.
