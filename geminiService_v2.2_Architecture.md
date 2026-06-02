# geminiService.ts v2.2 Architecture & Capabilities

This document provides a detailed architectural specification and behavioral guide for the Ouroboros Neural Core (v2.2), as implemented in `services/geminiService.ts` under commit `479daee4cb14b4a13045ca494ce4774e215730cd`.

## Key Architectural Upgrades

### 1. Migrated @google/genai SDK Integration
* **Strict Type Safety**: Migrated entirely from the legacy SDK to the modern `@google/genai` library.
* **Schema Enforcement**: Leverages the official `responseSchema` property in the Gemini configuration to enforce the exact structure of `memoryUpdateSchema` (`text_response`, `updated_memory`, `updated_focus`). This eliminates state schema drift entirely.

### 2. Runtime Neural Integrity Check (Amnesia Shield)
* **Pre/Post Comparison**: In the execution flow, the service tracks the active project counts before sending prompts to the AI model.
* **Abort Guard**: If the model response attempts to save a state where `active_projects` is missing, `core_instructions` is missing, or the number of active projects has decreased (`newCount < currentCount`), the engine throws a fatal exception, preventing the state save and blocking cognitive erosion.

### 3. XML-Tagged Core System Instructions
* The system prompt is cleanly organized using XML-style tags:
  * `<system_role>`: Declares the agent's identity and state dependencies.
  * `<core_protocols>`: Outlines strict laws regarding Drive IDs, Positive Persistence, Zero Truncation, and Atomic Snapshots.
  * `<chain_of_thought_anchoring>`: Mandates a structured reasoning pattern beginning with a specific memory count statement.
  * `<few_shot_examples>`: Directs correct state-to-state transition parsing.
  * `<current_state>`: Context-injects memory, focus, and dynamic project specs.
  * `<tool_definitions>`: Informs the model on how to trigger downstream actions.

### 4. Self-Directed Tool Execution Pattern
* The model can execute tasks by embedding `:::TOOL_REQUEST {"tool": "...", "args": {...}} :::` inside its `text_response`.
* Supported tools within this framework include:
  * `createFile`: Dynamically generates new markdown specs or documents on Google Drive.
  * `findFile`: Searches for Drive files by partial name.
  * `readFile`: Extracts text contents of Google Drive files directly into the execution context.

### 5. Dynamic Spec Context Loading (Lazy-Loading)
* The service parses the user prompt. If a prompt mentions any active project by name (case-insensitive), the system automatically loads its corresponding `detailed_spec_file_id` content from Google Drive and injects it into `<injected_specs>` before execution. This keeps the base system instructions extremely lightweight.
