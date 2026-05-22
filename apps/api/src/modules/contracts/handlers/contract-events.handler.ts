/**
 * contract-events.handler.ts
 *
 * Concrete automations triggered by contract domain events.
 *
 * ContractCreated    → activity log
 * ContractStatusChanged → activity log (before/after)
 * ContractSentForSignature → activity log
 * ContractSigned     → update artist to contratado + set contrato_id, email, juridico notification, activity log
 * ContractCancelled  → activity log
 * ContractExpiringSoon → activity log + notification queue
 * ContractExpired    → alert email + admin report
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ArtistEntity, TransactionEntity, ContractEntity } from '../../../database/entities';
import { QueueService } from '../../../core/queue/queue.service';
import { EventsService, DOMAIN_EVENTS } from '../../../core/events/events.service';
import { ActivityLogsService } from '../../activity-logs/activity-logs.service';
import { FinancialRulesService } from '../../financial-rules/financial-rules.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type {
  ContractCreatedPayload,
  ContractStatusChangedPayload,
  ContractSentForSignaturePayload,
  ContractSignedPayload,
  ContractCancelledPayload,
  ContractExpiringSoonPayload,
  ContractExpiredPayload,
} from '../../../core/events/domain-events.types';

@Injectable()
export class ContractEventsHandler {
  private readonly logger = new Logger(ContractEventsHandler.name);
  private readonly artistRepo:      Repository<ArtistEntity>      | null = null;
  private readonly transactionRepo: Repository<TransactionEntity> | null = null;
  private readonly contractRepo:    Repository<ContractEntity>    | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
    @Optional() private readonly activityLogs: ActivityLogsService,
    @Optional() private readonly events: EventsService,
    @Optional() private readonly financialRules: FinancialRulesService,
  ) {
    if (ds) {
      this.artistRepo      = ds.getRepository(ArtistEntity);
      this.transactionRepo = ds.getRepository(TransactionEntity);
      this.contractRepo    = ds.getRepository(ContractEntity);
    }
  }

  // ── CONTRACT_CREATED ──────────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_CREATED)
  async onContractCreated(event: DomainEvent<ContractCreatedPayload>): Promise<void> {
    const { contractId, titulo, tipo, artistId, createdBy } = event.payload;
    this.logger.log(`Contract created: "${titulo}" (${contractId}) tipo=${tipo} artist=${artistId ?? 'none'}`);

    if (this.activityLogs && createdBy) {
      try {
        await this.activityLogs.create(event.tenantId, createdBy, {
          entity_type:  'contract',
          entity_id:    contractId,
          action:       'created',
          description:  `Contrato "${titulo}" criado`,
          metadata:     { titulo, tipo, artistId, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for contract created "${contractId}" — ${String(err)}`);
      }
    }
  }

  // ── CONTRACT_STATUS_CHANGED ───────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_STATUS_CHANGED)
  async onContractStatusChanged(event: DomainEvent<ContractStatusChangedPayload>): Promise<void> {
    const { contractId, titulo, previousStatus, newStatus, changedBy } = event.payload;
    this.logger.log(`Contract status: "${titulo}" ${previousStatus} → ${newStatus} by ${changedBy}`);

    if (this.activityLogs && changedBy) {
      try {
        await this.activityLogs.create(event.tenantId, changedBy, {
          entity_type:  'contract',
          entity_id:    contractId,
          action:       'status_changed',
          description:  `Status do contrato "${titulo}": ${previousStatus} → ${newStatus}`,
          metadata:     { previousStatus, newStatus, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for contract status change "${contractId}" — ${String(err)}`);
      }
    }
  }

  // ── CONTRACT_SENT_FOR_SIGNATURE ───────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_SENT_FOR_SIGNATURE)
  async onContractSentForSignature(event: DomainEvent<ContractSentForSignaturePayload>): Promise<void> {
    const { contractId, titulo, autentiqueDocId, sentBy } = event.payload;
    this.logger.log(`Contract sent for signature: "${titulo}" (${contractId}) docId=${autentiqueDocId}`);

    if (this.activityLogs && sentBy) {
      try {
        await this.activityLogs.create(event.tenantId, sentBy, {
          entity_type:  'contract',
          entity_id:    contractId,
          action:       'sent_for_signature',
          description:  `Contrato "${titulo}" enviado para assinatura Autentique (doc=${autentiqueDocId})`,
          metadata:     { autentiqueDocId, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for contract sent "${contractId}" — ${String(err)}`);
      }
    }
  }

  // ── CONTRACT_SIGNED ───────────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_SIGNED)
  async onContractSigned(event: DomainEvent<ContractSignedPayload>): Promise<void> {
    const { contractId, titulo, artistId, signedBy, signedAt } = event.payload;

    // 1. Update linked artist: status → contratado + set contrato_id
    if (this.artistRepo && artistId) {
      try {
        await this.artistRepo.update(
          { id: artistId, tenant_id: event.tenantId },
          { status: 'contratado' as any, contrato_id: contractId, updated_by: signedBy } as any,
        );
        this.logger.log(`Artist "${artistId}" → contratado + contrato_id="${contractId}"`);
      } catch (err) {
        this.logger.error(`Failed to update artist status for "${artistId}" — ${String(err)}`);
      }
    }

    // 2. Create provisional transaction (receita agendada) if contract has valor
    if (this.transactionRepo && this.contractRepo) {
      try {
        const contract = await this.contractRepo
          .createQueryBuilder('c')
          .where('c.id = :id AND c.tenant_id = :tenantId', { id: contractId, tenantId: event.tenantId })
          .getOne();

        const contractValor = contract?.valor ? parseFloat(String(contract.valor)) : 0;

        if (contractValor > 0) {
          const provisional = this.transactionRepo.create({
            tenant_id:   event.tenantId,
            tipo:        'receita' as any,
            categoria:   'contratos',
            descricao:   `Receita prevista — contrato "${titulo}"`,
            valor:       String(contractValor),
            data:        new Date(),
            status:      'agendado' as any,
            artista_id:  artistId ?? null,
            contrato_id: contractId,
            created_by:  signedBy,
            updated_by:  signedBy,
            metadata:    { source: 'contract.signed', contractId, titulo },
          } as any);
          const savedTx = await this.transactionRepo.save(provisional as unknown as TransactionEntity);
          this.logger.log(`Provisional transaction "${savedTx.id}" (R$${contractValor}) created for contract "${contractId}"`);

          // Emit TRANSACTION_CREATED for the provisional transaction
          if (this.events) {
            this.events.emitTyped(DOMAIN_EVENTS.TRANSACTION_CREATED, {
              tenantId:      event.tenantId,
              userId:        signedBy,
              aggregateType: 'transaction',
              aggregateId:   savedTx.id,
              payload: {
                transactionId: savedTx.id,
                tenantId:      event.tenantId,
                tipo:          'receita',
                categoria:     'contratos',
                valor:         String(contractValor),
                contratoId:    contractId,
                artistaId:     artistId ?? null,
                createdBy:     signedBy,
              },
            });
          }

          // Evaluate financial rules for contract.signed
          if (this.financialRules) {
            this.financialRules.evaluateRules(event.tenantId, 'contract.signed', {
              entityId:   contractId,
              entityType: 'contract',
              valor:      contractValor,
              categoria:  'contratos',
            }).catch((err: unknown) =>
              this.logger.warn(`FinancialRules eval failed for contract.signed "${contractId}" — ${String(err)}`),
            );
          }
        }
      } catch (err) {
        this.logger.warn(`Failed to create provisional transaction for contract "${contractId}" — ${String(err)}`);
      }
    }

    // 4. Confirmation email to signatories
    if (this.queue) {
      try {
        await this.queue.addMail({
          template: 'contract-signed', contractId, titulo, signedBy, signedAt,
          artistId: artistId ?? null, tenantId: event.tenantId,
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue signed-contract email for "${contractId}" — ${String(err)}`);
      }
    }

    // 5. Juridico notification for contract filing
    if (this.queue) {
      try {
        await this.queue.addNotification({
          tenantId: event.tenantId, userId: 'role:juridico',
          type: 'contract.signed.juridico',
          title: `Contrato assinado para arquivo jurídico: "${titulo}"`,
          message: `O contrato "${titulo}" foi assinado por ${signedBy} em ${signedAt}.`,
          entityType: 'contract', entityId: contractId,
          metadata: { contractId, titulo, signedBy, signedAt, artistId: artistId ?? null, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue juridico notification for "${contractId}" — ${String(err)}`);
      }
    }

    // 6. Activity log
    if (this.activityLogs && signedBy) {
      try {
        await this.activityLogs.create(event.tenantId, signedBy, {
          entity_type:  'contract',
          entity_id:    contractId,
          action:       'signed',
          description:  `Contrato "${titulo}" assinado`,
          metadata:     { signedAt, artistId: artistId ?? null, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for contract signed "${contractId}" — ${String(err)}`);
      }
    }
  }

  // ── CONTRACT_CANCELLED ────────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_CANCELLED)
  async onContractCancelled(event: DomainEvent<ContractCancelledPayload>): Promise<void> {
    const { contractId, titulo, artistId, cancelledBy, cancelledAt } = event.payload;
    this.logger.log(`Contract cancelled: "${titulo}" (${contractId}) by ${cancelledBy}`);

    if (this.activityLogs && cancelledBy) {
      try {
        await this.activityLogs.create(event.tenantId, cancelledBy, {
          entity_type:  'contract',
          entity_id:    contractId,
          action:       'cancelled',
          description:  `Contrato "${titulo}" cancelado`,
          metadata:     { cancelledAt, artistId: artistId ?? null, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for contract cancelled "${contractId}" — ${String(err)}`);
      }
    }
  }

  // ── CONTRACT_EXPIRING_SOON ────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_EXPIRING_SOON)
  async onContractExpiringSoon(event: DomainEvent<ContractExpiringSoonPayload>): Promise<void> {
    const { contractId, titulo, artistId, dataFim, daysLeft } = event.payload;
    this.logger.warn(`Contract expiring soon: "${titulo}" (${contractId}) in ${daysLeft} days (${dataFim})`);

    // Notification queue for responsible team member
    if (this.queue) {
      try {
        await this.queue.addNotification({
          tenantId: event.tenantId,
          userId:   'role:manager',
          type:     'contract.expiring_soon',
          title:    `Contrato vencendo em ${daysLeft} dias: "${titulo}"`,
          message:  `O contrato "${titulo}" vence em ${dataFim}. Providencie renovação ou encerramento.`,
          entityType: 'contract', entityId: contractId,
          metadata: { contractId, titulo, dataFim, daysLeft, artistId: artistId ?? null, correlationId: event.correlationId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue expiry notification for "${contractId}" — ${String(err)}`);
      }
    }

    // Activity log (system-generated, no userId)
    if (this.activityLogs) {
      try {
        await this.activityLogs.create(event.tenantId, 'system', {
          entity_type:  'contract',
          entity_id:    contractId,
          action:       'expiring_soon',
          description:  `Contrato "${titulo}" vence em ${daysLeft} dias (${dataFim})`,
          metadata:     { dataFim, daysLeft, artistId: artistId ?? null },
        });
      } catch (err) {
        this.logger.warn(`Failed to write activity log for contract expiry "${contractId}" — ${String(err)}`);
      }
    }
  }

  // ── CONTRACT_EXPIRED ──────────────────────────────────────────────────────

  @OnEvent(DOMAIN_EVENTS.CONTRACT_EXPIRED)
  async onContractExpired(event: DomainEvent<ContractExpiredPayload>): Promise<void> {
    const { contractId, titulo, artistId, expiredAt } = event.payload;

    if (this.queue) {
      try {
        await this.queue.addMail({
          template: 'contract-expired-alert', contractId, titulo,
          artistId: artistId ?? null, expiredAt,
          tenantId: event.tenantId, correlationId: event.correlationId ?? null,
        });
        await this.queue.addReport('contract-expiry', {
          contractId, titulo, artistId: artistId ?? null, expiredAt,
          tenantId: event.tenantId, correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(`Failed to enqueue expiry jobs for "${contractId}" — ${String(err)}`);
      }
    }
  }
}
