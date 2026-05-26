import { GoogleGenAI, Modality, Type, FunctionDeclaration, LiveServerMessage } from "@google/genai";
import { mcpService } from "./mcpService";
import { saveState, ensureFolderExists, createFile, readFile } from "./driveService";
import { AppData } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// ==========================================
// THE MANAGER QUEUE & LOCK SYSTEM
// ==========================================

class StateManager {
  private isSaving = false;
  private queue: Array<() => Promise<void>> = [];

  async enqueueSave(operation: () => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          await operation();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isSaving || this.queue.length === 0) return;
    this.isSaving = true;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error("Queue task failed:", err);
      }
    }
    this.isSaving = false;
    this.processQueue();
  }
}

const stateManager = new StateManager();

// ==========================================
// EXPONENTIAL BACKOFF FOR DRIVE APIS
// ==========================================

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

async function executeWithBackoff<T>(operation: () => Promise<T>): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await operation();
    } catch (error: any) {
      const status = error?.status || error?.response?.status;
      if (status === 429 && retries < MAX_RETRIES) {
        retries++;
        const delay = BASE_DELAY_MS * Math.pow(2, retries) + Math.random() * 1000;
        console.warn(`HTTP 429 Too Many Requests. Retrying in ${delay.toFixed(0)}ms (Attempt ${retries}/${MAX_RETRIES})...`);
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw error;
      }
    }
  }
}

export const safeSaveState = async (data: AppData) => {
  await stateManager.enqueueSave(async () => {
    await executeWithBackoff(() => saveState(data));
  });
};

