# ADR: CRM Canonico Musical

## Status

Proposto para fase futura.

## Decisao

Nao criar CRM novo na Fase 0. A base atual de `clients`, `leads` e `lead-interactions` sera auditada e depois migrada para um modelo canonico de contatos, organizacoes, artistas, oportunidades e timeline.

## Entidades futuras

- contacts
- companies
- artists
- opportunities
- pipelines
- pipeline_stages
- conversations
- messages
- tasks
- tags
- custom_fields
- activity_logs

## Motivo

O produto precisa evoluir para CRM musical sem duplicar logica existente nem quebrar modulos atuais.
