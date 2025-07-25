import fs from 'fs/promises';
import path from 'path';

// Generate TypeScript types from MCP Server schemas
async function generateTypes() {
  console.log('🔧 Generating types from MCP Server...');
  
  try {
    // Fetch types from MCP Server
    const response = await fetch('http://localhost:3001/api/types');
    if (!response.ok) {
      throw new Error('MCP Server not running. Start it first with: npm run dev:mcp');
    }
    
    const { types } = await response.json();
    
    // Ensure shared directory exists
    const sharedDir = path.join(process.cwd(), '..', 'shared');
    await fs.mkdir(sharedDir, { recursive: true });
    
    // Write types file
    const typesPath = path.join(sharedDir, 'types.ts');
    await fs.writeFile(typesPath, types);
    
    console.log('✅ Types generated successfully at:', typesPath);
    
    // Also generate API client
    const apiClient = `
// Auto-generated API client
export class ApiClient {
  constructor(private baseURL = 'http://localhost:3001/api') {}
  
  async get<T>(path: string): Promise<{ data: T }> {
    const res = await fetch(\`\${this.baseURL}\${path}\`);
    if (!res.ok) throw new Error(\`API Error: \${res.statusText}\`);
    return res.json();
  }
  
  async post<T>(path: string, data: any): Promise<{ data: T }> {
    const res = await fetch(\`\${this.baseURL}\${path}\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(\`API Error: \${res.statusText}\`);
    return res.json();
  }
  
  async patch<T>(path: string, data: any): Promise<{ data: T }> {
    const res = await fetch(\`\${this.baseURL}\${path}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(\`API Error: \${res.statusText}\`);
    return res.json();
  }
  
  async delete(path: string): Promise<void> {
    const res = await fetch(\`\${this.baseURL}\${path}\`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(\`API Error: \${res.statusText}\`);
  }
}

export const api = new ApiClient();
    `.trim();
    
    const clientPath = path.join(sharedDir, 'api.ts');
    await fs.writeFile(clientPath, apiClient);
    
    console.log('✅ API client generated at:', clientPath);
    
  } catch (error) {
    console.error('❌ Error generating types:', error.message);
    process.exit(1);
  }
}

generateTypes();
