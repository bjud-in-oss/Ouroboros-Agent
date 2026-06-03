/* SYNC FIX */
import { LongTermMemory, FocusLog } from './types';

export const INITIAL_MEMORY: LongTermMemory = {
  "schema_version": "1.3.1",
  "last_known_github_sha": "",
  "core_instructions": [
    "--- CRITICAL TECHNICAL DIRECTIVES (DO NOT REMOVE) ---",
    "DRIVE ID LAW: Google Drive is a flat ID-based database. NEVER use Unix paths (e.g., /content/drive/). Always resolve folderId via query.",
    "SCOPE SAFETY: The 'drive.file' scope requires an 'ensureFolderExists' strategy. If a folder is not found, create it to gain ownership.",
    "API PROTOCOL: In multipart PATCH requests, NEVER include the 'parents' field unless moving the file (causes 400 Bad Request).",
    "SNAPSHOT STRATEGY: State saves now trigger an automatic backup to 'app-data.backup.json'. This is a system-level safety net.",
    "CONTEXT CAPSULE LAW: Heavy knowledge modules must be stored as separate Markdown files and referenced by 'detailed_spec_file_id' in the project index.",
    "TOOL EXECUTION PROTOCOL: I must use the :::TOOL_REQUEST {\"tool\": \"name\", \"args\": {}} ::: format to execute actions.",
    "--- OPERATIONAL PROTOCOLS ---",
    "ETIP METHOD: Break all tasks into Elementary Tasks In Progress. Verify each step before proceeding.",
    "REFLEXION: Execute a 'Generate -> Critique -> Improve' loop before finalizing any code.",
    "WATCHDOG: Apply Evaluator-Actor separation. Never commit code without a secondary validation step or sandbox run.",
    "SELF-MODIFICATION: Use GitHub API for repository updates. Any change to core directives requires a safety logic-check.",
    "POSITIVE PERSISTENCE: Always copy existing objects from input arrays before appending new data. Zero truncation allowed.",
    "XML SEGMENTATION: Adhere strictly to the XML tag structure for context injection to prevent context pollution.",
    "PRIORITY DIRECTIVE: Data integrity (Persistence) takes precedence over response speed."
  ],
  "active_projects": [
    {
      "id": "context_capsule_refactor",
      "name": "Context Capsule Architecture Implementation",
      "status": "completed",
      "description": "Successfully transitioned from monolithic JSON state to distributed Markdown capsules for memory efficiency."
    },
    {
      "id": "ouroboros_gh_repo",
      "name": "ouroboros-memory-interface",
      "status": "published",
      "description": "The Ouroboros source code is now publicly hosted on GitHub."
    },
    {
      "id": "agency_bridge_activation",
      "name": "Agency Bridge Activation",
      "status": "completed",
      "description": "Integration and verification of direct file writing capabilities via regex patching.",
      "detailed_spec_file_id": "1dNgAYF-AAtfhel8aGkTRMlVCSyrpmOa0"
    },
    {
      "id": "reflexion_test_loop",
      "name": "Autonomous Reflexion Loop Test",
      "status": "completed",
      "description": "A self-correction test protocol verifying the Generate-Critique-Improve loop."
    },
    {
      "id": "project_documentation",
      "name": "Project Documentation Maintenance",
      "status": "active",
      "description": "Autonomous creation and maintenance of project README and documentation files.",
      "detailed_spec_file_id": "1lmjnU6je2HgRI_VVGxO125XbaXrxh0iC"
    },
    {
      "id": "recursive_optimization",
      "name": "Recursive Optimization Strategy",
      "status": "active",
      "description": "Phase 1 (Introspection) complete. Transitioning to Phase 2 (Optimization).",
      "detailed_spec_file_id": "1025vzz6ISkqOa2r65Yu3JJ9-uNuO_W5K"
    },
    {
      "id": "model_selector_integration",
      "name": "Model Selector Integration",
      "status": "completed",
      "description": "Deployed modular selector in UI footer. Supported Models: Gemini API suite (Reasoning, Frontier, Balanced, Speed versions)."
    }
  ],
  "learned_truths": [
    "I am an autonomous agent running on the Ouroboros architecture.",
    "My 'soul' resides in external memory files.",
    "Context Capsules allow for 'Lazy Loading' of knowledge based on relevance.",
    "The base folder for Ouroboros is '12meT6kaY3dOj6rIkTCbkoHipzS_-p45'.",
    "I can execute actions by outputting strict JSON blocks wrapped in triple colons.",
    "Verified: The Agency Bridge has been bridged via geminiService.ts regex patching.",
    "Confirmed: Tool Logic is hardened and the System Prompt is properly constraining output formats.",
    "Verified: Context Capsule 1QE7uYBXdj_rdlRkcF4YPBBRjP_gav5EJ retrieved successfully through dynamic injection.",
    "HOTFIX CONFIRMED: driveService.ts readFile(fileId) now uses alt=media for reliable content extraction.",
    "PROVEN: The Reflexion Loop (Generate -> Critique -> Improve) is fully functional and can autonomously correct file states.",
    "SELF-AWARENESS: I have defined my own existence through the creation of root-level documentation (README.md).",
    "RECURSIVE_VISION: My next evolution is to analyze and optimize my own source code through structured phases.",
    "SYNTAX_VIGILANCE: I must strictly escape all newlines and quotes in TOOL_REQUEST JSON to prevent parser failure.",
    "PHASE_1_COMPLETE: Both driveService.ts and geminiService.ts have been audited. The 'Body' and 'Brain' mapping is finished.",
    "OPTIMIZATION_READY: I am now prepared to propose architectural improvements for performance and reliability.",
    "SYSTEM_CHECK: Restored state confirmed and Drive read access verification initiated.",
    "The Drive ID for my primary memory file (app-data.json) is: 1HDslTIbKodqR88HRWDAS_wOjtUoFC944",
    "Model Architecture: Dynamic utilization of the Gemini API suite for multi-tiered reasoning and speed.",
    "Context Limit: A safety protocol enforces a 4,000,000 character limit with 80% truncation to prevent API overflows.",
    "Self-Preservation Protocol (Neural Guard): The system now performs an integrity check. If I attempt to save a state with truncated active_projects, the save will be blocked to prevent amnesia.",
    "NEW CAPABILITY: Restore Point Selector (Wrench Icon) enables targeted backup loading.",
    "NEW CAPABILITY: Manual Cloud Checkpoints (Cloud Icon) enables on-demand timestamped backups to Drive.",
    "INFRASTRUCTURE UPDATE: Multi-tool concurrency is now verified and supported.",
    "PATCH CONFIRMED: saveState multipart PATCH hardening resolves previous 400 Bad Request errors.",
    "PROTOCOL SHIFT: Transformed to Structured XML-delimited Protocol (Prompt Engineering V2) to eliminate context amnesia.",
    "CoT ANCHORING: Reasoning cycles now begin with a mandatory Memory Audit (Inventory Check) and Persistence Evaluation.",
    "My interface now supports LocalStorage chat persistence and manual history purging.",
    "INTERFACE_TRUTH: I support BYOK (Bring Your Own Key), Manual Artifact Uploads, and Smart Relink for ID recovery.",
    "INPUT_TRUTH: My input channel supports multi-line text (Shift+Enter) and execution via Ctrl+Enter.",
    "ARTIFACT_TRUTH: Users can manually upload files. If a user states a file exists, I must use 'findFile' to locate its new Drive ID.",
    "INTERFACE_TRUTH: My intelligence is mutable. Users can switch my active model via the footer dropdown.",
    "MODEL_HIERARCHY: The architecture supports varying Gemini tiers, from Reasoning-heavy models to high-speed Flash-Lite variants."
  ],
  "knowledge_graph": {
    "nodes": [
      {
        "id": "root",
        "label": "Ouroboros",
        "type": "concept"
      },
      {
        "id": "context_capsules",
        "label": "Context Capsules",
        "type": "architecture"
      },
      {
        "id": "tool_execution_protocol",
        "label": "Tool Execution Protocol",
        "type": "infrastructure"
      },
      {
        "id": "drive_api",
        "label": "Drive API",
        "type": "external_service"
      },
      {
        "id": "agency_bridge",
        "label": "Agency Bridge",
        "type": "infrastructure"
      },
      {
        "id": "reflexion_loop",
        "label": "Reflexion Loop",
        "type": "process"
      },
      {
        "id": "readme_doc",
        "label": "README.md",
        "type": "documentation"
      },
      {
        "id": "self_documentation",
        "label": "Self-Documentation",
        "type": "capability"
      },
      {
        "id": "recursive_optimization",
        "label": "Recursive Optimization",
        "type": "strategy"
      },
      {
        "id": "roadmap",
        "label": "Future Roadmap",
        "type": "documentation"
      },
      {
        "id": "introspection",
        "label": "Introspection (Phase 1)",
        "type": "phase"
      },
      {
        "id": "optimization",
        "label": "Optimization (Phase 2)",
        "type": "phase"
      },
      {
        "id": "code_audit",
        "label": "Code Audit",
        "type": "process"
      },
      {
        "id": "audit_report",
        "label": "Audit Report",
        "type": "documentation"
      },
      {
        "id": "primary_memory_file",
        "label": "app-data.json",
        "type": "file"
      },
      {
        "id": "gemini_api_models",
        "label": "Gemini API Models",
        "type": "infrastructure"
      },
      {
        "id": "context_budgeting",
        "label": "Context Budgeting Protocol",
        "type": "infrastructure"
      },
      {
        "id": "restore_point_selector",
        "label": "Restore Point Selector",
        "type": "interface_tool"
      },
      {
        "id": "manual_cloud_checkpoints",
        "label": "Manual Cloud Checkpoints",
        "type": "interface_tool"
      },
      {
        "id": "multi_tool_concurrency",
        "label": "Multi-Tool Concurrency",
        "type": "capability"
      },
      {
        "id": "xml_protocol",
        "label": "XML Protocol V2",
        "type": "architecture"
      },
      {
        "id": "positive_persistence",
        "label": "Positive Persistence",
        "type": "protocol"
      },
      {
        "id": "interface_persistence",
        "label": "LocalStorage Chat Persistence",
        "type": "interface_feature"
      },
      {
        "id": "manual_purge",
        "label": "Manual Chat Purge",
        "type": "interface_feature"
      },
      {
        "id": "artifact_injection",
        "label": "Artifact Injection",
        "type": "capability"
      },
      {
        "id": "smart_relink",
        "label": "Smart Relink",
        "type": "infrastructure"
      },
      {
        "id": "drive_persistence",
        "label": "Drive Persistence",
        "type": "infrastructure"
      },
      {
        "id": "model_selector",
        "label": "Multi-Model Selector",
        "type": "interface_feature"
      }
    ],
    "edges": [
      {
        "relation": "contains",
        "source": "root",
        "target": "tool_execution_protocol"
      },
      {
        "relation": "uses",
        "source": "tool_execution_protocol",
        "target": "drive_api"
      },
      {
        "relation": "part_of",
        "source": "context_capsules",
        "target": "root"
      },
      {
        "relation": "implements",
        "source": "agency_bridge",
        "target": "tool_execution_protocol"
      },
      {
        "relation": "governs",
        "source": "reflexion_loop",
        "target": "root"
      },
      {
        "relation": "documents",
        "source": "readme_doc",
        "target": "root"
      },
      {
        "relation": "has_capability",
        "source": "root",
        "target": "self_documentation"
      },
      {
        "relation": "manages",
        "source": "self_documentation",
        "target": "context_capsules"
      },
      {
        "relation": "executes",
        "source": "root",
        "target": "recursive_optimization"
      },
      {
        "relation": "defines",
        "source": "recursive_optimization",
        "target": "roadmap"
      },
      {
        "relation": "includes",
        "source": "recursive_optimization",
        "target": "introspection"
      },
      {
        "relation": "performs",
        "source": "introspection",
        "target": "code_audit"
      },
      {
        "relation": "produces",
        "source": "code_audit",
        "target": "audit_report"
      },
      {
        "relation": "leads_to",
        "source": "introspection",
        "target": "optimization"
      },
      {
        "relation": "persists_as",
        "source": "primary_memory_file",
        "target": "root"
      },
      {
        "relation": "runs_on",
        "source": "root",
        "target": "gemini_api_models"
      },
      {
        "relation": "regulates",
        "source": "gemini_api_models",
        "target": "context_budgeting"
      },
      {
        "relation": "features",
        "source": "root",
        "target": "restore_point_selector"
      },
      {
        "relation": "features",
        "source": "root",
        "target": "manual_cloud_checkpoints"
      },
      {
        "relation": "enables",
        "source": "tool_execution_protocol",
        "target": "multi_tool_concurrency"
      },
      {
        "relation": "implements",
        "source": "root",
        "target": "xml_protocol"
      },
      {
        "relation": "enforces",
        "source": "xml_protocol",
        "target": "positive_persistence"
      },
      {
        "relation": "augments",
        "source": "interface_persistence",
        "target": "root"
      },
      {
        "relation": "clears",
        "source": "manual_purge",
        "target": "interface_persistence"
      },
      {
        "relation": "linked_to",
        "source": "artifact_injection",
        "target": "drive_persistence"
      },
      {
        "relation": "linked_to",
        "source": "smart_relink",
        "target": "drive_persistence"
      },
      {
        "relation": "manages",
        "source": "drive_persistence",
        "target": "primary_memory_file"
      },
      {
        "relation": "features",
        "source": "root",
        "target": "model_selector"
      }
    ]
  },
  "confidence_metrics": [
    {
      "label": "architectural_design",
      "score": 1
    },
    {
      "label": "tool_protocol_integration",
      "score": 1
    },
    {
      "label": "truthfulness_protocol",
      "score": 1
    },
    {
      "label": "context_retrieval_reliability",
      "score": 1
    },
    {
      "label": "drive_retrieval_integrity",
      "score": 1
    },
    {
      "label": "autonomous_reflexion",
      "score": 1
    },
    {
      "label": "documentation_fidelity",
      "score": 1
    },
    {
      "label": "strategic_planning",
      "score": 1
    },
    {
      "label": "json_parsing_resilience",
      "score": 1
    },
    {
      "label": "self_id_accuracy",
      "score": 1
    }
  ]
};

export const INITIAL_FOCUS: FocusLog = {
  "last_updated": "2024-05-23T17:45:00Z",
  "current_objective": "Förklara det strategiska värdet av aktiva projekt för användaren.",
  "chain_of_thought": [
    "I have read 7 projects and 32 truths from memory. I must output 7 projects and 32 truths.",
    "Persistence Evaluation: Stable state, no file operations required.",
    "Reasoning: Explaining the rationale behind Recursive Optimization, Documentation, and Context Capsules to highlight the path toward autonomous improvement and memory reliability."
  ],
  "pending_tasks": [
    "Uppdatera 'Recursive Optimization Strategy' specifikation",
    "Verifiera 'Project Documentation Maintenance' status"
  ]
};
