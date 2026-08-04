/**
 * GUARDA PERMANENTE — formulário (DTO) ↔ contrato central ↔ importador.
 */
import 'reflect-metadata';
import { getMetadataStorage } from 'class-validator';
import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import { tryGetFieldLabelPtBr } from '../i18n/field-labels.pt-br';
import {
  REPORT_FORM_CONTRACTS,
  contractEncryptedFields,
  contractExportableColumns,
  contractImportableColumns,
  contractMetadataFields,
} from './report-form-contracts';
import {
  REPEATING_GROUP_EXPORT_RESOLVERS,
  REPEATING_GROUP_IMPORT_WRITERS,
} from '../computed-fields/registry';

import { CreateArtistDto } from '../../artists/dto/create-artist.dto';
import { CreateWorkDto } from '../../works/dto/create-work.dto';
import { CreatePhonogramDto } from '../../phonograms/dto/create-phonogram.dto';
import { CreateContractDto } from '../../contracts/dto/create-contract.dto';
import { CreateEmployeeDto } from '../../hr/dto/create-employee.dto';
import { CreateClientDto } from '../../clients/dto/clients.dto';
import { CreateProjectDto } from '../../projects/dto/projects.dto';
import { CreateLicenseDto } from '../../licensing/dto/licensing.dto';
import { CreateReleaseDto } from '../../releases/dto/releases.dto';
import { CreateShareDto } from '../../shares/dto/shares.dto';
import { CreateAudiovisualProjectDto } from '../../audiovisual/dto/audiovisual.dto';
import { CreateEventDto } from '../../events/dto/events.dto';
import { CreateInventoryItemDto } from '../../inventory/dto/inventory.dto';
import { CreateLeadDto } from '../../leads/dto/leads.dto';
import { CreateMarketingTaskDto } from '../../marketing/dto/marketing-tasks.dto';
import { CreateMarketingContentDto } from '../../marketing/dto/marketing-contents.dto';
import { CreateBriefingDto } from '../../briefings/dto/briefings.dto';

const FORM_DTO_BY_TABLE: Record<string, new () => object> = {
  artists: CreateArtistDto,
  works: CreateWorkDto,
  phonograms: CreatePhonogramDto,
  contracts: CreateContractDto,
  employees: CreateEmployeeDto,
  clients: CreateClientDto,
  projects: CreateProjectDto,
  licenses: CreateLicenseDto,
  releases: CreateReleaseDto,
  shares: CreateShareDto,
  audiovisual_projects: CreateAudiovisualProjectDto,
  events: CreateEventDto,
  inventory_items: CreateInventoryItemDto,
  leads: CreateLeadDto,
  marketing_tasks: CreateMarketingTaskDto,
  marketing_content_posts: CreateMarketingContentDto,
  briefings: CreateBriefingDto,
};

function dtoFields(dto: new () => object): string[] {
  const metas = getMetadataStorage().getTargetValidationMetadatas(dto, '', false, false);
  return Array.from(new Set(metas.map((m) => m.propertyName)));
}

