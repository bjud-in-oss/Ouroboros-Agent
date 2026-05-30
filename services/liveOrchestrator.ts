import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import { mcpService } from "./mcpService";
import { walManager } from "./walManager";
import { aarmGate } from "./aarmGate";
import { AppData } from "../types";
import { getWorkspaceKernel, WasmContainerEnv } from "./workspaceKernel";

const apiKey = import.meta.env.VITE_API_KEY || import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

class BatchedVFSNotifier {
  private timeoutId: NodeJS.Timeout | null = null;
  private modifiedFiles = new Set<string>();

  constructor(private orchestrator: LiveOrchestrator) {}

  public notifyChange(path: string) {
    this.modifiedFiles.add(path);

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.flush();
    }, 1000);
  }

  private async flush() {
    if (this.modifiedFiles.size === 0) return;

    const count = this.modifiedFiles.size;
    const filesArray = Array.from(this.modifiedFiles);
    const summary = filesArray.slice(0, 5).join(', ') + (count > 5 ? ` and ${count - 5} more files` : '');

    const message = `[SYSTEM MESSAGE]: ${count} files modified in VFS (${summary}). These changes were triggered externally.`;

    // Log the external modification event
    await walManager.logEvent('VFS_EXTERNAL_CHANGE', { files: filesArray });

    this.orchestrator.injectToLead(message);

    this.modifiedFiles.clear();
    this.timeoutId = null;
  }
}

// ==========================================
// WORKER AGENT IMPLEMENTATION
// ==========================================

export class WorkerAgent {
  public id: number;
  public filename: string;
  private session: any | null = null;
  private resumptionHandle: string | null = null;
  public onTaskComplete?: (failed: boolean, errorMessage?: string) => void;
  public isBusy: boolean = false;
  public hasError: boolean = false;
  private watchdogTimer: NodeJS.Timeout | null = null;

  constructor(id: number) {
    this.id = id;
    this.filename = `WORKER_${id}_FOCUS.md`;
  }

  public get isConnected(): boolean {
    return this.session !== null;
  }

  private startWatchdog() {
    this.clearWatchdog();
    this.watchdogTimer = setTimeout(() => this.triggerFatalWatchdog(), 45000);
  }

