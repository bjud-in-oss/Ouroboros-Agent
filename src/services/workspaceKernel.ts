import { WebContainer } from '@webcontainer/api';

// ==========================================
// TYPES & INTERFACES
// ==========================================

/**
 * Representerar en abstraherad process (WASM eller Cloud/E2B)
 */
export interface IProcessHandle {
  /** Ström dirigerad mot terminal-gränssnittet (Xterm) */
  terminalStream: ReadableStream<string>;
  
  /** Ström dirigerad asynkront tillbaka mot Gemini WebSocket */
  aiStream: ReadableStream<string>;
  
  /** Returnerar ett löfte som upplöses med processens exit code när den avslutats */
  exitCode: Promise<number>;
  
  /** Skriver indata till processen, måste invänta writer.ready (backpressure-kontroll) */
  writeInput(data: string | Uint8Array): Promise<void>;
  
  /** Tvingar processen att avslutas omedelbart */
  kill(): void;
}

/**
 * Det arkitektoniska kontraktet för en exekveringsmiljö.
 * Möjliggör "Graceful Escalation" från WebContainers (lokal WASM) till moln-sandlådor (E2B/Docker).
 */
export interface IExecutionEnvironment {
  boot(): Promise<void>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  spawnProcess(command: string, args: string[]): Promise<IProcessHandle>;
  teardown(): Promise<void>;
}

// ==========================================
// CLASSES
// ==========================================

export class TransactionalSyncBridge {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private activeLocks: Map<string, { expectedContent: string; timeoutId: number | NodeJS.Timeout }>;

  constructor() {
    this.activeLocks = new Map();
  }

  public async writeFromWALToVFS(path: string, content: string, env: WebContainer): Promise<void> {
    const existingLock = this.activeLocks.get(path);
    if (existingLock) {
      clearTimeout(existingLock.timeoutId);
    }

    // Set lock to block immediate fs.watch echoes (50ms timeout)
    const timeoutId = setTimeout(() => {
      this.activeLocks.delete(path);
    }, 50);

    // Knyter innehållet (hash/string-check) till låset
    this.activeLocks.set(path, { expectedContent: content, timeoutId });

    try {
      await env.fs.writeFile(path, content);
    } catch (err) {
      this.activeLocks.delete(path);
      throw err;
    }
  }

  public registerVFSWatcher(env: WebContainer, onExternalChange: (path: string, content: string) => void): void {
    env.fs.watch('/', { recursive: true }, async (event, filename) => {
      if (!filename || filename.includes('node_modules')) return;

      const fullPath = filename.startsWith('/') ? filename : `/${filename}`;
      const lock = this.activeLocks.get(fullPath) || this.activeLocks.get(filename);
      
      try {
        const content = await env.fs.readFile(filename, 'utf-8');
        
        // Innehållsvalidering för att säkert utesluta eko-cykler
        if (lock && lock.expectedContent === content) {
          return; // Det är vårat eget eko, blockera!
        }

        // Detta är en äkta extern ändring (skapades inifrån WebContainern)
        onExternalChange(filename, content);
      } catch (err) {
        // Fil troligen borttagen
      }
    });
  }
}

class WasmProcessHandle implements IProcessHandle {
  public terminalStream: ReadableStream<string>;
  public aiStream: ReadableStream<string>;
  public exitCode: Promise<number>;
  private writer: WritableStreamDefaultWriter<string>;
  private killFn: () => void;

  constructor(
    terminalStream: ReadableStream<string>,
    aiStream: ReadableStream<string>,
    exitCode: Promise<number>,
    writer: WritableStreamDefaultWriter<string>,
    killFn: () => void
  ) {
    this.terminalStream = terminalStream;
    this.aiStream = aiStream;
    this.exitCode = exitCode;
    this.writer = writer;
    this.killFn = killFn;
  }

  public async writeInput(data: string | Uint8Array): Promise<void> {
    const stringData = typeof data === 'string' ? data : new TextDecoder().decode(data);
    
    // Explicit Backpressure-Kontroll för inmatning
    if (this.writer.desiredSize !== null && this.writer.desiredSize <= 0) {
      await this.writer.ready;
    }
    
    await this.writer.write(stringData);
  }

  public kill(): void {
    this.killFn();
  }
}

export class WasmContainerEnv implements IExecutionEnvironment {
  private container: WebContainer | null;
  private syncBridge: TransactionalSyncBridge;

  constructor() {
    this.container = null;
    this.syncBridge = new TransactionalSyncBridge();
  }

  public getBridge(): TransactionalSyncBridge {
    return this.syncBridge;
  }
  
  public getContainer(): WebContainer {
    if (!this.container) throw new Error("Miljön ej uppstartad (boot saknas)");
    return this.container;
  }

  public async boot(): Promise<void> {
    if (this.container) return; // Redan bootad externt
    this.container = await WebContainer.boot();
  }

  public async readFile(path: string): Promise<string> {
    if (!this.container) throw new Error("Miljön ej uppstartad (boot saknas)");
    return await this.container.fs.readFile(path, 'utf-8');
  }

  public async writeFile(path: string, content: string): Promise<void> {
    if (!this.container) throw new Error("Miljön ej uppstartad (boot saknas)");
    await this.syncBridge.writeFromWALToVFS(path, content, this.container);
  }

  public async spawnProcess(command: string, args: string[]): Promise<IProcessHandle> {
    if (!this.container) throw new Error("Miljön ej uppstartad (boot saknas)");
    
    const process = await this.container.spawn(command, args);
    const writer = process.input.getWriter();
    
    // .tee() används för att skicka strömmen till både GUI-terminalen och AI:ns JSON-feed.
    const [terminalStream, aiStream] = process.output.tee();
    
    return new WasmProcessHandle(
      terminalStream,
      aiStream,
      process.exit,
      writer,
      () => process.kill()
    );
  }

  public async teardown(): Promise<void> {
    if (this.container) {
      this.container.teardown();
      this.container = null;
    }
  }
}

// ==========================================
// GLOBAL SINGLETON BOOTLOADER
// ==========================================

let globalKernelPromise: Promise<IExecutionEnvironment> | null = null;
let activeKernelInstance: IExecutionEnvironment | null = null;

export async function getWorkspaceKernel(): Promise<IExecutionEnvironment> {
  if (activeKernelInstance) return activeKernelInstance;
  
  if (!globalKernelPromise) {
    const env = new WasmContainerEnv();
    
    globalKernelPromise = env.boot().then(() => {
      activeKernelInstance = env;
      return env;
    }).catch((err) => {
      globalKernelPromise = null;
      throw err;
    });
  }
  
  return globalKernelPromise;
}
