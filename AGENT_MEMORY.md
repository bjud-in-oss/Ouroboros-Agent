# AGENT_MEMORY

## System Status
- **Phase:** 3 (The Autonomous Loop - Stable)
- **Architecture:** Drive-Augmented Ouroboros (React 19 + Vite + Netlify + Drive API)
- **Current Focus:** Ensuring robust persistence via "Folder Awareness" and strict API protocols.

## Architecture Guidelines (Immutable)
1. **Frontend:** React 19+ (Vite/TypeScript). No custom backend.
2. **Database:** Google Drive (via GSI/Drive API). `app-data.json` holds the master state.
3. **Deployment:** Netlify. `scripts/init-netlify.js` MUST run before build to generate `_redirects`.
4. **Environment:** Map `VITE_` vars to `process.env` in `vite.config.ts`.
5. **Auth:** Incremental Authentication. `drive.file` scope requested only on user action.

## Critical Technical Laws (The "Ouroboros" Protocol)

### 1. The Drive ID Law
Google Drive is **NOT** a file system with paths (e.g., `/Ouroboros/data.json`). It is a flat, ID-based database.
- **Rule:** Never attempt to save to a path string.
- **Requirement:** Always resolve `folderId` via a search query (`mimeType = folder and name = 'Ouroboros'`) before any file operation.

### 2. The Scope Visibility Strategy
We use the restricted `drive.file` scope for user trust. This means the app *cannot see* folders created by the user outside the app.
- **Strategy:** The `ensureFolderExists` function is mandatory. It attempts to find the folder; if it returns null (due to scope visibility), it **MUST** create a new folder that the app owns.

### 3. The Multipart PATCH Rule
When updating existing files using the Drive API `multipart/related` method:
- **Rule:** Do **NOT** include the `parents` field in the metadata during a `PATCH` request.
- **Reason:** Including parents implies a "move" operation, which triggers strict validation and often results in `400 Bad Request`. Only use `parents` during `POST` (creation).

### 4. Build & Environment Logic
- **Vite Config:** `process.env` is not available in the browser by default. We explicitly map `VITE_API_KEY` and `VITE_GOOGLE_CLIENT_ID` inside `vite.config.ts`.
- **Netlify Routing:** Single Page Applications (SPA) require a `public/_redirects` file (`/* /index.html 200`) to handle browser refreshes. This is generated automatically by `scripts/init-netlify.js`.
- **Import Maps:** Do NOT use `<script type="importmap">` in `index.html`. Let Vite handle dependency resolution to avoid conflicts.

### 5. The Snapshot Strategy
Before any overwrite (PATCH) of the master app-data.json, a backup MUST be created (app-data.backup.json) using the createBackup function. This prevents data corruption during autonomous loops and ensures system memory safety.

## Active Modules
- `services/geminiService.ts`: Neural Interface (Ouroboros Loop).
- `services/driveService.ts`: Backend Persistence (Drive API v3) - **UPDATED** with Folder Awareness.
- `components/MemoryPanel.tsx`: Visualizer for `LONG_TERM_MEMORY.json`.
- `components/FocusPanel.tsx`: Log viewer for `CURRENT_FOCUS.md`.

## Multi-Agent Orchestration & Fault Tolerance

1. The Agent Triad:

The system orchestrates 3 parallel Live API WebSocket sessions.

Agent 1 (Lead): Uses gemini-3.1-flash-live with Voice Activity Detection (VAD) ENABLED. Acts as the user voice interface and delegates tasks. Does not execute code.

Agent 2 & 3 (Workers): Uses gemini-2.5-flash-live with VAD DISABLED (automaticActivityDetection: false). Act as silent independent background coders.

2. Concurrency & State Isolation (CRITICAL):

To prevent overwrite collisions, Workers must maintain separate focus logs on Google Drive (e.g., WORKER_2_FOCUS.md and WORKER_3_FOCUS.md).

The Orchestrator must enforce a queue or lock mechanism for saveState operations regarding master files (like app-data.json).

3. The Sandbox Law & Iteration Limits (REVISED):

MCP Node/TS Sandbox: Worker Agents must NOT use the native Gemini codeExecution tool. They must validate code modifications via an external Node.js/TypeScript sandbox accessed through the existing Model Context Protocol (MCP) infrastructure (services/mcpService.ts and mcp-bridge/bridge.js).

Fail-Fast Mechanism: A Worker may only attempt to fix execution/linting errors a maximum of 3 consecutive times. If it fails on the 3rd try, it MUST abort, log the failure block in its focus file, and escalate the issue back to Agent 1 for human intervention.

4. The Instant-Ack Hack (Async Unblocking):

Because Agent 1 is synchronous, any ToolCall it issues MUST receive an immediate mock ToolResponse from the orchestrator ({"status": "queued"}). This unblocks the voice loop.

Upon completion, worker results are injected back into Agent 1's WebSocket using ClientContent packaged as a system update.

5. WebSocket Resilience & Drive API Limits:

Orchestrator must capture SessionResumptionUpdate handles. If a WebSocket drops, use the handle to immediately reconnect. If resumption fails, completely re-initialize the session and fetch the absolute truth from Google Drive to rebuild context.

