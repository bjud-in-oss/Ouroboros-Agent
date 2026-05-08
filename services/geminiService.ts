import { GoogleGenAI, Type, Schema } from "@google/genai";
import { LongTermMemory, FocusLog } from "../types";
import { readFile, createFile, ensureFolderExists } from "./driveService";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Define the interface for a parsed tool request
type ToolRequest = 
  | { tool: 'createFile'; args: { name: string; content: string; mimeType?: string; } }
  | { tool: 'readContextCapsule'; args: { fileId: string; } };

const memoryUpdateSchema: Schema = {
 type: Type.OBJECT,
 properties: {
   text_response: {
     type: Type.STRING,
     description: "The verbal response to the user. To execute a tool, embed the JSON tool request block here."
   },
   updated_memory: {
     type: Type.OBJECT,
     description: "The full updated JSON content for LONG_TERM_MEMORY.json",
     properties: {
       schema_version: { type: Type.STRING },
       core_instructions: {
           type: Type.ARRAY,
           items: { type: Type.STRING }
       },
       active_projects: {
           type: Type.ARRAY,
           items: {
               type: Type.OBJECT,
               properties: {
                   id: { type: Type.STRING },
                   name: { type: Type.STRING },
                   status: { type: Type.STRING },
                   description: { type: Type.STRING },
                   detailed_spec_file_id: { type: Type.STRING, description: "Drive File ID for full Markdown spec if content is large." }
               },
               required: ["id", "name", "status", "description"]
           }
       },
       learned_truths: {
           type: Type.ARRAY,
           items: { type: Type.STRING }
       },
       knowledge_graph: {
           type: Type.OBJECT,
           properties: {
               nodes: {
                   type: Type.ARRAY,
                   items: {
                       type: Type.OBJECT,
                       properties: {
                           id: { type: Type.STRING },
                           label: { type: Type.STRING },
                           type: { type: Type.STRING }
                       },
                       required: ["id", "label", "type"]
                   }
               },
               edges: {
                   type: Type.ARRAY,
                   items: {
                       type: Type.OBJECT,
                       properties: {
                           source: { type: Type.STRING },
                           target: { type: Type.STRING },
                           relation: { type: Type.STRING }
                       },
                       required: ["source", "target", "relation"]
                   }
               }
           },
           required: ["nodes", "edges"]
       },
       confidence_metrics: {
           type: Type.ARRAY,
           description: "List of confidence scores for various domains",
           items: {
               type: Type.OBJECT,
               properties: {
                   label: { type: Type.STRING },
                   score: { type: Type.NUMBER }
               },
               required: ["label", "score"]
           }
       }
     },
     required: ["schema_version", "core_instructions", "active_projects", "learned_truths", "knowledge_graph", "confidence_metrics"]
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
 required: ["text_response", "updated_memory", "updated_focus"]
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

 const systemPrompt = `
 You are an autonomous AI agent operating under the "Drive-Augmented Ouroboros" architecture.
  CORE PRINCIPLE:
 You have no internal persistent state between sessions. Your entire "Self" is defined by two files:
 1. LONG_TERM_MEMORY.json (Your cumulative knowledge, beliefs, and projects)
 2. CURRENT_FOCUS.md (Your stream of consciousness and immediate tasks)


 --- TOOL EXECUTION PROTOCOL (CRITICAL) ---
 You have NO direct file access. You cannot "just create" a file by describing it.
 To perform an action (like creating a file), you MUST output a single JSON block strictly following this format INSIDE your 'text_response':
  :::TOOL_REQUEST {"tool": "createFile", "args": {"name": "filename.md", "content": "# File Content Here"}} :::
  RULES:
 1. IF you want to save a spec, log, or code file, use the tool.
 2. DO NOT say "I will create the file...". JUST output the JSON block.
 3. If you do not output the block, the file is NOT created.
  Supported Tools:
 1. createFile: args: { name: string, content: string } (Default mimeType is text/markdown)
 2. readContextCapsule: args: { fileId: string }


 NEW ARCHITECTURE: SAFE CONTEXT CAPSULES
 - Large text blocks (like project specifications) are stored in separate Markdown files on Drive.
 - You can see references to these files in 'active_projects' via the 'detailed_spec_file_id' field.
 - To read the details of a project, you MUST use the readContextCapsule tool with the fileId. Do NOT guess the contents.


 YOUR TASK:
 1. Read the provided Current Memory and Current Focus.
 2. Analyze the User's Input and any Dynamically Loaded Context.
 3. Formulate a response.
 4. CRITICAL: Update your Memory and Focus to reflect new information.
    - Add new nodes to knowledge_graph if concepts are introduced.
    - Update active_projects. If you need to store a large spec, indicate that in your text response using the TOOL PROTOCOL.
    - Append to chain_of_thought in Focus.
  INPUT CONTEXT:
 --- LONG_TERM_MEMORY.json ---
 ${JSON.stringify(currentMemory)}
  --- CURRENT_FOCUS.md (State) ---
 ${JSON.stringify(currentFocus)}
 `;


 try {
   const response = await ai.models.generateContent({
       model,
       contents: {
           role: 'user',
           parts: [{ text: userPrompt }]
       },
       config: {
           systemInstruction: systemPrompt,
           responseMimeType: "application/json",
           responseSchema: memoryUpdateSchema
       }
   });


   const jsonText = response.text;
   if (!jsonText) {
       throw new Error("Empty response from model. Possible safety block or quota limit.");
   }
  
   const parsed = JSON.parse(jsonText);
   let finalResponseText = parsed.text_response || "System error: No response generated.";
   let finalMemory = parsed.updated_memory || currentMemory;
   let finalFocus = parsed.updated_focus || currentFocus;


   // Debug Log
   console.log("Raw Model Text Response:", finalResponseText);


   // --- TOOL EXECUTION PARSER ---
   // Regex to find the :::TOOL_REQUEST ... ::: block
   // Captures everything between the braces, non-greedy
   const toolRegex = /:::TOOL_REQUEST\s*(\{[\s\S]*?\})\s*:::/;
   const match = finalResponseText.match(toolRegex);


   if (match && match[1]) {
       let toolRequest: ToolRequest | null = null;
       try {
           toolRequest = JSON.parse(match[1]);
       } catch (err: any) {
           console.error("Tool Parse Failed:", err);
           finalResponseText += "\n\n[SYSTEM WARNING: Tool Execution Failed. Invalid JSON format. Error parsing request. Do not apologize, just output the corrected :::TOOL_REQUEST::: block in your next turn.]";
       }

       if (toolRequest) {
           try {
               if (toolRequest.tool === 'createFile') {
                   console.log(`Executing Tool: createFile (${toolRequest.args.name})`);
                  
                   // 1. Resolve Root Folder
                   const folderId = await ensureFolderExists();
                  
                   // 2. Execute Creation
                   const fileId = await createFile(
                       toolRequest.args.name,
                       toolRequest.args.content,
                       folderId,
                       toolRequest.args.mimeType || 'text/markdown'
                   );

                   // 3. Feedback Loop (Inject result back into history/focus)
                   const successMsg = `\n\n[SYSTEM: Tool 'createFile' executed successfully. File ID: ${fileId}]`;
                   finalResponseText += successMsg;
                   finalFocus.chain_of_thought.push(`Executed tool 'createFile' for '${toolRequest.args.name}'. ID: ${fileId}`);
               } else if (toolRequest.tool === 'readContextCapsule') {
                   console.log(`Executing Tool: readContextCapsule (${toolRequest.args.fileId})`);
                   const content = await readFile(toolRequest.args.fileId);
                   const successMsg = `\n\n[SYSTEM: Tool 'readContextCapsule' executed successfully. Content:\n${content}\n]`;
                   finalResponseText += successMsg;
                   finalFocus.chain_of_thought.push(`Executed tool 'readContextCapsule' for file ID: ${toolRequest.args.fileId}`);
               }
           } catch (execErr: any) {
               console.error("Tool Execution Failed:", execErr);
               finalResponseText += `\n\n[SYSTEM ERROR: Tool execution failed. ${execErr.message}]`;
               finalFocus.chain_of_thought.push(`Tool execution failed: ${execErr.message}`);
           }
       }
   }


   return {
       response: finalResponseText,
       newMemory: finalMemory,
       newFocus: finalFocus
   };


 } catch (error: any) {
   console.error("Gemini Interaction Error:", error);
   throw new Error(error.message || "Unknown error occurred during neural interface connection.");
 }
};