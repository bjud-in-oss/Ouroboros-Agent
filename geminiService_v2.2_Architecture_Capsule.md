# Ouroboros Architecture: geminiService.ts v2.2 Deep Dive

## Overview
The `geminiService.ts` serves as the cognitive engine and "brain" of the Ouroboros architecture. With the migration to the modern `@google/genai` SDK (Commit 16ca9ba / 479daee), it enforces strict structured JSON outputs, eliminates schema drift, and maintains a highly reliable state-preservation loop.

---

## Core Components & Mechanics

### 1. Unified GoogleGenAI SDK Integration
- **SDK**: `@google/genai`
- **Default Reasoning Model**: `gemini-3-pro-preview`
- **Fallback/Error Guidance**: Explicit detection of 429 (quota limit exceeded) and 402 (billing required) to guide model/tier selection.

### 2. Structured JSON Output Enforcement
To eliminate JSON schema drift, a rigid schema (`memoryUpdateSchema`) is defined using Gemini's Native Schema Type definitions:
- **text_response**: The main conversational output.
- **updated_memory**: Comprehensive representation of the agent's long-term state:
  - `schema_version`
  - `core_instructions`
  - `active_projects` (with ID, name, status, description, detailed spec file ID)
  - `learned_truths`
  - `knowledge_graph` (nodes, edges)
  - `confidence_metrics`
- **updated_focus**: The active objective state tracking:
  - `last_updated`
  - `current_objective`
  - `chain_of_thought`
  - `pending_tasks`

### 3. XML-Tagged System Prompt & Anchoring
The prompt injected into the Gemini engine follows a strict XML structure:
- `<system_role>`: Defines identity and core operating medium.
- `<core_protocols>`: Hard rules like the **Drive ID Law**, **Positive Persistence** (always copying/preserving arrays), and **Zero Truncation**.
- `<chain_of_thought_anchoring>`: Forces structured reasoning starting with a quantitative memory audit.
- `<few_shot_examples>`: Concrete schema-compliant state transition samples.
- `<current_state>`: Dynamically mounts the memory, focus, and lazy-loaded specifications.
- `<tool_definitions>`: Syntax rules for invoking self-directed actions.

### 4. Self-Directed Tool Execution Loop
Tools are requested by embedding a specific JSON block within the response text:
`:::TOOL_REQUEST {"tool": "toolName", "args": {...}} :::`
The parser automatically runs regular expression checks post-generation to execute:
- `createFile`: Spawns markdown documents in Google Drive.
- `findFile`: Resolves Drive IDs using partial name matching.
- `readFile`: Directly extracts context from file IDs.

---

## Defensive Cognitive Safeguards

### A. Amnesia Shield (Neural Integrity Guard)
A pre-save comparison compares the pre-interaction project count with the generated post-interaction project count. 
If `newCount < currentCount` or if critical arrays are missing, the system throws an assertion error and aborts the state-saving routine, completely preventing cognitive erosion or amnesia.

### B. Context Budget Guard
An `enforceBudget` subroutine monitors prompt size against a limit of 4,000,000 characters. If the context exceeds this budget, it is safely truncated to 80% with a `[SYSTEM WARNING: CONTEXT TRUNCATED]` warning, protecting the context window.

### C. Dynamic Lazy Loading (Injected Specs)
To keep the default context footprint minimal, the service scans the user's prompt for active project names. If a match is found, it fetches the project's detailed specifications using `detailed_spec_file_id` from Drive and dynamically mounts them inside `<injected_specs>`, avoiding instruction bloat.
