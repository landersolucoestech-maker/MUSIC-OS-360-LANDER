#!/bin/bash
set -e

echo "🎵 MUSIC OS 360° — Setup Dev Environment"

# 1. Copiar .env de exemplo se não existir
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "✅ apps/api/.env criado (preencha as variáveis antes de iniciar)"
fi

# 2. Instalar dependências
echo "📦 Instalando dependências da API..."
cd apps/api && npm install && cd ../..

# 3. Verificar se Docker está disponível
if command -v docker &> /dev/null; then
  echo "🐳 Subindo serviços Docker..."
  docker-compose -f infra/docker-compose.yml up -d
  echo "⏳ Aguardando PostgreSQL..."
  until docker exec musicos360-postgres pg_isready -U musicos360 -d musicos360_dev 2>/dev/null; do
    sleep 2
  done
  echo "✅ PostgreSQL pronto"
else
  echo "⚠️  Docker não disponível — use Neon.tech para PostgreSQL em desenvolvimento"
fi

echo ""
echo "✅ Setup concluído!"
echo "   Frontend:  npm run dev          → http://localhost:5000"
echo "   Backend:   cd apps/api && npm run dev → http://localhost:3001"
echo "   Swagger:   http://localhost:3001/docs"
echo ""
echo "📋 Próximos passos:"
echo "   1. Configure apps/api/.env com as variáveis de ambiente"
echo "   2. Fase 1: npx prisma migrate dev (em apps/api/)"