Implement exponential backoff retries for all Google Drive API interactions to handle HTTP 429 limits.

6. The Veto Protocol (Mandatory Dissent):

Every task delegation from Agent 1 to Worker Agents must implicitly include a "Critical Evaluation Phase".

Rule: Workers are explicitly instructed: "Only implement these features if you agree with the architectural and logical approach. Otherwise, report the problem and do NOT implement anything."

If a Worker detects an architectural violation, logical flaw, or risk of infinite loops, it must exercise its Right to Veto. It will immediately halt execution, log the specific technical objection, and return an error payload to Agent 1.

7. Lifecycle Teardown & Native Git Rollbacks (CRITICAL):

True Teardown: Deactivating the Orchestrator MUST invoke native SDK .close() or .disconnect() methods on all WebSockets (or equivalent aggressive cleanup). Setting session references to null is insufficient and causes zombie memory leaks.

The Mute Directive: To save bandwidth, Workers are instructed to be MUTE via their system prompt. Architectural Note: This is a soft LLM guardrail that starves the audio encoder by preventing text output; it does not alter the underlying WebSocket binary protocol.

Fail-Safe Git Rollbacks: If a Worker hard-crashes (3 strikes), the Orchestrator must execute a git restore <lockedFiles> command via mcpService to purge corrupted code.

The Anti-Deadlock Guarantee: The Git Rollback command MUST be wrapped in an isolated try...catch block. The release of the Scope Mutex locks MUST be placed inside a finally block to guarantee files are unlocked even if the local MCP server lacks Git capabilities or throws an error.

Event-Driven Error Bifurcation: The Orchestrator must handle two distinct failure vectors to prevent deadlocks:

Submission Errors (Synchronous): Handled via a .catch() block directly on the delegateTask() call. If a worker rejects the task instantly (e.g., offline), immediately release Mutex locks (No Git Rollback needed).

Execution Errors (Asynchronous): Handled via an event-driven onTaskComplete(failed: boolean) callback. If the worker hard-crashes during execution, execute the isolated try...catch...finally Git Rollback logic here.

8. Worker Concurrency (The Busy Flag):

To prevent the "Overworked Agent" race condition (where Agent 1 rapidly delegates multiple tasks to the same worker), each Worker MUST maintain a strict isBusy boolean state.

The Orchestrator must intercept delegations and immediately return a rejected ToolResponse to Agent 1 if the target worker is already busy.

9. The Telemetry Paradigm (Terminal Rail HUD):

To maintain "Industrial Clarity" and prevent frontend memory bloat, the UI MUST NOT render raw LLM text streams from background workers.

The Orchestrator broadcasts discrete state changes (Idle, Processing, Error, Lock Counts). The frontend visualizes this state purely through a minimalist "Terminal Rail HUD" (e.g., discrete status pills indicating current activity and active mutex locks).

10. Activity-Based Idle Watchdog Guard (Anti-Freeze Protocol):

To prevent background Workers from freezing the application when they fall into silent loops, the Orchestrator must enforce a programmatic inactivity watchdog.

Instead of a static transaction timer, this watchdog measures *time elapsed since the last sign of life*.

Every time a Worker receives new instructions (`delegateTask`) or successfully executes an MCP tool (`handleMcpToolCall`), the watchdog timer MUST be cleared and reset to 45 seconds.

If a Worker falls into total silence for 45 consecutive seconds without executing any tools or emitting updates, the watchdog triggers the Execution Error pathway (`onTaskComplete(true, "Watchdog Intervention: Agent timed out due to total inactivity")`). This immediately invokes the `try...catch...finally` Git Rollback and forcefully strips the Mutex locks.

11. The Phoenix Protocol (State Auto-Recovery):

When a Worker's session is terminated (e.g., via the Watchdog timeout) and its session reference is nullified, it must not remain permanently locked out of the orchestration pool.

Before the Orchestrator delegates a new task in handleDelegation, it MUST verify if the target worker has a live session.

If the worker is dead/disconnected, the Orchestrator MUST automatically re-initialize the worker's connection (`await targetWorker.initialize(...)`) before proceeding with the delegation. This ensures a self-healing pipeline where workers can respawn from fatal errors.

The Dead Socket Trap: Checking if a session object exists is insufficient because WebSockets can close silently. The actual dispatch sequence (`this.session.sendRealtimeInput`) MUST be wrapped in a strict `try...catch` block. If the socket throws a "CLOSED" error during dispatch, the catch block MUST immediately nullify the session (`this.session = null`) and throw a new error. This guarantees the Orchestrator's `.catch()` block catches the failure, strips the Mutex locks, and arms the worker for a Phoenix respawn on the next delegation attempt.

12. The Live API Model String Inversion Trap:

When utilizing the `@google/genai` Live API, the model string for Workers (W2/W3) MUST be exactly `gemini-2.5-flash`. Faulty, inverted, or hallucinated strings containing `-live` (such as `gemini-2.5-flash-live` or `gemini-live-2.5-flash-preview`) do not exist and will cause the Live API WebSocket to die asynchronously on initialization (throwing a CLOSING/CLOSED error immediately). Always use the exact base model name `gemini-2.5-flash`.