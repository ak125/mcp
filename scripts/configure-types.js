#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('🎛️  Configuration Interactive des Types\n');

const questions = [
  {
    key: 'entities.User',
    question: 'Générer les types User ? (y/N)',
    default: true
  },
  {
    key: 'entities.Order', 
    question: 'Générer les types Order ? (y/N)',
    default: true
  },
  {
    key: 'requests.create',
    question: 'Générer les types Create* ? (y/N)',
    default: true
  },
  {
    key: 'requests.update',
    question: 'Générer les types Update* ? (y/N)', 
    default: true
  },
  {
    key: 'endpoints.users',
    question: 'Générer les endpoints Users ? (y/N)',
    default: true
  },
  {
    key: 'endpoints.orders',
    question: 'Générer les endpoints Orders ? (y/N)',
    default: true
  },
  {
    key: 'utilities.ApiResponse',
    question: 'Générer le type ApiResponse ? (y/N)',
    default: true
  },
  {
    key: 'options.includeTimestamps',
    question: 'Inclure created_at/updated_at ? (y/N)',
    default: true
  }
];

async function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${question.question} `, (answer) => {
      const result = answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || 
                    (answer === '' && question.default);
      resolve({ key: question.key, value: result });
    });
  });
}

async function runConfig() {
  console.log('Répondez par y/n (entrée = défaut)\n');
  
  const answers = {};
  
  for (const question of questions) {
    const answer = await askQuestion(question);
    const keys = answer.key.split('.');
    if (!answers[keys[0]]) answers[keys[0]] = {};
    answers[keys[0]][keys[1]] = answer.value;
  }
  
  // Configuration finale
  const config = {
    entities: {
      User: answers.entities?.User ?? true,
      Order: answers.entities?.Order ?? true,
    },
    requests: {
      create: answers.requests?.create ?? true,
      update: answers.requests?.update ?? true,
      list: true,
    },
    endpoints: {
      users: answers.endpoints?.users ?? true,
      orders: answers.endpoints?.orders ?? true,
      health: true,
    },
    utilities: {
      ApiResponse: answers.utilities?.ApiResponse ?? true,
      HealthStatus: true,
      ApiEndpoints: true,
    },
    options: {
      includeTimestamps: answers.options?.includeTimestamps ?? true,
      strictTypes: true,
      generateComments: true,
      exportAll: true,
    }
  };

  // Sauvegarder la configuration
  const configPath = path.join(__dirname, 'types-config.js');
  const configContent = `// Configuration pour la génération de types
// Modifie ce fichier pour contrôler exactement quels types sont générés

module.exports = ${JSON.stringify(config, null, 2)};`;

  fs.writeFileSync(configPath, configContent);
  
  console.log('\n✅ Configuration sauvegardée !');
  console.log('📁 Fichier:', configPath);
  console.log('\n🔄 Lancement de la génération...');
  
  rl.close();
  
  // Lancer la génération
  require('./generate-types.js');
}

runConfig().catch(console.error);