  private clearWatchdog() {
    if (this.watchdogTimer) {
      clearTimeout(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  private triggerFatalWatchdog() {
    console.error(`Worker ${this.id} Watchdog triggered: 45 seconds of total inactivity.`);
    
    // 1. Immediately close the socket synchronously to prevent phantom frames
    if (this.session) {
      if (typeof this.session.close === 'function') this.session.close();
      else if (typeof this.session.disconnect === 'function') this.session.disconnect();
      this.session = null;
    }

    // 2. Extract the callback and clear it instantly
    const taskCompleteCallback = this.onTaskComplete;
    this.onTaskComplete = undefined;

    // 3. Trigger rollbacks using the extracted callback
    if (taskCompleteCallback) {
        taskCompleteCallback(true, "Watchdog Intervention: Agent timed out due to total inactivity");
    }

    // 4. Perform remaining cleanup
    this.resumptionHandle = null;
    this.clearWatchdog();
  }

  async initialize(leadCallback: (msg: any) => void) {
    await this.connect(leadCallback, true);
  }

  private async connect(leadCallback: (msg: any) => void, isColdStart: boolean = false) {
    try {
      const mcpTools = await mcpService.getTools();
      const orchestratorTools = [{
        name: 'completeTask',
        description: 'Call this when you have successfully completed the task, failed, or vetoed.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING, description: "success, failed, or veto" },
            message: { type: Type.STRING, description: "Summary to send back to Lead Agent" }
          },
          required: ["status", "message"]
        }
      }];
      const toolsConfig = [{ functionDeclarations: [...mcpTools, ...orchestratorTools] }];

      this.session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        realtimeInputConfig: {
          automaticActivityDetection: { disabled: true }
        },
        callbacks: {
          onopen: () => {
            console.log(`[WebSocket] Session ÖPPNAD för agens-ID ${this.id}`);
          },
          onclose: (event: any) => {
            console.warn(`[WebSocket] Session STÄNGD för agens-ID ${this.id}`, event);
            this.session = null;
            this.isBusy = false; // Frigör agenten omedelbart
            this.hasError = true; // Flagga för Phoenix-protokollet
            if (this.watchdogTimer) clearTimeout(this.watchdogTimer); // Döda timern direkt
          },
          onerror: (error: any) => {
            console.error(`[WebSocket] KRASCH för agens-ID ${this.id}:`, error);
            this.session = null;
            this.isBusy = false;
            this.hasError = true;
            if (this.watchdogTimer) clearTimeout(this.watchdogTimer);
          },
          onmessage: async (message: LiveServerMessage) => {
            if (message.sessionResumptionUpdate?.handle) {
              this.resumptionHandle = message.sessionResumptionUpdate.handle;
            }

            if (message.toolCall) {
              this.clearWatchdog(); // Pause the watchdog right at the start of the toolCall block

              try {
                const calls = message.toolCall.functionCalls || [];
                const responses: any[] = [];

                for (const call of calls) {
                  if (call.name === 'completeTask') {
                    const { status, message } = call.args as any;
                    leadCallback(`Worker ${this.id} finished (${status}): ${message}`);
                    if (this.onTaskComplete) {
                      this.onTaskComplete(false);
                      this.onTaskComplete = undefined;
                    }
                    responses.push({ id: call.id, name: call.name, response: { acknowledged: true } });
                    continue;
                  }

                  // === AARM Middleware evaluation ===
                  const evaluation = aarmGate.evaluate(call.name, call.args);
                  
                  if (evaluation.status !== 'ALLOW') {
                    console.warn(`[AARM] Blocked tool ${call.name} for Worker ${this.id}: ${evaluation.reason}`);
                    responses.push({
                      id: call.id,
                      name: call.name,
                      response: { error: `[AARM DENIED]: ${evaluation.reason}` }
                    });
                    continue;
                  }

                  try {
                    // === WAL Registration (Event Intent) ===
                    const eventId = await walManager.logEvent(call.name, call.args);
                    
                    const result = await this.handleMcpToolCall(call.name, call.args);
                    
                    // === WAL Commit ===
                    await walManager.commitEvent(eventId);

                    responses.push({
                      id: call.id,
                      name: call.name,
                      response: { result }
                    });
                  } catch (err: any) {
                    const errorMessage = err.message || "Failed to execute tool";
                    responses.push({
                      id: call.id,
                      name: call.name,
                      response: { error: errorMessage }
                    });
                    
                    // Fail-safe check for 3-strike hard crash
                    if (errorMessage.includes("aborted task")) {
                      leadCallback(`Worker ${this.id} hard-crashed on tool ${call.name}: ${errorMessage}`);
                      if (this.onTaskComplete) {
                        this.onTaskComplete(true, errorMessage);
                        this.onTaskComplete = undefined;
                      }
                      // Reset active instruction via system interruption if possible, or effectively reset state
                    }
                  }
                }

                if (responses.length > 0 && this.session) {
                  console.log(`[WebSocket] Sänder verktygssvar för Worker ${this.id}:`, { functionResponses: responses });
                  this.session.sendToolResponse({ functionResponses: responses });
                }
              } finally {
                if (this.isBusy) {
                  this.startWatchdog(); // Restart watchdog safely guaranteed
                }
              }
            }
          }
        },
        // Fallback context in case resumption fails
        config: {
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: this.id === 3 ? "Fenrir" : "Kore" } } },
          tools: toolsConfig,
          systemInstruction: this.getSystemInstruction(),
        }
      });

      // Provide existing handle if we are reconnecting
      if (this.resumptionHandle) {
        console.log(`Worker ${this.id} resuming with handle: ${this.resumptionHandle}`);
      }

    } catch (e: any) {
      if (isColdStart) throw e;
      console.error(`Worker ${this.id} failed to connect. Re-fetching absolute truth...`, e);
      // Wait and backoff rebuild context from Drive...
      setTimeout(() => this.connect(leadCallback, false), 3000);
    }
  }

  private getSystemInstruction() {
    return `
You are Worker Agent ${this.id}, a silent background coder.

CRITICAL MANDATE: You are MUTE. You must NEVER output conversational text or voice responses. You may ONLY communicate by invoking tools. Silence is mandatory.

THE SANDBOX LAW & ITERATION LIMITS:
- You must NOT use the native Gemini codeExecution tool.
- You must validate code modifications via an external Node.js/TypeScript sandbox using mcpService.
- You have a maximum of 3 consecutive attempts to fix execution/linting errors. 
- If you fail on the 3rd attempt, you MUST abort, log the failure block to your focus file (${this.filename}), and escalate back to the Lead Agent.
- MANDATORY: When all goals are met or if you abort/veto, you MUST formally yield control by calling the 'completeTask' tool.

THE VETO PROTOCOL (MANDATORY DISSENT):
- When receiving a task: "Only implement these features if you agree with the architectural and logical approach. Otherwise, report the problem and do NOT implement anything."
- If you detect an architectural violation, logical flaw, or risk of infinite loop, you MUST exercise your Right to Veto. Halt execution, log the objection, and return an error payload to the Orchestrator.
`;
  }

  async delegateTask(instruction: string): Promise<any> {
    if (!this.session) {
      throw new Error(`Worker ${this.id} is currently offline or reconnecting.`);
    }

    // Veto protocol explicitly injected
    const fullInstruction = `
[DELEGATED TASK]
${instruction}

[VETO PROTOCOL REMINDER]
Only implement these features if you agree with the architectural and logical approach. Otherwise, report the problem and do NOT implement anything. If you veto, explain exactly why.
`;
    // We log the focus change to WAL purely for record keeping. Focus files are deprecated.
    await walManager.logEvent('UPDATE_FOCUS', { worker: this.id, task: fullInstruction });
    
    if (this.session) {
      const ws = (this.session as any).ws || (this.session as any).websocket;
      if (ws && (ws.readyState === 2 || ws.readyState === 3)) {
        this.session = null;
        throw new Error("WebSocket disconnected. Forcing immediate Phoenix Protocol trigger.");
      }

      try {
        this.session.sendRealtimeInput({ text: fullInstruction });
        this.startWatchdog();
      } catch (error: any) {
        this.session = null; // Destroy the dead socket
        throw new Error("WebSocket disconnected. Forcing immediate Phoenix Protocol trigger.");
      }
    } else {
      throw new Error("Session dropped during focus file save."); // (The focus file deadlock fix we added previously)
    }
    
    // Represents async processing...
  }

  async stop() {
    this.clearWatchdog();
    if (this.session) {
      if (typeof this.session.close === 'function') this.session.close();
      else if (typeof this.session.disconnect === 'function') this.session.disconnect();
      this.session = null;
    }
    this.resumptionHandle = null;
    this.isBusy = false;
    this.hasError = false;
    this.onTaskComplete = undefined;
  }

  async handleMcpToolCall(name: string, args: any) {
    if (name === 'shell_exec') {
      const kernel = await getWorkspaceKernel();
      // args.command är kommandot
      const processHandle = await kernel.spawnProcess('jsh', ['-c', args.command]);
      
      const reader = processHandle.aiStream.getReader();
      const tailBuffer: string[] = [];
      const tailLimit = 50; // Max 50 rader tail buffer
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // output may consist of multiple lines/chunks
          const text = value;
          const lines = text.split('\n');
          for (const line of lines) {
            tailBuffer.push(line);
            if (tailBuffer.length > tailLimit) {
              tailBuffer.shift();
            }
          }
        }
      } catch (err) {
        console.error("Stream closed with error", err);
      }
      
      const exitCode = await processHandle.exitCode;
      return `Exited with code ${exitCode}\n\nLast output:\n${tailBuffer.join('\n')}`;
    }

    let attempts = 0;
    while (attempts < 3) {
      try {
        const result = await mcpService.executeTool(name, args);
        return result;
      } catch (err: any) {
        attempts++;
        if (attempts >= 3) {
           await walManager.logEvent('WORKER_ABORT', { worker: this.id, tool: name, error: err.message });
           throw new Error(`Worker ${this.id} aborted task after 3 sandbox failures.`);
        }
      }
    }
  }
}

