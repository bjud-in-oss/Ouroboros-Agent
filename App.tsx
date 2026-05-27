import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_MEMORY, INITIAL_FOCUS } from './constants';
import { LongTermMemory, FocusLog, ChatMessage, AppData } from './types';
import { processInteraction } from './services/geminiService';
import { orchestrator, WorkerStatus } from './services/liveOrchestrator';
import * as driveService from './services/driveService';
import { mcpService } from './services/mcpService';
import MemoryPanel from './components/MemoryPanel';
import FocusPanel from './components/FocusPanel';
import { Terminal, Trash2, Send, Cpu, HardDrive, Download, Cloud, LogIn, Bug, Wrench, Plug, Mic, MicOff } from 'lucide-react';

const App: React.FC = () => {
  // --- DEBUG BRIDGE START ---
  useEffect(() => {
    console.log("🔧 Manual Override: Exposing driveService to window...");
    (window as any).driveService = driveService;
  }, []);
  // --- DEBUG BRIDGE END ---

  // --- State ---
  const [selectedModel, setSelectedModel] = useState<string>('gemini-flash-latest');
  const [mcpUrl, setMcpUrl] = useState<string>('http://localhost:3001/sse');
  const [mcpStatus, setMcpStatus] = useState<'Disconnected' | 'Connecting' | 'Connected'>('Disconnected');
  const [memory, setMemory] = useState<LongTermMemory>(INITIAL_MEMORY);
  const [focus, setFocus] = useState<FocusLog>(INITIAL_FOCUS);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'Drive-Augmented Ouroboros System Online. Waiting for connection...', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'memory' | 'focus'>('memory');
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [systemInjection, setSystemInjection] = useState<string | null>(null);
  
  // LIVE ENGINE STATE
  const [isEngineActive, setIsEngineActive] = useState(false);
  const [engineStatus, setEngineStatus] = useState<"Offline" | "Booting" | "Active" | "Error">("Offline");
  const [workerStatuses, setWorkerStatuses] = useState<WorkerStatus[]>([]);
  
  // MOCK DELEGATOR STATE
  const [mockTask, setMockTask] = useState("");
  const [mockFiles, setMockFiles] = useState("app-data.json");
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const hasCheckedGithub = useRef(false);

  // --- Effects ---
  
  // Initialize Google Scripts
  useEffect(() => {
    driveService.loadGoogleScripts(() => {
      console.log("Google Scripts Loaded");
      // Optionally try silent auth here if we had persistence logic for sessions
    });
    
    // Subscribe to Orchestrator HUD events
    orchestrator.onWorkerStatusChange = (statuses) => {
      setWorkerStatuses([...statuses]);
    };
  }, []);

  // GitHub Wake-up Protocol
  useEffect(() => {
    if (!isDriveConnected || isSyncing || hasCheckedGithub.current) return;
    
    const checkGithub = async () => {
      hasCheckedGithub.current = true;
      try {
        const res = await fetch('https://api.github.com/repos/bjud-in-oss/ouroboros-agent/commits/main');
        if (!res.ok) return;
        const data = await res.json();
        const latestSha = data.sha;
        
        if (latestSha && latestSha !== memory.last_known_github_sha) {
           const wakeUpMsg = `[SYSTEM WAKE-UP TRIGGER: Ditt DNA (källkod) har uppdaterats på GitHub till commit SHA: ${latestSha}. Vänligen använd ditt verktyg \`readGitHubCode\` för att läsa \`services/geminiService.ts\` och se vilka nya förmågor The Architect har gett dig. Uppdatera sedan din förståelse i dina Context Capsules, och anropa slutligen \`updateKnownGithubSha("${latestSha}")\` för att bekräfta att du förstår din nya kropp.]`;
           
           // Simulate user message indicating the system wake-up to not wait for user input
           setMessages(prev => [...prev, { role: 'user', content: wakeUpMsg, timestamp: Date.now() }]);
           setIsLoading(true);
           
           try {
             const { response, newMemory, newFocus } = await processInteraction(
               wakeUpMsg,
               memory,
               focus,
               async (updatedMemory) => {
                 setMemory(updatedMemory);
                 if (isDriveConnected) {
                    try {
                       await driveService.saveState({
                         app_version: "1.0.0",
                         last_sync_timestamp: Date.now(),
                         memory: updatedMemory,
                         focus: focus
                       });
                    } catch (err) {
                       console.error("Real-time Drive Sync failed:", err);
                    }
                 }
               },
               selectedModel
             );
             setMemory(newMemory);
             setFocus(newFocus);
             setMessages(prev => [...prev, { role: 'model', content: response, timestamp: Date.now() }]);
             await handleSyncUp(newMemory, newFocus);
           } catch (err: any) {
             console.error(err);
             setMessages(prev => [...prev, { role: 'system', content: `Error during Wake-Up: ${err.message || String(err)}`, timestamp: Date.now() }]);
           } finally {
             setIsLoading(false);
           }
        }
      } catch (e) {
        console.error("Github check failed", e);
      }
    };
    checkGithub();
  }, [isDriveConnected, isSyncing, memory, focus]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Handlers ---

  const handleConnectDrive = async () => {
    try {
      await driveService.authenticate();
      setIsDriveConnected(true);
      setMessages(prev => [...prev, { role: 'system', content: 'Authentication Successful. Syncing with Drive...', timestamp: Date.now() }]);
      await handleSyncDown();
    } catch (err: any) {
      console.error(err);
      const msg = err.message || JSON.stringify(err);
      setMessages(prev => [...prev, { role: 'system', content: `Authentication Failed: ${msg}`, timestamp: Date.now() }]);
    }
  };

  const handleSyncDown = async () => {
    setIsSyncing(true);
    try {
      const data = await driveService.loadState();
      if (data) {
        setMemory(data.memory);
        setFocus(data.focus);
        
        // Immediately sync back to Drive with restored data
        await driveService.saveState({
          app_version: "1.0.0",
          last_sync_timestamp: Date.now(),
          memory: data.memory,
          focus: data.focus
        });

        setSystemInjection('[SYSTEM: Memory restored successfully. Your 2.0 tools (Function Calling) remain active.]');
        
        setMessages(prev => [...prev, { 
          role: 'system', 
          content: 'Memory loaded from Drive.', 
          timestamp: Date.now() 
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'system', content: 'No existing memory found on Drive. Using default state.', timestamp: Date.now() }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'system', content: 'Failed to load from Drive.', timestamp: Date.now() }]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncUp = async (newMemory: LongTermMemory, newFocus: FocusLog) => {
    if (!isDriveConnected) return;
    setIsSyncing(true);
    try {
      const payload: AppData = {
        app_version: "1.0.0",
        last_sync_timestamp: Date.now(),
        memory: newMemory,
        focus: newFocus
      };
      await driveService.saveState(payload);
      // Optional: Visual indicator of success?
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'system', content: 'WARNING: Drive Sync Failed.', timestamp: Date.now() }]);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDiagnostics = async () => {
    if (!isDriveConnected) {
        setMessages(prev => [...prev, { role: 'system', content: 'Connect to Drive to run diagnostics.', timestamp: Date.now() }]);
        return;
    }
    setMessages(prev => [...prev, { role: 'system', content: 'Running System Diagnostics...', timestamp: Date.now() }]);
    const report = await driveService.runDiagnostics();
    setMessages(prev => [...prev, { role: 'system', content: report, timestamp: Date.now() }]);
  };

  const handleRepair = async () => {
    if (!isDriveConnected) {
        setMessages(prev => [...prev, { role: 'system', content: 'Connect to Drive to perform repairs.', timestamp: Date.now() }]);
        return;
    }
    setMessages(prev => [...prev, { role: 'system', content: 'Initiating Surgical Memory Injection...', timestamp: Date.now() }]);
    const result = await driveService.performSurgicalInjection();
    setMessages(prev => [...prev, { role: 'system', content: result, timestamp: Date.now() }]);
    
    // Auto sync down if successful
    if (result.includes("online")) {
        await handleSyncDown();
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    if (!isDriveConnected) {
       setMessages(prev => [...prev, { role: 'system', content: 'Please connect to Drive before interacting.', timestamp: Date.now() }]);
       return;
    }

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const fullPrompt = systemInjection ? `${input}\n\n${systemInjection}` : input;
      if (systemInjection) setSystemInjection(null); // Clear after injection
      
      const { response, newMemory, newFocus } = await processInteraction(
        fullPrompt, 
        memory, 
        focus,
        async (updatedMemory) => {
          setMemory(updatedMemory);
          // Omedelbar Drive Sync vid atomic mutation
          if (isDriveConnected) {
             try {
                await driveService.saveState({
                  app_version: "1.0.0",
                  last_sync_timestamp: Date.now(),
                  memory: updatedMemory,
                  focus: focus
                });
             } catch (err) {
                console.error("Real-time Drive Sync failed:", err);
             }
          }
        },
        selectedModel
      );
      
      setMemory(newMemory);
      setFocus(newFocus);
      setMessages(prev => [...prev, { role: 'model', content: response, timestamp: Date.now() }]);
      
      // Auto-sync after every turn (Ouroboros loop)
      await handleSyncUp(newMemory, newFocus);

    } catch (error: any) {
      console.error(error);
      const errorMessage = error.message || "Unknown error connecting to Neural Interface.";
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${errorMessage}`, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ memory, focus }, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "ouroboros_backup.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleReset = async () => {
      if(window.confirm("Are you sure you want to wipe local memory? This does not delete the file on Drive yet.")) {
        setMemory(INITIAL_MEMORY);
        setFocus(INITIAL_FOCUS);
        setMessages([{ role: 'system', content: 'Local Memory Wiped.', timestamp: Date.now() }]);
      }
      
  };

  const handleConnectMCP = async () => {
      if (mcpStatus === 'Connected') {
          await mcpService.disconnect();
          setMcpStatus('Disconnected');
          return;
      }

      setMcpStatus('Connecting');
      try {
          await mcpService.connect(mcpUrl);
          setMcpStatus('Connected');
      } catch (err: any) {
          console.error("MCP connection failed:", err);
          setMcpStatus('Disconnected');
          setMessages(prev => [...prev, { role: 'system', content: `MCP Connection Failed: ${err.message || String(err)}`, timestamp: Date.now() }]);
      }
  };

  const handleToggleEngine = async () => {
      if (isEngineActive) {
          // Provide clean teardown logic eventually
          await orchestrator.stop();
          setIsEngineActive(false);
          setEngineStatus("Offline");
          setWorkerStatuses([]);
          setMessages(prev => [...prev, { role: 'system', content: 'Orchestrator Engine Terminated.', timestamp: Date.now() }]);
          return;
      }

      setEngineStatus("Booting");
      setIsEngineActive(true);
      try {
          // Initialize Triad
          await orchestrator.start();
          setEngineStatus("Active");
          setMessages(prev => [...prev, { role: 'system', content: 'Agent Triad (Orchestrator) is now Online. Listening for delegates...', timestamp: Date.now() }]);
      } catch (e: any) {
          console.error(e);
          setEngineStatus("Error");
          setIsEngineActive(false);
          setMessages(prev => [...prev, { role: 'system', content: `Engine Boot Failure: ${e.message}`, timestamp: Date.now() }]);
      }
  };

  return (
    <div className="flex h-screen w-full bg-[#09090b] text-zinc-300 font-sans overflow-hidden">
      
      {/* Left Sidebar: Chat Interface */}
      <div className="w-1/3 flex flex-col border-r border-zinc-800 bg-[#0c0c0e]">
        
        {/* Header */}
        <div className="h-16 border-b border-zinc-800 flex items-center px-6 gap-3 select-none justify-between">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Cpu size={18} />
                </div>
                <div>
                    <h1 className="font-bold text-zinc-100 tracking-tight">Ouroboros</h1>
                    <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isDriveConnected ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></span>
                        <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                            {isDriveConnected ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                {isDriveConnected && (
                    <>
                        <button 
                            onClick={handleDiagnostics}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-md transition-colors border border-zinc-700"
                            title="Run System Diagnostics"
                        >
                            <Bug size={14} />
                        </button>
                        <button 
                            onClick={handleRepair}
                            className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-500 hover:text-amber-300 rounded-md transition-colors border border-zinc-700"
                            title="Surgical Memory Injection (Repair)"
                        >
                            <Wrench size={14} />
                        </button>
                    </>
                )}
                {!isDriveConnected && (
                    <button 
                        onClick={handleConnectDrive}
                        className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs px-3 py-1.5 rounded-md transition-colors border border-zinc-700"
                    >
                        <LogIn size={12} /> Connect
                    </button>
                )}
                
                {/* Terminal Rail HUD */}
                {isEngineActive && workerStatuses.map(w => (
                    <div key={w.id} className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] uppercase tracking-wider font-mono ${
                        w.status === 'Processing' ? 'bg-amber-900/30 text-amber-500 border-amber-800/50' :
                        w.status === 'Error' ? 'bg-red-900/30 text-red-500 border-red-800/50' :
                        'bg-zinc-800/50 text-zinc-500 border-zinc-700/50'
                    }`}>
                        <span>W{w.id}</span>
                        {w.status === 'Processing' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>}
                        {w.status === 'Processing' && w.activeLocks && w.activeLocks.length > 0 && (
                            <span className="text-amber-600/70 ml-1">🔒 {w.activeLocks.length}</span>
                        )}
                    </div>
                ))}

                <button
                    onClick={handleToggleEngine}
                    disabled={engineStatus === 'Booting'}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md transition-colors border ${
                      isEngineActive 
                        ? 'bg-red-900/40 text-red-400 border-red-800 hover:bg-red-900/60' 
                        : 'bg-indigo-600/40 text-indigo-300 border-indigo-500 hover:bg-indigo-600/60'
                    }`}
                >
                    {isEngineActive ? <MicOff size={12} /> : <Mic size={12} />} 
                    {engineStatus === 'Booting' ? 'Booting...' : isEngineActive ? 'Terminate Triad' : 'Engage Triad'}
                </button>
            </div>
        </div>

        {/* MOCK DELEGATOR UI */}
        {isEngineActive && (
            <div className="bg-[#121214] border-b border-zinc-800 p-2 flex items-center justify-between shrink-0 shadow-md">
               <div className="flex items-center gap-2 w-full">
                   <div className="flex items-center gap-1 text-zinc-500 ml-1 shrink-0 hidden xl:flex">
                       <Cpu size={12} /> 
                       <span className="text-[10px] font-mono uppercase">Mock</span>
                   </div>
                   <input 
                       type="text" 
                       value={mockTask}
                       onChange={e => setMockTask(e.target.value)}
                       placeholder="Task..."
                       className="flex-1 min-w-0 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] outline-none focus:border-indigo-500/50 transition-colors"
                   />
                   <input 
                       type="text" 
                       value={mockFiles}
                       onChange={e => setMockFiles(e.target.value)}
                       placeholder="file.js"
                       className="w-16 min-w-0 shrink-0 bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[11px] outline-none focus:border-indigo-500/50 transition-colors"
                   />
                   <div className="flex gap-1 shrink-0 pr-1">
                       <button onClick={() => {
                           const files = mockFiles.split(',').map(s => s.trim()).filter(Boolean);
                           orchestrator.handleDelegation(2, mockTask, files);
                       }} className="bg-amber-900/30 border border-amber-900/50 text-amber-500 hover:bg-amber-900/60 transition-colors px-2 py-1 rounded text-[11px] font-mono">W2</button>
                       <button onClick={() => {
                           const files = mockFiles.split(',').map(s => s.trim()).filter(Boolean);
                           orchestrator.handleDelegation(3, mockTask, files);
                       }} className="bg-amber-900/30 border border-amber-900/50 text-amber-500 hover:bg-amber-900/60 transition-colors px-2 py-1 rounded text-[11px] font-mono">W3</button>
                   </div>
               </div>
            </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
            {messages.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                            ? 'bg-zinc-800 text-zinc-100 rounded-tr-none' 
                            : msg.role === 'system'
                            ? 'bg-red-900/20 text-red-400 border border-red-900/30 text-xs font-mono w-full whitespace-pre-wrap'
                            : 'bg-[#18181b] border border-zinc-800 text-zinc-300 rounded-tl-none'
                    }`}>
                        {msg.content}
                    </div>
                    {msg.role !== 'system' && (
                         <span className="text-[10px] text-zinc-600 mt-1 px-1">{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    )}
                </div>
            ))}
            {isLoading && (
                <div className="flex items-start">
                    <div className="bg-[#18181b] border border-zinc-800 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2">
                         <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                         <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                         <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"></span>
                    </div>
                </div>
            )}
            <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-zinc-800 bg-[#0c0c0e]">
            <div className="relative">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={isDriveConnected ? "Interface with the neural core..." : "Connect Drive to activate..."}
                    disabled={isLoading || !isDriveConnected}
                    className="w-full bg-zinc-900 border border-zinc-700 text-zinc-200 text-sm rounded-lg pl-4 pr-12 py-3 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button 
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim() || !isDriveConnected}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Send size={16} />
                </button>
            </div>
            <div className="text-[10px] text-zinc-600 mt-2 text-center flex items-center justify-center gap-2">
                <div className="flex items-center gap-1">
                    {isSyncing ? <Cloud size={10} className="animate-pulse text-indigo-400" /> : <HardDrive size={10} />}
                    <span>{isSyncing ? "Syncing with Drive..." : "Drive-Augmented Memory Access"}</span>
                </div>
                <span className="text-zinc-700">|</span>
                <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-1.5 py-0.5 focus:outline-none focus:border-indigo-500"
                >
                    <option value="gemini-pro-latest">gemini-pro-latest</option>
                    <option value="gemini-flash-latest">gemini-flash-latest</option>
                    <option value="gemini-flash-lite-latest">gemini-flash-lite-latest</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                    <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                    <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                    <option value="gemini-2.0-flash-lite">gemini-2.0-flash-lite</option>
                    <option value="gemini-robotics-er-1.6-preview">gemini-robotics-er-1.6-preview</option>
                    <option value="gemma-4-31b-it">gemma-4-31b-it</option>
                    <option value="gemma-4-26b-a4b-it">gemma-4-26b-a4b-it</option>
                </select>
                <span className="text-zinc-700">|</span>
                <div className="flex items-center gap-1">
                    <input 
                        type="text" 
                        value={mcpUrl} 
                        onChange={(e) => setMcpUrl(e.target.value)}
                        placeholder="MCP URL"
                        className="bg-zinc-800 border border-zinc-700 text-zinc-300 rounded px-1.5 py-0.5 w-32 focus:outline-none focus:border-emerald-500 text-[10px]"
                    />
                    <button 
                        onClick={handleConnectMCP}
                        disabled={mcpStatus === 'Connecting'}
                        className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors border ${
                           mcpStatus === 'Connected' 
                           ? 'bg-emerald-900/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900/60' 
                           : mcpStatus === 'Connecting'
                           ? 'bg-amber-900/40 text-amber-400 border-amber-800'
                           : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                        }`}
                    >
                        <Plug size={10} />
                        {mcpStatus === 'Connected' ? 'Disconnect MCP' : mcpStatus === 'Connecting' ? 'Connecting...' : 'Connect MCP'}
                    </button>
                    {mcpStatus === 'Connected' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"></span>}
                </div>
            </div>
        </div>
      </div>

      {/* Right Content: Memory & Focus Dashboard */}
      <div className="flex-1 flex flex-col bg-[#09090b]">
        
        {/* Toolbar */}
        <div className="h-16 border-b border-zinc-800 flex items-center justify-between px-6 bg-[#09090b]">
            {/* Tabs */}
            <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800">
                <button
                    onClick={() => setActiveTab('memory')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                        activeTab === 'memory' 
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <HardDrive size={14} /> Long Term Memory (JSON)
                </button>
                <button
                    onClick={() => setActiveTab('focus')}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                        activeTab === 'focus' 
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' 
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    <Terminal size={14} /> Current Focus (MD)
                </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDownload}
                    className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                    title="Backup to local machine"
                >
                    <Download size={18} />
                </button>
                <div className="h-4 w-px bg-zinc-800 mx-1"></div>
                <button 
                    onClick={handleReset}
                    className="p-2 text-red-900 hover:text-red-500 hover:bg-red-900/20 rounded-md transition-colors"
                    title="Wipe Local Memory"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden p-6 relative">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
            
            {activeTab === 'memory' ? (
                <div className="h-full animate-in fade-in duration-300">
                    <MemoryPanel memory={memory} />
                </div>
            ) : (
                <div className="h-full animate-in fade-in duration-300">
                    <FocusPanel focus={focus} />
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default App;