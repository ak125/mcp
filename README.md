# MCP  - Architecture Simple et Efficace

## 🎯 Vue d'ensemble

Architecture **ultra-simple** qui garde toute l'efficacité de votre stack :
- **Supabase** + **Redis** centralisés dans le MCP Server
- **NestJS** backend + **Remix** frontend utilisent uniquement l'API MCP
- **Shadcn UI** + **Zustand** + **TypeScript** + **Zod** validation
- **Une seule règle** : Tout passe par l'API MCP

## 🚀 Quick Start

```bash
# Installation
cd 
npm run install:all

# Démarrage (avec Redis local)
npm run dev

# URLs
- Frontend: http://localhost:3000
- MCP Server: http://localhost:3001 
- API Docs: http://localhost:3001/docs
- Backend: http://localhost:3002
```

## 📁 Structure

```
v2/
├── mcp-server/     # Source unique (Fastify + Supabase + Redis)
├── web/            # Remix + Shadcn UI + Zustand
├── backend/        # NestJS (jobs, services, CRON)
├── shared/         # Types auto-générés
└── docker-compose.yml
```

## 🔧 Configuration

### 1. Variables d'environnement
```bash
# mcp-server/.env
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key  
REDIS_URL=redis://localhost:6379
```

### 2. Base de données Supabase
Créez ces tables dans Supabase :

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT DEFAULT 'user',
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table  
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  items JSONB NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 💻 Développement

### ✅ Utilisation correcte (Frontend/Backend)
```typescript
import { api } from '../shared/api';
import type { User, CreateUser } from '../shared/types';

// Récupérer des données
const { data: users } = await api.get<User[]>('/users');

// Créer 
const { data: user } = await api.post<User>('/users', userData);

// Modifier
const { data: updated } = await api.patch<User>(`/users/${id}`, changes);
```

### ❌ Utilisation interdite
```typescript
// 🚫 INTERDIT - Accès direct (bloqué par ESLint)
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
```

### 🔄 Types auto-générés
```bash
# Générer les types depuis le MCP Server
npm run generate

# Les types sont créés dans shared/types.ts et shared/api.ts
```

## 🎨 Frontend (Remix + Shadcn UI)

### Installation Shadcn UI
```bash
cd web/
npx shadcn-ui@latest init
npx shadcn-ui@latest add button card form input label toast
```

### Exemple de composant
```typescript
import { useLoaderData } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { api } from "../../shared/api";

export async function loader() {
  const { data: users } = await api.get('/users');
  return { users };
}

export default function Users() {
  const { users } = useLoaderData<typeof loader>();
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Users</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <h3 className="font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <Button variant="outline" size="sm" className="mt-2">
              View Profile
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## 🏗️ Backend (NestJS)

### Exemple de service
```typescript
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { api } from '../../shared/api';

@Injectable()
export class OrderService {
  async processOrder(userId: string) {
    // Récupérer user via MCP
    const { data: user } = await api.get(`/users/${userId}`);
    
    if (user.role !== 'admin') {
      throw new Error('Unauthorized');
    }
    
    // Créer commande via MCP
    const { data: order } = await api.post('/orders', {
      user_id: userId,
      items: [],
      total: 0,
      status: 'processing'
    });
    
    return order;
  }
  
  @Cron('0 */10 * * * *') // Toutes les 10 minutes
  async cleanupOrders() {
    const { data: orders } = await api.get('/orders?status=pending');
    // Cleanup logic...
  }
}
```

## 🛡️ Sécurité

### ESLint Rule (Une seule règle pour tous)
```javascript
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        '@supabase/supabase-js',
        'ioredis',
        'redis',
        '@prisma/client',
        'pg',
        'mysql*',
        'mongodb'
      ],
      message: '🚫 Accès data uniquement via l\'API MCP sur :3001'
    }]
  }
};
```

## 🐳 Production (Docker)

```bash
# Build et démarrage
docker-compose up --build

# Environnement complet avec Redis inclus
```

## 📊 Monitoring

### Health Check
```bash
curl http://localhost:3001/health
```

### API Documentation
```
http://localhost:3001/docs
```

### Logs centralisés
Tous les logs sont dans le MCP Server avec Pino.

## 🎯 Avantages de cette approche

### ✅ Simplicité maximale
- **3 dossiers** au lieu de 15 packages
- **1 règle** : tout passe par l'API MCP  
- **Setup en 10 minutes**

### ✅ Stack complète préservée
- Supabase + Redis + NestJS + Remix + Shadcn UI
- Performance cache Redis intégrée
- Types TypeScript auto-générés
- Validation Zod partout

### ✅ Sécurité robuste
- Accès DB/Cache impossible en dehors du MCP Server
- ESLint bloque les imports directs
- API centralisée avec rate limiting

### ✅ Developer Experience
- Documentation Swagger auto-générée
- Types partagés automatiques
- Hot reload sur tous les services
- Debugging facilité

---

**Cette architecture simple est prête pour la production !** 🚀
