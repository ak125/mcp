// Configuration pour la génération de types
// Modifie ce fichier pour contrôler exactement quels types sont générés

module.exports = {
  "entities": {
    "User": true,
    "Order": false  // ❌ Désactiver Order pour tester
  },
  "requests": {
    "create": true,
    "update": false,  // ❌ Pas de Update* 
    "list": true
  },
  "endpoints": {
    "users": true,
    "orders": false,  // ❌ Pas d'endpoints Orders
    "health": true
  },
  "utilities": {
    "ApiResponse": true,
    "HealthStatus": true,
    "ApiEndpoints": true
  },
  "options": {
    "includeTimestamps": false,  // ❌ Pas de timestamps
    "strictTypes": true,
    "generateComments": true,
    "exportAll": true
  }
};