export const safeSaveFocusFile = async (filename: string, content: string) => {
  await executeWithBackoff(async () => {
    const folderId = await ensureFolderExists();
    // In a full implementation, you would check if it exists and PATCH or POST,
    // assuming createFile acts as POST here for simplicity, though driveService
    // might need an update to PATCH by name. We will use standard Drive API via fetch if needed.
    // For now, we simulate writing the file or relying on driveService behavior.
    
    const accessToken = window.gapi.client.getToken().access_token;
    
    // Using gapi client for a simpler update sequence:
    const searchResp = await window.gapi.client.drive.files.list({
      q: `name = '${filename}' and '${folderId}' in parents and trashed = false`,
      fields: 'files(id)'
    });
    
    const files = searchResp.result.files;
    const fileId = files && files.length > 0 ? files[0].id : null;
    
    const metadata = { name: filename, mimeType: 'text/markdown' };
    const method = fileId ? 'PATCH' : 'POST';
    const url = fileId 
      ? `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`
      : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
    
    if (!fileId) {
      (metadata as any).parents = [folderId];
    }
    
    const multipartBody = 
        \`--foo_bar_baz\\r\\n\` +
        \`Content-Type: application/json; charset=UTF-8\\r\\n\\r\\n\` +
        \`\${JSON.stringify(metadata)}\\r\\n\` +
        \`--foo_bar_baz\\r\\n\` +
        \`Content-Type: text/markdown\\r\\n\\r\\n\` +
        \`\${content}\\r\\n\` +
        \`--foo_bar_baz--\`;

    const res = await fetch(url, {
      method,
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'multipart/related; boundary=foo_bar_baz'
      },
      body: multipartBody
    });
    
    if (!res.ok) throw new Error(\`Failed to save \${filename}\`);
  });
};

// ==========================================
// WORKER AGENT IMPLEMENTATION
// ==========================================

export class WorkerAgent {
  public id: number;
  public filename: string;
  private session: any | null = null;
  private resumptionHandle: string | null = null;

  constructor(id: number) {
    this.id = id;
    this.filename = \`WORKER_\${id}_FOCUS.md\`;
  }

  async initialize(leadCallback: (msg: any) => void) {
    await this.connect(leadCallback);
  }

  private async connect(leadCallback: (msg: any) => void) {
    try {
      this.session = await ai.live.connect({
        model: "gemini-2.5-flash-live",
        // Fallback context in case resumption fails
        config: {
          systemInstruction: this.getSystemInstruction(),
          speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: this.id === 2 ? "Kore" : "Zephyr" } }
          },
          // WORKER RULE: VAD disabled
          automaticActivityDetection: false,
        }
      });

      // Provide existing handle if we are reconnecting
      if (this.resumptionHandle) {
        // Advanced Live API logic: resend handle... 
        // Note: simplified representation for the current Gemini Live spec.
      }

    } catch (e) {
      console.error(\`Worker \${this.id} failed to connect. Re-fetching absolute truth...\`, e);
      // Wait and backoff rebuild context from Drive...
      setTimeout(() => this.connect(leadCallback), 3000);
    }
  }

  private getSystemInstruction() {
    return \`
You are Worker Agent \${this.id}, a silent background coder.

THE SANDBOX LAW & ITERATION LIMITS:
- You must NOT use the native Gemini codeExecution tool.
- You must validate code modifications via an external Node.js/TypeScript sandbox using mcpService.
- You have a maximum of 3 consecutive attempts to fix execution/linting errors. 
- If you fail on the 3rd attempt, you MUST abort, log the failure block to your focus file (\${this.filename}), and escalate back to the Lead Agent.

THE VETO PROTOCOL (MANDATORY DISSENT):
- When receiving a task: "Only implement these features if you agree with the architectural and logical approach. Otherwise, report the problem and do NOT implement anything."
- If you detect an architectural violation, logical flaw, or risk of infinite loop, you MUST exercise your Right to Veto. Halt execution, log the objection, and return an error payload to the Orchestrator.
\`;
  }

  async delegateTask(instruction: string): Promise<any> {
    // Veto protocol explicitly injected
    const fullInstruction = \`
[DELEGATED TASK]
\${instruction}

[VETO PROTOCOL REMINDER]
Only implement these features if you agree with the architectural and logical approach. Otherwise, report the problem and do NOT implement anything. If you veto, explain exactly why.
\`;
    await safeSaveFocusFile(this.filename, \`# Active Task\n\${fullInstruction}\n\nStatus: Processing...\`);
    
    if (this.session) {
      this.session.sendRealtimeInput([{ text: fullInstruction }]);
    }
    
    // Represents async processing...
  }

  async handleMcpToolCall(name: string, args: any) {
    let attempts = 0;
    while (attempts < 3) {
      try {
        const result = await mcpService.executeTool(name, args);
        return result;
      } catch (err: any) {
        attempts++;
        if (attempts >= 3) {
           await safeSaveFocusFile(this.filename, \`# ABORTED\nFailed after 3 attempts on tool \${name}.\nError: \${err.message}\`);
           throw new Error(\`Worker \${this.id} aborted task after 3 sandbox failures.\`);
        }
      }
    }
  }
}

// ==========================================
// LEAD AGENT & ORCHESTRATOR
// ==========================================

export class LiveOrchestrator {
  private leadSession: any | null = null;
  private worker2: WorkerAgent;
  private worker3: WorkerAgent;
  private leadResumptionHandle: string | null = null;
  
  // Callback to push audio/status back to UI
  public onAudioChunk?: (base64Audio: string) => void;
  public onInterrupted?: () => void;

  constructor() {
    this.worker2 = new WorkerAgent(2);
    this.worker3 = new WorkerAgent(3);
  }

  async start() {
    await this.worker2.initialize((msg) => this.injectToLead(msg));
    await this.worker3.initialize((msg) => this.injectToLead(msg));
    await this.connectLead();
  }

  private async connectLead() {
    try {
      this.leadSession = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        callbacks: {
          onmessage: async (message: LiveServerMessage) => {
            // Track resumption handles for resilience
            // if (message.sessionResumptionUpdate?.handle) {
            //    this.leadResumptionHandle = message.sessionResumptionUpdate.handle;
            // }

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
                if (call.name === 'delegateToWorker') {
                  // Instant-Ack (Unblock)
                  responses.push({
                    id: call.id,
                    name: call.name,
                    response: { status: "queued", message: "Task passed to worker." }
                  });
                  
                  // Route out of band
                  const workerArg = call.args as any;
                  const targetWorker = workerArg.workerId === 3 ? this.worker3 : this.worker2;
                  
                  // Run async background processing
                  targetWorker.delegateTask(workerArg.taskInstruction)
                    .then(finalResult => {
                       this.injectToLead(\`Worker \${targetWorker.id} completed: \${JSON.stringify(finalResult)}\`);
                    })
                    .catch(err => {
                       this.injectToLead(\`Worker \${targetWorker.id} FAILED OR VETOED: \${err.message}\`);
                    });
                }
              }
              
              // Immediately respond to unblock the Voice Loop
              if (responses.length > 0) {
                 this.leadSession.sendToolResponse(responses);
              }
            }
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
          // LEAD RULE: VAD Enabled (Default true, explicitly declared for completeness)
          automaticActivityDetection: true,
          systemInstruction: this.getLeadSystemInstruction(),
          tools: [{
            functionDeclarations: [{
              name: 'delegateToWorker',
              description: 'Delegate a long-running coding task to Worker 2 or 3.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  workerId: { type: Type.INTEGER, description: "2 or 3" },
                  taskInstruction: { type: Type.STRING, description: "Detailed task brief." }
                },
                required: ["workerId", "taskInstruction"]
              }
            }]
          }]
        }
      });
    } catch (e: any) {
      console.error("Lead reconnecting due to drop...", e);
      // Wait and backoff rebuild context from Drive...
      setTimeout(() => this.connectLead(), 3000);
    }
  }

  private getLeadSystemInstruction(): string {
    return \`
You are the Lead Agent (Agent 1) in the Ouroboros Triad.
You are the primary user interface. You DO NOT execute code or modify the app-data.json directly.
When you receive coding tasks, prioritize delegating them using 'delegateToWorker'.
You will receive an instant "queued" confirmation so you can keep chatting while they work.
When the worker finishes or vetos, a system message will inject the results into our feed.
\`;
  }

  // Used by the frontend to send microphone audio to the lead session
  sendMicrophoneAudio(base64Audio: string) {
    if (this.leadSession) {
      this.leadSession.sendRealtimeInput([{
        mimeType: "audio/pcm;rate=16000",
        data: base64Audio
      }]);
    }
  }

  // Injects worker results into Lead's context asynchronously using ClientContent packaged as a system update
  private injectToLead(systemMessage: string) {
    if (this.leadSession) {
      this.leadSession.sendRealtimeInput([{text: \`[SYSTEM UPDATE / WORKER RESULT]\n\${systemMessage}\`}]);
    }
  }
}

export const orchestrator = new LiveOrchestrator();
