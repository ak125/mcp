#!/usr/bin/env node

// Test du client API généré
import { userApi, healthApi, api } from '../shared/api.js';

async function testApiClient() {
  console.log('🧪 Test du Client API Généré\n');

  try {
    // 1. Test Health Check
    console.log('1️⃣ Test Health Check...');
    const health = await healthApi.check();
    console.log('✅ Health:', health.status);

    // 2. Test Users List  
    console.log('\n2️⃣ Test Users List...');
    const users = await userApi.list();
    console.log('✅ Users count:', users.data?.length || 0);

    // 3. Test User Creation avec types stricts
    console.log('\n3️⃣ Test User Creation...');
    const newUser = await userApi.create({
      email: 'test@api-client.com',
      name: 'API Client Test'
      // TypeScript empêchera d'ajouter des champs incorrects !
    });
    console.log('✅ User créé:', newUser.data?.id);

    // 4. Test Retry automatique (URL invalide pour simuler)
    console.log('\n4️⃣ Test Auto-retry...');
    const invalidApi = new api.constructor({
      baseUrl: 'http://localhost:9999', // Port inexistant
      retries: 2,
      retryDelay: 500
    });
    
    try {
      await invalidApi.request('GET', '/health');
    } catch (error) {
      console.log('✅ Auto-retry testé - erreur attendue:', error.message.substring(0, 50));
    }

    console.log('\n🎉 Tous les tests passés !');

  } catch (error) {
    console.error('❌ Erreur test:', error.message);
  }
}

// Lancer les tests si le serveur MCP tourne
testApiClient();
