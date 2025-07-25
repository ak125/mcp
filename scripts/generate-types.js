#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Charger la configuration
const config = require('./types-config.js');

console.log('🔄 Génération des types depuis le serveur MCP...');
console.log('📋 Configuration:', JSON.stringify(config, null, 2));

// Fonction pour générer conditionellement
const generateIf = (condition, content) => condition ? content : '';

// Types basés sur les schémas Zod du serveur MCP
const types = `// Auto-generated types - DO NOT EDIT MANUALLY
// Generated at: ${new Date().toISOString()}
// Configuration: voir scripts/types-config.js

${generateIf(config.entities.User, `
${config.options.generateComments ? '/** Utilisateur de l\'application */' : ''}
export interface User {
  id: string;
  email: string;
  name: string;
  ${config.options.includeTimestamps ? 'created_at: string;\n  updated_at: string;' : ''}
}
`)}

${generateIf(config.entities.User && config.requests.create, `
${config.options.generateComments ? '/** Données pour créer un utilisateur */' : ''}
export interface CreateUserRequest {
  email: string;
  name: string;
}
`)}

${generateIf(config.entities.User && config.requests.update, `
${config.options.generateComments ? '/** Données pour mettre à jour un utilisateur */' : ''}
export interface UpdateUserRequest {
  email?: string;
  name?: string;
}
`)}

${generateIf(config.entities.Order, `
${config.options.generateComments ? '/** Commande de l\'application */' : ''}
export interface Order {
  id: string;
  user_id: string;
  total: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  ${config.options.includeTimestamps ? 'created_at: string;\n  updated_at: string;' : ''}
}
`)}

${generateIf(config.entities.Order && config.requests.create, `
${config.options.generateComments ? '/** Données pour créer une commande */' : ''}
export interface CreateOrderRequest {
  user_id: string;
  total: number;
  status?: Order['status'];
}
`)}

${generateIf(config.entities.Order && config.requests.update, `
${config.options.generateComments ? '/** Données pour mettre à jour une commande */' : ''}
export interface UpdateOrderRequest {
  total?: number;
  status?: Order['status'];
}
`)}

${generateIf(config.utilities.ApiResponse, `
${config.options.generateComments ? '/** Réponse standard de l\'API */' : ''}
export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  message?: string;
}
`)}

${generateIf(config.utilities.HealthStatus, `
${config.options.generateComments ? '/** Status de santé des services */' : ''}
export interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
    cache: 'connected' | 'disconnected' | 'disabled';
  };
  version: string;
}
`)}

${generateIf(config.utilities.ApiEndpoints, `
${config.options.generateComments ? '/** Types des endpoints API */' : ''}
export interface ApiEndpoints {
  ${generateIf(config.endpoints.users && config.entities.User, `
  // Users
  'GET /api/users': { response: ApiResponse<User[]> };
  ${config.requests.create ? `'POST /api/users': { body: CreateUserRequest; response: ApiResponse<User> };` : ''}
  'GET /api/users/:id': { params: { id: string }; response: ApiResponse<User> };
  ${config.requests.update ? `'PUT /api/users/:id': { params: { id: string }; body: UpdateUserRequest; response: ApiResponse<User> };` : ''}
  'DELETE /api/users/:id': { params: { id: string }; response: ApiResponse<{ deleted: boolean }> };
  `)}
  
  ${generateIf(config.endpoints.orders && config.entities.Order, `
  // Orders
  'GET /api/orders': { response: ApiResponse<Order[]> };
  ${config.requests.create ? `'POST /api/orders': { body: CreateOrderRequest; response: ApiResponse<Order> };` : ''}
  'GET /api/orders/:id': { params: { id: string }; response: ApiResponse<Order> };
  ${config.requests.update ? `'PUT /api/orders/:id': { params: { id: string }; body: UpdateOrderRequest; response: ApiResponse<Order> };` : ''}
  'DELETE /api/orders/:id': { params: { id: string }; response: ApiResponse<{ deleted: boolean }> };
  `)}
  
  ${generateIf(config.endpoints.health, `
  // Health
  'GET /health': { response: HealthStatus };
  `)}
}
`)}

${generateIf(config.utilities.ApiEndpoints, `
// Utility types
export type ApiMethod = keyof ApiEndpoints;
export type ApiPath<T extends ApiMethod> = T;
export type ApiBody<T extends ApiMethod> = ApiEndpoints[T] extends { body: infer B } ? B : never;
export type ApiParams<T extends ApiMethod> = ApiEndpoints[T] extends { params: infer P } ? P : never;
export type ApiResponse<T extends ApiMethod> = ApiEndpoints[T] extends { response: infer R } ? R : never;
`)}
`;

// Créer le dossier shared s'il n'existe pas
const sharedDir = path.join(__dirname, '..', 'shared');
if (!fs.existsSync(sharedDir)) {
  fs.mkdirSync(sharedDir, { recursive: true });
}

// Écrire le fichier types
const typesPath = path.join(sharedDir, 'types.ts');
fs.writeFileSync(typesPath, types);

console.log('✅ Types générés dans', typesPath);
console.log('🎛️  Pour modifier les types générés, édite scripts/types-config.js');
