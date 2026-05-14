#!/bin/bash
set -e

echo "MUSIC OS 360 — Setup Dev Environment"

# 1. Copiar .env de exemplo se não existir
if [ ! -f apps/api/.env ]; then
  cp apps/api/.env.example apps/api/.env
  echo "apps/api/.env criado — preencha as variáveis antes de iniciar"
fi

# 2. Instalar dependências
echo "Instalando dependências da API..."
cd apps/api && npm install && cd ../..

echo ""
echo "Setup concluído!"
echo "  Frontend:  npm run dev:web        → http://localhost:5000"
echo "  Backend:   cd apps/api && npm run dev → http://localhost:3001"
echo "  Swagger:   http://localhost:3001/docs"
echo ""
echo "Próximos passos:"
echo "  1. Configure apps/api/.env com as variáveis de ambiente (Neon, Clerk, Stripe, etc.)"
echo "  2. Execute: cd apps/api && npm run db:push"