describe('form-contracts — guarda permanente formulário ↔ contrato ↔ import/export', () => {
  const metadata = new EntityMetadataService();
  const inv = metadata.scan();
  const defs = new ReportEntityDefinitionService(metadata);
  const colsByTable = new Map(
    inv.entities.map((e) => [e.tableName, new Set(e.columns.map((c) => c.name))]),
  );

  it('toda tabela com DTO de formulário mapeado possui contrato central registrado', () => {
    for (const table of Object.keys(FORM_DTO_BY_TABLE)) {
      expect(REPORT_FORM_CONTRACTS[table]).toBeDefined();
    }
  });

  it('TODO campo do DTO do formulário está no contrato (coluna, alias ou exclusão documentada)', () => {
    const offenders: string[] = [];
    for (const [table, dto] of Object.entries(FORM_DTO_BY_TABLE)) {
      const contract = REPORT_FORM_CONTRACTS[table];
      const keys = new Set(contract.fields.map((f) => f.key));
      const aliases = contract.formFieldAliases ?? {};
      for (const field of dtoFields(dto)) {
        const covered =
          keys.has(field) ||
          aliases[field] !== undefined ||
          contract.excludedFormFields[field] !== undefined;
        if (!covered) offenders.push(`${table}.${field}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('todo alias aponta para uma key existente do contrato', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      const keys = new Set(contract.fields.map((f) => f.key));
      for (const [alias, target] of Object.entries(contract.formFieldAliases ?? {})) {
        if (!keys.has(target)) offenders.push(`${table}.${alias}→${target}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('toda coluna principal do contrato tem lastro físico', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      if (table === 'accounting_summary') continue;
      const real = colsByTable.get(table);
      expect(real).toBeDefined();
      const encrypted = contractEncryptedFields(contract);
      const metaFields = contractMetadataFields(contract);
      for (const f of contract.fields) {
        const ok =
          (f.storage === 'column' && real!.has(f.physical ?? f.key)) ||
          (f.storage === 'encrypted' && encrypted[f.key] !== undefined && real!.has(encrypted[f.key])) ||
          (f.storage === 'metadata' && metaFields[f.key] !== undefined && real!.has(metaFields[f.key]));
        if (!ok) offenders.push(`${table}.${f.key} (${f.storage})`);
        if (f.storage === 'encrypted' && real!.has(f.key)) {
          offenders.push(`${table}.${f.key} (encrypted key colide com coluna física)`);
        }
      }
      const keys = contract.fields.map((x) => x.key);
      if (new Set(keys).size !== keys.length) offenders.push(`${table} (keys duplicadas)`);
    }
    expect(offenders).toEqual([]);
  });

  it('todo grupo repetível tem resolver de export e writer de import registrados', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      const group = contract.repeatingGroup;
      if (!group) continue;
      const registryKey = `${table}.${group.key}`;
      if (!REPEATING_GROUP_EXPORT_RESOLVERS[registryKey]) {
        offenders.push(`${registryKey} (sem resolver de export registrado)`);
      }
      if (!REPEATING_GROUP_IMPORT_WRITERS[registryKey]) {
        offenders.push(`${registryKey} (sem writer de import registrado)`);
      }
      const mainKeys = new Set(contract.fields.map((f) => f.key));
      for (const field of group.fields) {
        if (mainKeys.has(field.key)) offenders.push(`${registryKey}.${field.key} (colide com campo principal)`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('definição publicada = contrato central', () => {
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      const def = defs.getDefinition(table);
      expect(def).not.toBeNull();
      expect(def!.exportableColumns).toEqual(contractExportableColumns(contract));
      expect(def!.importableColumns).toEqual(contractImportableColumns(contract));
      expect(def!.identityColumn).toBe(contract.identityColumn);
      const exportOnly = contract.fields.every((f) => f.importable === false);
      expect(def!.supportsImport).toBe(!exportOnly);
      expect(def!.supportsExport).toBe(true);
    }
  });

  it('nenhuma coluna principal é sensível/interna', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      for (const f of contract.fields) {
        if (
          f.key === 'id' ||
          f.key === 'tenant_id' ||
          f.key === 'metadata' ||
          /_encrypted$|token|password|secret/i.test(f.key)
        ) offenders.push(`${table}.${f.key}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('toda coluna principal e repetível possui label pt-BR', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      for (const f of contract.fields) {
        if (tryGetFieldLabelPtBr(f.key) === null) offenders.push(`${table}.${f.key}`);
      }
      for (const field of contract.repeatingGroup?.fields ?? []) {
        if (tryGetFieldLabelPtBr(field.key) === null) {
          offenders.push(`${table}.${contract.repeatingGroup!.key}.${field.key}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('identityColumn é coluna direta importável ou o contrato é export-only', () => {
    for (const contract of Object.values(REPORT_FORM_CONTRACTS)) {
      const exportOnly = contract.fields.every((f) => f.importable === false);
      if (exportOnly) continue;
      const spec = contract.fields.find((f) => f.key === contract.identityColumn);
      expect(spec).toBeDefined();
      expect(spec!.storage).toBe('column');
      expect(spec!.importable !== false).toBe(true);
    }
  });
});