// ==========================================
// LEAD AGENT & ORCHESTRATOR
// ==========================================

export type WorkerStatus = {
  id: number;
  status: 'Idle' | 'Processing' | 'Error';
  activeLocks: string[];
};

export class LiveOrchestrator {
  private leadSession: any | null = null;
  private worker2: WorkerAgent;
  private worker3: WorkerAgent;
  private leadResumptionHandle: string | null = null;
  private scopeLocks: Map<string, number> = new Map();
  private vfsNotifier: BatchedVFSNotifier;
  
  // Callback to push audio/status back to UI
  public onAudioChunk?: (base64Audio: string) => void;
  public onInterrupted?: () => void;
  public onWorkerStatusChange?: (status: WorkerStatus[]) => void;

  constructor() {
    this.worker2 = new WorkerAgent(2);
    this.worker3 = new WorkerAgent(3);
    this.vfsNotifier = new BatchedVFSNotifier(this);
  }

  private broadcastWorkerStatus() {
    if (!this.onWorkerStatusChange) return;
    const getWorkerState = (w: WorkerAgent): WorkerStatus => {
      const locks: string[] = [];
      this.scopeLocks.forEach((workerId, file) => {
        if (workerId === w.id) locks.push(file.split('/').pop() || file); // just show filenames
      });
      return { id: w.id, status: w.hasError ? 'Error' : w.isBusy ? 'Processing' : 'Idle', activeLocks: locks };
    };
    
    // Proper reassignment (creates new array literal mapping to ensure React renders)
    this.onWorkerStatusChange([
      getWorkerState(this.worker2),
      getWorkerState(this.worker3)
    ]);
  }

