#!/bin/bash
set -e

echo "MUSIC OS 360 — Setup Dev Environment"

# 1. Criar .env.development local se não existir (não há mais .env.example —
#    apps/api/.env.production documenta a lista completa de variáveis, com
#    placeholders; copie a estrutura e preencha com valores DEV reais)
if [ ! -f apps/api/.env.development ]; then
  cp apps/api/.env.production apps/api/.env.development
  echo "apps/api/.env.development criado a partir de apps/api/.env.production — preencha com valores DEV reais antes de iniciar"
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
echo "  1. Configure apps/api/.env.development com as variáveis de ambiente (Neon, Supabase Auth, Stripe, etc.)"
echo "  2. Execute: cd apps/api && npm run db:push"
