import { z } from 'zod';

// Schémas de validation pour chaque service
export const mcpServerConfigSchema = z.object({
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const webConfigSchema = z.object({
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
  API_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SESSION_SECRET: z.string().min(32),
});

export const backendConfigSchema = z.object({
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_KEY: z.string().min(16),
});

// Types dérivés
export type McpServerConfig = z.infer<typeof mcpServerConfigSchema>;
export type WebConfig = z.infer<typeof webConfigSchema>;
export type BackendConfig = z.infer<typeof backendConfigSchema>;

// Fonction de validation avec messages d'erreur clairs
export function validateConfig<T>(
  schema: z.ZodSchema<T>,
  env: Record<string, string | undefined>,
  serviceName: string
): T {
  try {
    return schema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`❌ Configuration invalide pour ${serviceName}:`);
      
      for (const issue of error.issues) {
        const field = issue.path.join('.');
        const message = issue.message;
        const received = issue.received;
        
        console.error(`   • ${field}: ${message}${received ? ` (reçu: ${received})` : ''}`);
      }
      
      console.error('\\n🔧 Vérifiez votre fichier .env\\n');
      process.exit(1);
    }
    throw error;
  }
}

// Helper pour charger et valider la config
export function loadConfig<T>(
  schema: z.ZodSchema<T>,
  serviceName: string,
  envPath?: string
): T {
  // Charger le .env si spécifié
  if (envPath) {
    require('dotenv').config({ path: envPath });
  }
  
  return validateConfig(schema, process.env, serviceName);
}

// Génération de fichiers .env d'exemple
export function generateEnvExample(serviceName: string, schema: z.ZodSchema<any>): string {
  const shape = schema._def.shape();
  let content = `# Configuration ${serviceName}\n# Copiez ce fichier vers .env et remplissez les valeurs\n\n`;
  
  for (const [key, fieldSchema] of Object.entries(shape)) {
    // Extraire la description du schéma Zod si disponible
    const description = getFieldDescription(fieldSchema as any);
    if (description) {
      content += `# ${description}\n`;
    }
    
    // Exemple de valeur
    const example = getFieldExample(key, fieldSchema as any);
    content += `${key}=${example}\n\n`;
  }
  
  return content;
}

function getFieldDescription(schema: any): string | null {
  // Vous pouvez étendre ceci pour extraire des descriptions des schémas Zod
  return null;
}

function getFieldExample(key: string, schema: any): string {
  // Exemples basés sur le nom du champ
  if (key.includes('PORT')) return '3001';
  if (key.includes('URL') && key.includes('DATABASE')) return 'postgresql://user:pass@localhost:5432/dbname';
  if (key.includes('URL') && key.includes('REDIS')) return 'redis://localhost:6379';
  if (key.includes('URL')) return 'http://localhost:3001';
  if (key.includes('SECRET') || key.includes('KEY')) return 'your-secret-key-here-min-32-chars-long';
  if (key === 'NODE_ENV') return 'development';
  if (key === 'LOG_LEVEL') return 'info';
  
  return 'your-value-here';
}

// Utilitaire pour vérifier les variables d'environnement manquantes
export function checkRequiredEnvVars(required: string[]): void {
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Variables d\'environnement manquantes:');
    missing.forEach(key => console.error(`   • ${key}`));
    console.error('\n🔧 Vérifiez votre fichier .env\n');
    process.exit(1);
  }
}
