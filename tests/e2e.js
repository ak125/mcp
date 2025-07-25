#!/usr/bin/env node

// Tests E2E simples pour l'API MCP
const fetch = require('node-fetch').default || require('node-fetch');

// API client simple pour les tests
const api = {
  baseUrl: 'http://localhost:3001',
  
  async request(method, path, body) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(body && { body: JSON.stringify(body) })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
};

const userApi = {
  list: () => api.request('GET', '/api/users'),
  get: (id) => api.request('GET', `/api/users/${id}`),
  create: (data) => api.request('POST', '/api/users', data),
  update: (id, data) => api.request('PUT', `/api/users/${id}`, data),
  delete: (id) => api.request('DELETE', `/api/users/${id}`)
};

const healthApi = {
  check: () => api.request('GET', '/health')
};

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${color}${message}${colors.reset}`);
}

class E2ETestRunner {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async test(name, testFn) {
    process.stdout.write(`🧪 ${name}... `);
    
    try {
      await testFn();
      log(colors.green, '✅ PASS');
      this.passed++;
    } catch (error) {
      log(colors.red, `❌ FAIL: ${error.message}`);
      this.failed++;
    }
  }

  async expect(actual, expected, message = '') {
    if (actual !== expected) {
      throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
    }
  }

  async expectTruthy(value, message = '') {
    if (!value) {
      throw new Error(`Expected truthy value, got ${value}. ${message}`);
    }
  }

  async expectArray(value, minLength = 0, message = '') {
    if (!Array.isArray(value) || value.length < minLength) {
      throw new Error(`Expected array with min length ${minLength}, got ${value}. ${message}`);
    }
  }

  async runAll() {
    log(colors.blue, '🚀 Démarrage des tests E2E MCP\n');

    // Test 1: Health Check
    await this.test('Health Check', async () => {
      const health = await healthApi.check();
      this.expectTruthy(health.status, 'Health status should exist');
    });

    // Test 2: User CRUD complet
    let createdUserId;
    
    await this.test('Create User', async () => {
      const result = await userApi.create({
        email: 'test-e2e@example.com',
        name: 'E2E Test User'
      });
      
      this.expectTruthy(result.data?.id, 'User should have ID');
      this.expect(result.data?.email, 'test-e2e@example.com', 'Email should match');
      createdUserId = result.data.id;
    });

    await this.test('Get User by ID', async () => {
      const result = await userApi.get(createdUserId);
      this.expectTruthy(result.data?.id, 'User should exist');
      this.expect(result.data?.id, createdUserId, 'ID should match');
    });

    await this.test('List Users', async () => {
      const result = await userApi.list();
      this.expectArray(result.data, 1, 'Should have at least 1 user');
    });

    await this.test('Update User', async () => {
      const result = await userApi.update(createdUserId, {
        name: 'Updated E2E User'
      });
      this.expect(result.data?.name, 'Updated E2E User', 'Name should be updated');
    });

    await this.test('Delete User', async () => {
      const result = await userApi.delete(createdUserId);
      this.expectTruthy(result.data?.deleted, 'User should be deleted');
    });

    // Test 3: Gestion d'erreurs
    await this.test('Handle 404 Error', async () => {
      try {
        await userApi.get('non-existent-id');
        throw new Error('Should have thrown an error');
      } catch (error) {
        // C'est attendu
        this.expectTruthy(error.message, 'Should have error message');
      }
    });

    // Test 4: Performance
    await this.test('Response Time Check', async () => {
      const start = Date.now();
      await healthApi.check();
      const duration = Date.now() - start;
      
      if (duration > 1000) {
        throw new Error(`Response too slow: ${duration}ms`);
      }
    });

    // Résultats
    console.log('\n📊 Résultats des tests:');
    log(colors.green, `✅ Réussis: ${this.passed}`);
    if (this.failed > 0) {
      log(colors.red, `❌ Échoués: ${this.failed}`);
    }
    
    const total = this.passed + this.failed;
    const percentage = Math.round((this.passed / total) * 100);
    
    console.log(`📈 Taux de réussite: ${percentage}%\n`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Lancer les tests
const runner = new E2ETestRunner();
runner.runAll().catch(error => {
  log(colors.red, `💥 Erreur fatale: ${error.message}`);
  process.exit(1);
});
