import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Type } from "@google/genai";

class MCPService {
    private client: Client | null = null;
    private transport: SSEClientTransport | null = null;

    async connect(url: string): Promise<Client> {
        if (this.client) {
            await this.disconnect();
        }

        try {
            this.transport = new SSEClientTransport(new URL(url));
            
            this.client = new Client(
                {
                    name: "ais-client",
                    version: "1.0.0",
                },
                {
                    capabilities: {},
                }
            );

            await this.client.connect(this.transport);
            return this.client;
        } catch (error) {
            console.error("Failed to connect to MCP server:", error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
        this.transport = null;
    }

    getClient(): Client | null {
        return this.client;
    }

    async getTools(): Promise<any[]> {
        if (!this.client) return [];
        
        try {
            const result = await this.client.listTools();
            return result.tools.map(tool => ({
                name: tool.name,
                description: tool.description || "",
                parameters: this.mapJsonSchemaToGeminiSchema(tool.inputSchema)
            }));
        } catch (error) {
            console.error("Failed to list MCP tools:", error);
            return [];
        }
    }

    async executeTool(name: string, args: any): Promise<any> {
        if (!this.client) {
            throw new Error("MCP client is not connected");
        }

        try {
            const result = await this.client.callTool({
                name,
                arguments: args
            });
            return result.content;
        } catch (error) {
            console.error(`Error executing MCP tool ${name}:`, error);
            throw error;
        }
    }

    private mapJsonSchemaToGeminiSchema(schema: any): any {
        if (!schema) return undefined;
        
        const result: any = { ...schema };
        
        if (typeof result.type === 'string') {
            const typeMap: Record<string, string> = {
                'string': Type.STRING,
                'number': Type.NUMBER,
                'integer': Type.INTEGER,
                'boolean': Type.BOOLEAN,
                'array': Type.ARRAY,
                'object': Type.OBJECT,
            };
            result.type = typeMap[result.type.toLowerCase()] || Type.STRING;
        }
        
        if (result.properties) {
            const newProperties: any = {};
            for (const key in result.properties) {
                newProperties[key] = this.mapJsonSchemaToGeminiSchema(result.properties[key]);
            }
            result.properties = newProperties;
        }
        
        if (result.items) {
            result.items = this.mapJsonSchemaToGeminiSchema(result.items);
        }
        
        return result;
    }
}

export const mcpService = new MCPService();