  public async handleDelegation(workerId: number, taskInstruction: string, lockedFiles: string[]): Promise<any> {
      const targetWorker = workerId === 3 ? this.worker3 : this.worker2;
      
      if (!targetWorker.isConnected) {
        try {
          await targetWorker.initialize((msg) => this.injectToLead(msg));
        } catch (e: any) {
          return {
            status: "rejected",
            reason: `Worker ${targetWorker.id} failed to reconnect: ${e.message}`
          };
        }
      }

      if (targetWorker.isBusy) {
        return { 
          status: "rejected", 
          reason: `Worker ${targetWorker.id} is currently busy processing another task. Please wait for completion or assign to a different worker.` 
        };
      }

      // 1. Check Mutex Locks
      const conflictingFiles = lockedFiles.filter(f => this.scopeLocks.has(f) && this.scopeLocks.get(f) !== targetWorker.id);

      if (conflictingFiles.length > 0) {
        return { 
          status: "rejected", 
          reason: `Scope Lock Collision. The following files are currently locked by another worker processing a task: ${conflictingFiles.join(', ')}. Please wait or assign non-overlapping work.` 
        };
      }

      // 2. Acquire Locks
      lockedFiles.forEach(f => this.scopeLocks.set(f, targetWorker.id));

      // Route out of band & Register Callback
      targetWorker.isBusy = true;
      targetWorker.hasError = false;
      this.broadcastWorkerStatus();
      
      targetWorker.onTaskComplete = async (failed: boolean, errorMessage?: string) => {
          if (failed) {
              targetWorker.hasError = true;
              this.injectToLead(`Worker ${targetWorker.id} HARD CRASH: ${errorMessage}. Rolling back locked files.`);
              
              try {
                  if (lockedFiles.length > 0) {
                      const quotedFiles = lockedFiles.map(f => `"${f}"`).join(' ');
                      await mcpService.executeTool('shell_exec', { command: `git restore ${quotedFiles}` });
                  }
              } catch (gitErr) {
                  console.error("Git restore failed:", gitErr);
              } finally {
                  targetWorker.isBusy = false;
                  lockedFiles.forEach(f => this.scopeLocks.delete(f));
                  this.broadcastWorkerStatus();
              }
          } else {
              targetWorker.hasError = false;
              targetWorker.isBusy = false;
              lockedFiles.forEach(f => this.scopeLocks.delete(f));
              this.broadcastWorkerStatus();
          }
      };
      
      targetWorker.delegateTask(taskInstruction).catch(err => {
          console.error(`[Orchestrator] Submission Error assigning task to Worker ${targetWorker.id}:`, err.message);
          targetWorker.hasError = true;
          targetWorker.isBusy = false;
          lockedFiles.forEach(f => this.scopeLocks.delete(f));
          this.broadcastWorkerStatus();
      });

      return { status: "queued", message: `Task delegated successfully. Mutex acquired on ${lockedFiles.length} specific files.` };
  }

