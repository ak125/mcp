import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';

// Environment variables
const PORT = parseInt(process.env.PORT || '3001');
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize clients - ONLY HERE in MCP Server
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Redis optional (pour développement)
let redis: Redis | null = null;
try {
  redis = new Redis(REDIS_URL, {
    retryDelayOnFailover: 1000,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    lazyConnect: true, // Ne se connecte que lors de la première utilisation
  });
  
  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (error) => {
    console.warn('⚠️ Redis error:', error.message);
    redis = null; // Désactiver Redis en cas d'erreur
  });
  
  // Test de connexion
  await redis.ping();
} catch (error) {
  console.warn('⚠️ Redis not available, caching disabled');
  redis = null;
}

// Fastify instance
const app = Fastify({ 
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }
});

// Middleware
await app.register(cors, { origin: true });
await app.register(helmet);
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute'
});

// Swagger documentation
await app.register(swagger, {
  swagger: {
    info: {
      title: 'MCP Server API',
      description: 'Centralized API for all data access',
      version: '1.0.0'
    },
    host: `localhost:${PORT}`,
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  }
});

await app.register(swaggerUi, {
  routePrefix: '/docs',
  uiConfig: {
    docExpansion: 'full',
    deepLinking: false
  }
});

// ===== ZOD SCHEMAS =====
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['user', 'admin']).default('user'),
  avatar_url: z.string().url().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const CreateUserSchema = UserSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

export const UpdateUserSchema = CreateUserSchema.partial();

export const OrderSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string(),
    quantity: z.number().positive(),
    price: z.number().positive()
  })),
  total: z.number().positive(),
  status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

export const CreateOrderSchema = OrderSchema.omit({ 
  id: true, 
  created_at: true, 
  updated_at: true 
});

// ===== UTILITY FUNCTIONS =====
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function getCachedOrFetch<T>(
  cacheKey: string, 
  fetcher: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  if (!redis) {
    // Pas de cache, exécuter directement
    return await fetcher();
  }
  
  const cached = await redis.get(cacheKey);
  if (cached) {
    app.log.info(`Cache hit: ${cacheKey}`);
    return JSON.parse(cached);
  }
  
  const data = await fetcher();
  await redis.setex(cacheKey, ttl, JSON.stringify(data));
  app.log.info(`Cache set: ${cacheKey}`);
  return data;
}

async function invalidateCache(pattern: string): Promise<void> {
  if (!redis) return; // Pas de cache à invalider
  
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
    app.log.info(`Cache invalidated: ${keys.length} keys matching ${pattern}`);
  }
}

