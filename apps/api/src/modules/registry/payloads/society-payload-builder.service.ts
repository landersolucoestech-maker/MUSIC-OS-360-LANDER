import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import {
  WorkEntity,
  PhonogramEntity,
  ShareEntity,
  ExternalIdentifierEntity,
} from '../../../database/entities';
import { IdentifierProvider, IdentifierType, RegistrableEntityType } from '@music-os-360/types';
import type {
  PayloadIdentifier,
  PayloadParty,
  RecordingRegistryPayload,
  WorkRegistryPayload,
} from './registry-payload.types';

function isPublisher(role: string | null | undefined): boolean {
  const r = (role ?? '').toLowerCase();
  return r.includes('publisher') || r.includes('editora') || r.includes('editor');
}

function shareToParty(s: ShareEntity): PayloadParty {
  const pct = Number(s.percentual ?? 0);
  return {
    name: (s.credited_name ?? s.titular_nome ?? '').trim(),
    document: s.titular_doc ?? null,
    role: s.role ?? s.papel ?? null,
    percentage: Number.isFinite(pct) ? pct : null,
    ipi_cae: null,
    society: null,
    territory: s.territory ?? null,
  };
}

@Injectable()
export class SocietyPayloadBuilderService {
  private readonly works: Repository<WorkEntity> | null = null;
  private readonly phonograms: Repository<PhonogramEntity> | null = null;
  private readonly shares: Repository<ShareEntity> | null = null;
  private readonly identifiers: Repository<ExternalIdentifierEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) {
      this.works = ds.getRepository(WorkEntity);
      this.phonograms = ds.getRepository(PhonogramEntity);
      this.shares = ds.getRepository(ShareEntity);
      this.identifiers = ds.getRepository(ExternalIdentifierEntity);
    }
  }

  private assertDb(): void {
    if (!this.works || !this.phonograms || !this.shares || !this.identifiers) {
      throw new BadRequestException('Database unavailable');
    }
  }

  private async loadIdentifiers(tenantId: string, entityType: RegistrableEntityType, entityId: string, legacy: PayloadIdentifier[]): Promise<PayloadIdentifier[]> {
    const rows = await this.identifiers!.find({ where: { tenant_id: tenantId, entity_type: entityType, entity_id: entityId } });
    const fromTable: PayloadIdentifier[] = rows.map((r) => ({
      provider: r.provider,
      type: r.identifier_type,
      value: r.identifier_value,
      is_primary: r.is_primary,
    }));
    // Legacy column identifiers only added when not already present in the table.
    const seen = new Set(fromTable.map((i) => `${i.type}:${i.value}`));
    const merged = [...fromTable];
    for (const l of legacy) {
      if (l.value && !seen.has(`${l.type}:${l.value}`)) merged.push(l);
    }
    return merged;
  }

  async buildWorkPayload(tenantId: string, workId: string): Promise<WorkRegistryPayload> {
    this.assertDb();
    const work = await this.works!.findOne({ where: { id: workId, tenant_id: tenantId } });
    if (!work || work.deleted_at) throw new NotFoundException('Obra não encontrada');
    const shares = (await this.shares!.find({ where: { tenant_id: tenantId, obra_id: workId } })).filter((s) => !s.deleted_at);

    const legacy: PayloadIdentifier[] = [];
    if (work.iswc) legacy.push({ provider: IdentifierProvider.CISAC, type: IdentifierType.ISWC, value: work.iswc, is_primary: true });
    if (work.cod_abramus) legacy.push({ provider: IdentifierProvider.ABRAMUS, type: IdentifierType.ABRAMUS_PROTOCOL, value: work.cod_abramus, is_primary: false });
    if (work.cod_ecad) legacy.push({ provider: IdentifierProvider.ECAD, type: IdentifierType.ECAD_WORK_CODE, value: work.cod_ecad, is_primary: false });

    const parties = shares.map(shareToParty);
    return {
      kind: 'WORK',
      work: {
        id: work.id,
        title: work.titulo,
        alternative_titles: Array.isArray(work.alternative_titles) ? work.alternative_titles : [],
        type: work.tipo ?? null,
        genre: work.genero ?? null,
        language: work.language ?? null,
        iswc: work.iswc ?? null,
        duration_seconds: work.duration_seconds ?? null,
        is_instrumental: work.is_instrumental ?? null,
      },
      authors: parties.filter((p) => !isPublisher(p.role)),
      publishers: parties.filter((p) => isPublisher(p.role)),
      splits: parties,
      identifiers: await this.loadIdentifiers(tenantId, RegistrableEntityType.WORK, workId, legacy),
      ai_declaration: {
        ai_used: work.ai_used === true,
        ai_tools: Array.isArray(work.ai_tools) ? work.ai_tools : [],
        ai_prompts: Array.isArray(work.ai_prompts) ? work.ai_prompts : [],
      },
      metadata: { external_reference: work.external_reference ?? null },
    };
  }

  async buildRecordingPayload(tenantId: string, recordingId: string): Promise<RecordingRegistryPayload> {
    this.assertDb();
    const rec = await this.phonograms!.findOne({ where: { id: recordingId, tenant_id: tenantId } });
    if (!rec || rec.deleted_at) throw new NotFoundException('Fonograma não encontrado');
    const shares = (await this.shares!.find({ where: { tenant_id: tenantId, fonograma_id: recordingId } })).filter((s) => !s.deleted_at);

    const legacy: PayloadIdentifier[] = [];
    if (rec.isrc) legacy.push({ provider: IdentifierProvider.ISRC, type: IdentifierType.ISRC, value: rec.isrc, is_primary: true });
    if (rec.cod_abramus) legacy.push({ provider: IdentifierProvider.ABRAMUS, type: IdentifierType.ABRAMUS_PROTOCOL, value: rec.cod_abramus, is_primary: false });

    return {
      kind: 'RECORDING',
      recording: {
        id: rec.id,
        title: rec.titulo,
        version_title: rec.version_title ?? null,
        isrc: rec.isrc ?? null,
        duration_seconds: rec.duration_seconds ?? null,
        recording_date: rec.recording_date ? rec.recording_date.toISOString() : null,
        release_date: rec.release_date ? rec.release_date.toISOString() : null,
        copyright_year: rec.copyright_year ?? null,
        copyright_owner: rec.copyright_owner ?? null,
        country_of_recording: rec.country_of_recording ?? null,
      },
      linked_work: { id: rec.obra_id ?? null },
      main_artist: { id: rec.main_artist_id ?? rec.artista_id ?? null },
      phonographic_producer: { id: rec.phonographic_producer_id ?? null },
      contributors: shares.map(shareToParty),
      identifiers: await this.loadIdentifiers(tenantId, RegistrableEntityType.RECORDING, recordingId, legacy),
      metadata: { external_reference: rec.external_reference ?? null },
    };
  }
}
