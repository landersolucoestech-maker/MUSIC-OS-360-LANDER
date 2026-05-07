# MUSIC OS 360

Sistema de gestão musical multi-tenant. Modo standalone — opera 100% no
navegador (mock layer + `localStorage`), sem backend.

## Como rodar

```
npm install
npm run dev
```

A aplicação fica disponível em `http://localhost:5000`.

## Arquitetura

- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn UI.
- **State/queries**: TanStack Query.
- **Persistência**: `client/src/data/mockData.ts` (`MOCK_DATA`,
  `saveMockData`, `resetMockData`) com snapshot serializado em
  `localStorage` (chave `musicos360_mock_data`).
- **Auth**: contexto fixo em `MOCK_USER` (admin), sem login real.
- **Multi-tenancy**: `MOCK_ORG_ID` único por padrão; o filtro `org_id`
  segue presente nos hooks para preservar o modelo de dados.

## Reset de dados

Em **Configurações → Geral**:

- **Carregar dados de demonstração** chama `resetMockData()` e recarrega
  a página com o seed inicial.
- **Limpar dados de demonstração** remove a chave `musicos360_mock_data` do
  `localStorage` e recarrega a página.

## Integrações externas

Todas as integrações externas (Spotify, YouTube, Apple Music, Deezer,
SoundCloud, ABRAMUS, Autentique, Resend, IA Criativa, Meta Ads) estão
desativadas neste modo standalone. Os hooks correspondentes lançam
`DisabledIntegrationError` (`client/src/lib/disabled-integration.ts`,
status 503, code `integration_disabled`) com a mensagem
"Integração desativada — backend não configurado".

Para reativar qualquer uma delas, será necessário plugar um backend real
nos respectivos hooks (`client/src/hooks/use*.ts`).