// ===== USER ENDPOINTS =====
app.get('/api/users', {
  schema: {
    description: 'Get all users',
    tags: ['Users'],
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                name: { type: 'string' },
                role: { type: 'string' },
                avatar_url: { type: 'string' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  return getCachedOrFetch('users:all', async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw new Error(error.message);
    return { data };
  });
});

app.get('/api/users/:id', {
  schema: {
    description: 'Get user by ID',
    tags: ['Users'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              avatar_url: { type: 'string' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  
  return getCachedOrFetch(`user:${id}`, async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw new Error(error.message);
    return { data };
  });
});

app.post('/api/users', {
  schema: {
    description: 'Create new user',
    tags: ['Users'],
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string', minLength: 1 },
        role: { type: 'string', enum: ['user', 'admin'] },
        avatar_url: { type: 'string', format: 'uri' }
      },
      required: ['email', 'name']
    },
    response: {
      201: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              avatar_url: { type: 'string' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const body = request.body as any; // On utilise any car Fastify valide déjà
  const id = nanoid();
  
  const { data, error } = await supabase
    .from('users')
    .insert({
      ...body,
      id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  // Invalidate cache
  await invalidateCache('users:*');
  
  reply.code(201);
  return { data };
});

app.patch('/api/users/:id', {
  schema: {
    description: 'Update user',
    tags: ['Users'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    },
    body: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        name: { type: 'string', minLength: 1 },
        role: { type: 'string', enum: ['user', 'admin'] },
        avatar_url: { type: 'string', format: 'uri' }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              email: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              avatar_url: { type: 'string' },
              created_at: { type: 'string' },
              updated_at: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  const body = request.body as any;
  
  const { data, error } = await supabase
    .from('users')
    .update({
      ...body,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw new Error(error.message);
  
  // Invalidate cache
  await invalidateCache(`user:${id}`);
  await invalidateCache('users:*');
  
  return { data };
});

app.delete('/api/users/:id', {
  schema: {
    description: 'Delete user',
    tags: ['Users'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' }
      }
    },
    response: {
      204: {
        type: 'null'
      }
    }
  }
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', id);
  
  if (error) throw new Error(error.message);
  
  // Invalidate cache
  await invalidateCache(`user:${id}`);
  await invalidateCache('users:*');
  
  reply.code(204);
  return null;
});

// ===== ORDER ENDPOINTS =====
app.get('/api/orders', {
  schema: {
    description: 'Get all orders',
    tags: ['Orders'],
    querystring: {
      type: 'object',
      properties: {
        user_id: { type: 'string', format: 'uuid' },
        status: { type: 'string' },
        limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        offset: { type: 'number', minimum: 0, default: 0 }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                user_id: { type: 'string' },
                items: { type: 'array' },
                total: { type: 'number' },
                status: { type: 'string' },
                created_at: { type: 'string' },
                updated_at: { type: 'string' }
              }
            }
          },
          meta: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              limit: { type: 'number' },
              offset: { type: 'number' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  const { user_id, status, limit = 20, offset = 0 } = request.query as any;
  
  const cacheKey = `orders:${JSON.stringify({ user_id, status, limit, offset })}`;
  
  return getCachedOrFetch(cacheKey, async () => {
    let query = supabase.from('orders').select('*', { count: 'exact' });
    
    if (user_id) query = query.eq('user_id', user_id);
    if (status) query = query.eq('status', status);
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw new Error(error.message);
    
    return {
      data,
      meta: {
        total: count || 0,
        limit,
        offset
      }
    };
  }, 60); // Cache for 1 minute
});

// ===== HEALTH CHECK =====
app.get('/health', {
  schema: {
    description: 'Health check endpoint',
    tags: ['Health'],
    response: {
      200: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string' },
          services: {
            type: 'object',
            properties: {
              database: { type: 'string' },
              cache: { type: 'string' }
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  // Check Supabase connection
  let dbStatus = 'ok';
  try {
    await supabase.from('users').select('count', { count: 'exact', head: true });
  } catch (error) {
    dbStatus = 'error';
  }
  
  // Check Redis connection
  let cacheStatus = 'disabled';
  if (redis) {
    try {
      await redis.ping();
      cacheStatus = 'ok';
    } catch (error) {
      cacheStatus = 'error';
    }
  }
  
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: dbStatus,
      cache: cacheStatus
    }
  };
});

// ===== TYPE GENERATION ENDPOINT =====
app.get('/api/types', {
  schema: {
    description: 'Get TypeScript types and schemas',
    tags: ['Developer'],
    response: {
      200: {
        type: 'object',
        properties: {
          schemas: { type: 'object' },
          types: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  return {
    schemas: {
      User: UserSchema,
      CreateUser: CreateUserSchema,
      UpdateUser: UpdateUserSchema,
      Order: OrderSchema,
      CreateOrder: CreateOrderSchema
    },
    types: `
// Auto-generated types from MCP Server
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUser {
  email: string;
  name: string;
  role?: 'user' | 'admin';
  avatar_url?: string;
}

export interface UpdateUser {
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
  avatar_url?: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface CreateOrder {
  user_id: string;
  items: Array<{
    product_id: string;
    quantity: number;
    price: number;
  }>;
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}
    `.trim()
  };
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  app.log.error(error);
  reply.code(500).send({ 
    error: 'Internal Server Error',
    message: error.message 
  });
});

// Start server
try {
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`🚀 MCP Server running on http://localhost:${PORT}`);
  app.log.info(`📚 API Documentation: http://localhost:${PORT}/docs`);
  app.log.info(`🏥 Health Check: http://localhost:${PORT}/health`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
