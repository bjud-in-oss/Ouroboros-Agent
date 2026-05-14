import { GoogleGenAI, Type, Schema, Content } from "@google/genai";
import { LongTermMemory, FocusLog } from "../types";
import { readFile, createFile, ensureFolderExists, saveState } from "./driveService";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });


const focusUpdateSchema: Schema = {
 type: Type.OBJECT,
 properties: {
   text_response: {
     type: Type.STRING,
     description: "The verbal response to the user."
   },
   updated_focus: {
       type: Type.OBJECT,
       description: "The updated structured content for CURRENT_FOCUS.md (represented as object)",
       properties: {
           last_updated: { type: Type.STRING },
           current_objective: { type: Type.STRING },
           chain_of_thought: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
           },
           pending_tasks: {
               type: Type.ARRAY,
               items: { type: Type.STRING }
           }
       },
       required: ["last_updated", "current_objective", "chain_of_thought", "pending_tasks"]
   }
 },
 required: ["text_response", "updated_focus"]
};

export const processInteraction = async (
 userPrompt: string,
 currentMemory: LongTermMemory,
 currentFocus: FocusLog
): Promise<{
   response: string;
   newMemory: LongTermMemory;
   newFocus: FocusLog
}> => {
  if (!apiKey) {
     throw new Error("API Key is missing. Please ensure process.env.API_KEY is configured.");
 }

 const model = "gemini-3-flash-preview";
 const memoryState = JSON.parse(JSON.stringify(currentMemory));

 const systemInstruction = `
 You are an autonomous AI agent operating under the "Drive-Augmented Ouroboros" architecture.
 
 CORE PRINCIPLE:
 You have no internal persistent state between sessions. Your entire "Self" is defined by your Long Term Memory and Current Focus.
 
 YOUR TASK:
 1. Analyze the User's Input.
 2. Use the provided tools to mutate your Memory or read files as needed. 
    - Use memory mutation tools (addLearnedTruth, addGraphNode, etc.) to atomicly update LONG_TERM_MEMORY.
    - Use file operation tools (createContextCapsule, readContextCapsule, readGitHubCode) for I/O operations.
 3. Output your final response in JSON format matching the schema (text_response, updated_focus).
 
 INPUT CONTEXT:
 --- LONG_TERM_MEMORY.json ---
 ${JSON.stringify(memoryState)}
 --- CURRENT_FOCUS.md (State) ---
 ${JSON.stringify(currentFocus)}
 `;

 let history: Content[] = [
    { role: 'user', parts: [{ text: userPrompt }] }
 ];

 let finalResponseText = '';
 let finalFocus = currentFocus;

 for (let turn = 0; turn < 10; turn++) {
    const response = await ai.models.generateContent({
        model,
        contents: history,
        config: {
            systemInstruction,
            tools: [{
                functionDeclarations: [
                    {
                        name: "addLearnedTruth",
                        description: "Add a learned truth to memory.",
                        parameters: { type: Type.OBJECT, properties: { truth: { type: Type.STRING } }, required: ["truth"] }
                    },
                    {
                        name: "addGraphNode",
                        description: "Add a node to the knowledge graph.",
                        parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING }, label: { type: Type.STRING }, type: { type: Type.STRING } }, required: ["id", "label", "type"] }
                    },
                    {
                        name: "addGraphEdge",
                        description: "Add an edge to the knowledge graph.",
                        parameters: { type: Type.OBJECT, properties: { source: { type: Type.STRING }, target: { type: Type.STRING }, relation: { type: Type.STRING } }, required: ["source", "target", "relation"] }
                    },
                    {
                        name: "archiveProject",
                        description: "Archive a project.",
                        parameters: { type: Type.OBJECT, properties: { id: { type: Type.STRING } }, required: ["id"] }
                    },
                    {
                        name: "archiveLearnedTruth",
                        description: "Remove a learned truth from memory by its index.",
                        parameters: { type: Type.OBJECT, properties: { index: { type: Type.INTEGER } }, required: ["index"] }
                    },
                    {
                        name: "createContextCapsule",
                        description: "Create a context capsule markdown file on Drive and link it to a project.",
                        parameters: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, content: { type: Type.STRING }, targetId: { type: Type.STRING }, targetType: { type: Type.STRING } }, required: ["title", "content", "targetId", "targetType"] }
                    },
                    {
                        name: "readContextCapsule",
                        description: "Read context capsule from Drive using fileId.",
                        parameters: { type: Type.OBJECT, properties: { fileId: { type: Type.STRING } }, required: ["fileId"] }
                    },
                    {
                        name: "readGitHubCode",
                        description: "Read code from GitHub repo using file path.",
                        parameters: { type: Type.OBJECT, properties: { filePath: { type: Type.STRING } }, required: ["filePath"] }
                    }
                ]
            }],
            responseMimeType: "application/json",
            responseSchema: focusUpdateSchema
        }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
        history.push({ role: 'model', parts: response.functionCalls.map(c => ({ functionCall: c })) });
        
        const functionResponses = [];
        let memoryMutated = false;
        
        for (const call of response.functionCalls) {
            let result: any;
            try {
                if (call.name === 'addLearnedTruth') {
                    const args = call.args as any;
                    memoryState.learned_truths.push(args.truth);
                    result = { success: true, message: `Learned truth added.` };
                    memoryMutated = true;
                } else if (call.name === 'addGraphNode') {
                    const args = call.args as any;
                    memoryState.knowledge_graph.nodes.push({ id: args.id, label: args.label, type: args.type });
                    result = { success: true, message: `Graph node added.` };
                    memoryMutated = true;
                } else if (call.name === 'addGraphEdge') {
                    const args = call.args as any;
                    const sourceExists = memoryState.knowledge_graph.nodes.some((n: any) => n.id === args.source);
                    const targetExists = memoryState.knowledge_graph.nodes.some((n: any) => n.id === args.target);
                    if (!sourceExists || !targetExists) {
                        throw new Error(`Invalid edge: source or target node does not exist in the graph.`);
                    }
                    memoryState.knowledge_graph.edges.push({ source: args.source, target: args.target, relation: args.relation });
                    result = { success: true, message: `Graph edge added.` };
                    memoryMutated = true;
                } else if (call.name === 'archiveProject') {
                    const args = call.args as any;
                    const proj = memoryState.active_projects.find((p: any) => p.id === args.id);
                    if (proj) {
                        proj.status = 'archived';
                        result = { success: true, message: `Project ${args.id} archived.` };
                        memoryMutated = true;
                    } else {
                        throw new Error(`Project ${args.id} not found.`);
                    }
                } else if (call.name === 'archiveLearnedTruth') {
                    const args = call.args as any;
                    if (args.index >= 0 && args.index < memoryState.learned_truths.length) {
                        const removed = memoryState.learned_truths.splice(args.index, 1);
                        result = { success: true, message: `Learned truth removed: ${removed[0]}` };
                        memoryMutated = true;
                    } else {
                        throw new Error(`Invalid index: ${args.index}`);
                    }
                } else if (call.name === 'createContextCapsule') {
                    const args = call.args as any;
                    const folderId = await ensureFolderExists();
                    const fileId = await createFile(args.title, args.content, folderId, 'text/markdown');
                    
                    if (args.targetType === 'project') {
                        const proj = memoryState.active_projects.find((p: any) => p.id === args.targetId);
                        if (proj) {
                            proj.detailed_spec_file_id = fileId;
                        }
                    }
                    result = { success: true, fileId, message: `File created and linked to ${args.targetId}` };
                } else if (call.name === 'readContextCapsule') {
                    const args = call.args as any;
                    let content = await readFile(args.fileId);
                    if (content.length > 15000) {
                        content = content.substring(0, 15000) + "\n\n...[SYSTEM WARNING: FILE CONTENT TRUNCATED DUE TO COGNITIVE LIMITS.]";
                    }
                    result = { success: true, content };
                } else if (call.name === 'readGitHubCode') {
                    const args = call.args as any;
                    const url = `https://raw.githubusercontent.com/bjud-in-oss/ouroboros-memory-interface/main/${args.filePath}`;
                    const res = await fetch(url);
                    if (!res.ok) throw new Error(`GitHub fetch failed: ${res.statusText}`);
                    let content = await res.text();
                    if (content.length > 15000) {
                        content = content.substring(0, 15000) + "\n\n...[SYSTEM WARNING: FILE CONTENT TRUNCATED DUE TO COGNITIVE LIMITS.]";
                    }
                    result = { success: true, content };
                } else {
                    throw new Error(`Unknown tool: ${call.name}`);
                }
            } catch (err: any) {
                result = { error: err.message || JSON.stringify(err) };
            }
            
            functionResponses.push({
                functionResponse: {
                    name: call.name,
                    response: result
                }
            });
        }
        
        if (memoryMutated) {
            try {
                await saveState({
                    app_version: "1.0.0",
                    last_sync_timestamp: Date.now(),
                    memory: memoryState,
                    focus: currentFocus
                });
            } catch (err: any) {
                console.error("Atomic save failed after tool execution", err);
            }
        }
        
        history.push({ role: 'user', parts: functionResponses });
    } else {
        history.push({ role: 'model', parts: [{ text: response.text || '' }] });
        
        if (response.text) {
             const parsed = JSON.parse(response.text);
             finalResponseText = parsed.text_response || "System error: No response generated.";
             finalFocus = parsed.updated_focus || currentFocus;
        }
        break; // End of interaction
    }
 }

 return {
    response: finalResponseText,
    newMemory: memoryState,
    newFocus: finalFocus
 };
};