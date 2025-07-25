#!/bin/bash

# 🚀 Script de développement MCP V2
echo "🚀 MCP V2 - Démarrage environnement de développement"

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonction de logging
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifications pré-démarrage
log_info "Vérification de l'environnement..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js n'est pas installé"
    exit 1
fi

# Check ports disponibles
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null ; then
        log_error "Port $1 déjà utilisé"
        return 1
    fi
    return 0
}

log_info "Vérification des ports..."
check_port 3001 || exit 1  # MCP Server
check_port 3000 || exit 1  # Web
check_port 3002 || exit 1  # Backend

# Génération des types
log_info "Génération des types..."
npm run generate || {
    log_error "Échec génération des types"
    exit 1
}

log_success "Types générés"

# Créer les logs de démarrage
mkdir -p logs
touch logs/mcp-server.log logs/web.log logs/backend.log

# Démarrage des services
log_info "Démarrage des services..."

# Fonction de nettoyage
cleanup() {
    log_info "Arrêt des services..."
    pkill -f "npm run dev"
    exit 0
}

trap cleanup SIGINT

# Démarrer avec logs séparés
npm run dev:mcp > logs/mcp-server.log 2>&1 &
MCP_PID=$!

npm run dev:web > logs/web.log 2>&1 &
WEB_PID=$!

npm run dev:backend > logs/backend.log 2>&1 &
BACKEND_PID=$!

# Attendre que les services démarrent
log_info "Attente du démarrage des services..."
sleep 5

# Vérifier les services
check_service() {
    if curl -f -s $1 > /dev/null; then
        log_success "$2 démarré sur $1"
        return 0
    else
        log_error "$2 ne répond pas sur $1"
        return 1
    fi
}

# Health checks
log_info "Vérification des services..."
check_service "http://localhost:3001/health" "MCP Server"
check_service "http://localhost:3000" "Web App"
check_service "http://localhost:3002" "Backend"

log_success "🎉 Environnement de développement prêt !"
echo ""
echo "📊 Services disponibles:"
echo "   • MCP Server: http://localhost:3001"
echo "   • Web App:    http://localhost:3000"  
echo "   • Backend:    http://localhost:3002"
echo "   • API Docs:   http://localhost:3001/docs"
echo ""
echo "📝 Logs en temps réel:"
echo "   • tail -f logs/mcp-server.log"
echo "   • tail -f logs/web.log"
echo "   • tail -f logs/backend.log"
echo ""
echo "⏹️  Arrêt: Ctrl+C"

# Attendre
wait