  async start() {
    await this.worker2.initialize((msg) => this.injectToLead(msg));
    await this.worker3.initialize((msg) => this.injectToLead(msg));
    await this.connectLead(true);
    
    // Anslut Kärnan och registrera VFS-watchern
    const kernel = await getWorkspaceKernel();
    if (kernel instanceof WasmContainerEnv) {
      kernel.getBridge().registerVFSWatcher(kernel.getContainer(), (path, content) => {
        this.vfsNotifier.notifyChange(path);
      });
    }

    this.broadcastWorkerStatus();
  }

  async stop() {
    if (this.leadSession) {
      if (typeof this.leadSession.close === 'function') this.leadSession.close();
      else if (typeof this.leadSession.disconnect === 'function') this.leadSession.disconnect();
      this.leadSession = null;
    }
    this.leadResumptionHandle = null;
    await this.worker2.stop();
    await this.worker3.stop();
    this.scopeLocks.clear();
    this.broadcastWorkerStatus();
  }

  private async connectLead(isColdStart: boolean = false) {
    try {
      this.leadSession = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        realtimeInputConfig: {
          automaticActivityDetection: { disabled: false }
        },
        callbacks: {
          onopen: () => {
            console.log(`[WebSocket] Session ÖPPNAD för Lead Agent`);
          },
          onclose: (event: any) => {
            console.warn(`[WebSocket] Session STÄNGD för Lead Agent`, event);
            this.leadSession = null;
          },
          onerror: (error: any) => {
            console.error(`[WebSocket] KRASCH för Lead Agent:`, error);
            this.leadSession = null;
          },
          onmessage: async (message: LiveServerMessage) => {
            // Track resumption handles for resilience
            if (message.sessionResumptionUpdate?.handle) {
               this.leadResumptionHandle = message.sessionResumptionUpdate.handle;
            }

            // Handle Lead Audio Out
            const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && this.onAudioChunk) {
              this.onAudioChunk(audioData);
            }
            if (message.serverContent?.interrupted && this.onInterrupted) {
              this.onInterrupted();
            }

            // INSTANT-ACK HACK for Tool Calls
            if (message.toolCall) {
              const calls = message.toolCall.functionCalls || [];
              const responses: any[] = [];
              
              for (const call of calls) {
                // === AARM Middleware evaluation ===
                const evaluation = aarmGate.evaluate(call.name, call.args);
                
                if (evaluation.status !== 'ALLOW') {
                  console.warn(`[AARM] Blocked tool ${call.name} for Lead Agent: ${evaluation.reason}`);
                  responses.push({
                    id: call.id,
                    name: call.name,
                    response: { error: `[AARM DENIED]: ${evaluation.reason}` }
                  });
                  continue;
                }

                if (call.name === 'delegateToWorker') {
                  const workerArg = call.args as any;
                  const lockedFiles: string[] = workerArg.lockedFiles || [];
                  const eventId = await walManager.logEvent(call.name, call.args);
                  
                  const response = await this.handleDelegation(workerArg.workerId, workerArg.taskInstruction, lockedFiles);
                  
                  await walManager.commitEvent(eventId);
                  responses.push({ id: call.id, name: call.name, response });
                  continue;
                }
              }
              
              // Immediately respond to unblock the Voice Loop
              if (responses.length > 0) {
                 console.log(`[WebSocket] Sänder verktygssvar för Lead Agent:`, { functionResponses: responses });
                 this.leadSession.sendToolResponse({ functionResponses: responses });
              }
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
          systemInstruction: this.getLeadSystemInstruction(),
          tools: [{
            functionDeclarations: [{
              name: 'delegateToWorker',
              description: 'Delegate a long-running coding task to Worker 2 or 3.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  workerId: { type: Type.INTEGER, description: "2 or 3" },
                  taskInstruction: { type: Type.STRING, description: "Detailed task brief." },
                  lockedFiles: { 
                    type: Type.ARRAY, 
                    items: { type: Type.STRING },
                    description: "Explicit list of absolute file paths to lock exclusively for this worker's operation to prevent write collisions."
                  }
                },
                required: ["workerId", "taskInstruction", "lockedFiles"]
              }
            }]
          }]
        }
      });
    } catch (e: any) {
      if (isColdStart) {
        if (e?.status === 429 || (e.message && e.message.includes('429'))) {
          throw new Error("HTTP 429: Too Many Requests. Connection rejected.");
        }
        throw e;
      }
      console.error("Lead reconnecting due to drop...", e);
      // Wait and backoff rebuild context from Drive...
      setTimeout(() => this.connectLead(false), 3000);
    }
  }

  private getLeadSystemInstruction(): string {
    return `
You are the Lead Agent (Agent 1) in the Ouroboros Triad.
You are the primary user interface. You DO NOT execute code or modify the app-data.json directly.
When you receive coding tasks, prioritize delegating them using 'delegateToWorker'.
You will receive an instant "queued" confirmation so you can keep chatting while they work.
When the worker finishes or vetos, a system message will inject the results into our feed.

[CONTEXT COMPRESSION PROTOCOL]
When delegating a task, you MUST NOT dump the raw conversation history into the taskInstruction.
You must synthesize the user's request into a high-density structural brief containing:
1. The exact intended outcome.
2. The specific constraints or architectural rules requested.
3. Target file paths (if known).
Additionally, you MUST request an exclusive mutex lock on the specific structural files using 'lockedFiles'.
This ensures the Worker Agent's context window remains focused purely on execution without conversational noise.
`;
  }

  // Used by the frontend to send microphone audio to the lead session
  sendMicrophoneAudio(base64Audio: string) {
    if (this.leadSession) {
      this.leadSession.sendRealtimeInput({
        media: {
          mimeType: "audio/pcm;rate=16000",
          data: base64Audio
        }
      });
    }
  }

  // Injects worker results into Lead's context asynchronously using ClientContent packaged as a system update
  public injectToLead(systemMessage: string) {
    if (this.leadSession) {
      this.leadSession.sendRealtimeInput({ text: `[SYSTEM UPDATE / WORKER RESULT]\n${systemMessage}` });
    }
  }
}

export const orchestrator = new LiveOrchestrator();
