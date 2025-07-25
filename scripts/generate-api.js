#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Génération du client API typé...');

const apiClient = `// Auto-generated API client - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}

import type { ApiEndpoints, ApiMethod, ApiBody, ApiParams, ApiResponse } from './types';

export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export class ApiClient {
  private config: Required<ApiClientConfig>;

  constructor(config: ApiClientConfig) {
    this.config = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      headers: { 'Content-Type': 'application/json' },
      ...config,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithRetry(url: string, options: RequestInit, attempt = 1): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && attempt < this.config.retries) {
        console.warn(\`🔄 Tentative \${attempt}/\${this.config.retries} échouée pour \${url}, retry...\`);
        await this.delay(this.config.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      if (attempt < this.config.retries) {
        console.warn(\`🔄 Erreur réseau tentative \${attempt}/\${this.config.retries}, retry...\`);
        await this.delay(this.config.retryDelay * attempt);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  async request<T extends ApiMethod>(
    method: string,
    path: string,
    options?: {
      params?: ApiParams<T>;
      body?: ApiBody<T>;
      headers?: Record<string, string>;
    }
  ): Promise<ApiResponse<T>> {
    // Remplacer les paramètres dans l'URL
    let url = \`\${this.config.baseUrl}\${path}\`;
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        url = url.replace(\`:\${key}\`, String(value));
      });
    }

    const fetchOptions: RequestInit = {
      method,
      headers: options?.headers,
    };

    if (options?.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    try {
      const response = await this.fetchWithRetry(url, fetchOptions);
      
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(\`❌ Erreur API \${method} \${path}:\`, error);
      throw error;
    }
  }

  // Méthodes de convenance typées
  async get<T extends ApiMethod & \`GET \${string}\`>(
    path: string,
    options?: { params?: ApiParams<T>; headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path.replace('GET ', ''), options);
  }

  async post<T extends ApiMethod & \`POST \${string}\`>(
    path: string,
    options?: { params?: ApiParams<T>; body?: ApiBody<T>; headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path.replace('POST ', ''), options);
  }

  async put<T extends ApiMethod & \`PUT \${string}\`>(
    path: string,
    options?: { params?: ApiParams<T>; body?: ApiBody<T>; headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path.replace('PUT ', ''), options);
  }

  async delete<T extends ApiMethod & \`DELETE \${string}\`>(
    path: string,
    options?: { params?: ApiParams<T>; headers?: Record<string, string> }
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path.replace('DELETE ', ''), options);
  }
}

// Instance par défaut
export const api = new ApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
});

// Méthodes spécialisées pour une meilleure DX
export const userApi = {
  list: () => api.get('GET /api/users'),
  get: (id: string) => api.get('GET /api/users/:id', { params: { id } }),
  create: (data: ApiBody<'POST /api/users'>) => api.post('POST /api/users', { body: data }),
  update: (id: string, data: ApiBody<'PUT /api/users/:id'>) => 
    api.put('PUT /api/users/:id', { params: { id }, body: data }),
  delete: (id: string) => api.delete('DELETE /api/users/:id', { params: { id } }),
};

export const orderApi = {
  list: () => api.get('GET /api/orders'),
  get: (id: string) => api.get('GET /api/orders/:id', { params: { id } }),
  create: (data: ApiBody<'POST /api/orders'>) => api.post('POST /api/orders', { body: data }),
  update: (id: string, data: ApiBody<'PUT /api/orders/:id'>) => 
    api.put('PUT /api/orders/:id', { params: { id }, body: data }),
  delete: (id: string) => api.delete('DELETE /api/orders/:id', { params: { id } }),
};

export const healthApi = {
  check: () => api.get('GET /health'),
};
`;

// Créer le dossier shared s'il n'existe pas
const sharedDir = path.join(__dirname, '..', 'shared');
if (!fs.existsSync(sharedDir)) {
  fs.mkdirSync(sharedDir, { recursive: true });
}

// Écrire le fichier API client
const apiPath = path.join(sharedDir, 'api.ts');
fs.writeFileSync(apiPath, apiClient);

console.log('✅ Client API généré dans', apiPath);
