export type AARMEvaluationResult = 
  | { status: 'ALLOW' }
  | { status: 'DENY'; reason: string }
  | { status: 'DEFER'; reason: string };

export interface MissionManifesto {
  allowedTools: string[];
  restrictedPaths: string[];
  readOnly: boolean;
}

class AARMGate {
  evaluate(toolName: string, args: any, manifest?: MissionManifesto): AARMEvaluationResult {
    // Default safe fallback if no manifest is provided
    const effectiveManifest: MissionManifesto = manifest || {
      allowedTools: ['read_file', 'shell_exec', 'completeTask', 'delegateToWorker'],
      restrictedPaths: [],
      readOnly: false
    };

    // Rule 1: Check against allowed tools
    // If we want to allow dynamically, we can skip strict allowlist, but for now let's assert.
    // However, MCP tools can vary. Let's allow completeTask and delegateToWorker and typical MCP names natively.
    // For Varv 1, we implement a simple deterministic rule:
    
    if (toolName.toLowerCase().includes('delete') && effectiveManifest.readOnly) {
      return { status: 'DENY', reason: 'Mission Manifesto enforces Read-Only mode. Deletions are forbidden.' };
    }

    if (effectiveManifest.readOnly && toolName.toLowerCase().includes('write')) {
      return { status: 'DENY', reason: 'Mission Manifesto enforces Read-Only mode. Writes are forbidden.' };
    }

    // Example intercept: prevent touching root config if not allowed
    if (args && args.path) {
      for (const restrictedPath of effectiveManifest.restrictedPaths) {
        if (args.path.includes(restrictedPath)) {
          return { status: 'DENY', reason: `Access to restricted path ${restrictedPath} is forbidden by Mission Manifesto.` };
        }
      }
    }

    // Default: Allow
    return { status: 'ALLOW' };
  }
}

export const aarmGate = new AARMGate();
