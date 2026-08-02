/**
 * GUARDA PERMANENTE — formulário (DTO) ↔ contrato central ↔ importador.
 *
 * Falha automaticamente quando:
 *  1. um campo novo é adicionado ao DTO do formulário sem atualizar o contrato
 *     (nem como coluna, nem como alias, nem como exclusão documentada);
 *  2. o contrato declara coluna que não existe fisicamente (direta/cifrada/metadata);
 *  3. exportador e importador divergirem do contrato central;
 *  4. coluna sensível/interna vazar para o contrato.
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

import { CreateArtistDto } from '../../artists/dto/create-artist.dto';
import { CreateWorkDto } from '../../works/dto/create-work.dto';
import { CreatePhonogramDto } from '../../phonograms/dto/create-phonogram.dto';
import { CreateContractDto } from '../../contracts/dto/create-contract.dto';
import { CreateContractTemplateDto } from '../../contract-templates/dto/create-contract-template.dto';
import { CreateEmployeeDto } from '../../hr/dto/create-employee.dto';
import { CreateArtistGoalDto } from '../../artist-goals/dto/create-artist-goal.dto';
import { CreateClientDto } from '../../clients/dto/clients.dto';

/** DTO do formulário (whitelist real da API) por tabela com contrato. */
const FORM_DTO_BY_TABLE: Record<string, new () => object> = {
  artists: CreateArtistDto,
  works: CreateWorkDto,
  phonograms: CreatePhonogramDto,
  contracts: CreateContractDto,
  contract_templates: CreateContractTemplateDto,
  employees: CreateEmployeeDto,
  artist_goals: CreateArtistGoalDto,
  clients: CreateClientDto,
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

  it('toda coluna do contrato tem lastro físico (direta, cifrada ou metadata jsonb)', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      const real = colsByTable.get(table);
      expect(real).toBeDefined();
      const encrypted = contractEncryptedFields(contract);
      const metaFields = contractMetadataFields(contract);
      for (const f of contract.fields) {
        const ok =
          (f.storage === 'column' && real!.has(f.key)) ||
          (f.storage === 'encrypted' && f.physical !== undefined && real!.has(f.physical)) ||
          (f.storage === 'metadata' && real!.has('metadata'));
        if (!ok) offenders.push(`${table}.${f.key} (${f.storage})`);
        // chave lógica de campo cifrado nunca pode colidir com coluna física
        if (f.storage === 'encrypted' && real!.has(f.key)) {
          offenders.push(`${table}.${f.key} (encrypted key colide com coluna física)`);
        }
      }
      // metadados: sem duplicidade de keys
      const keys = contract.fields.map((x) => x.key);
      if (new Set(keys).size !== keys.length) offenders.push(`${table} (keys duplicadas)`);
      void encrypted;
      void metaFields;
    }
    expect(offenders).toEqual([]);
  });

  it('definição publicada = contrato central (export e import idênticos à fonte única)', () => {
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      const def = defs.getDefinition(table);
      expect(def).not.toBeNull();
      expect(def!.exportableColumns).toEqual(contractExportableColumns(contract));
      expect(def!.importableColumns).toEqual(contractImportableColumns(contract));
      expect(def!.identityColumn).toBe(contract.identityColumn);
      expect(def!.supportsImport).toBe(true);
      expect(def!.supportsExport).toBe(true);
    }
  });

  it('nenhuma coluna do contrato é sensível/interna (id, tenant_id, *_encrypted, metadata bruto)', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      for (const f of contract.fields) {
        if (
          f.key === 'id' ||
          f.key === 'tenant_id' ||
          f.key === 'metadata' ||
          /_encrypted$|token|password|secret/i.test(f.key)
        ) {
          offenders.push(`${table}.${f.key}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('toda coluna do contrato possui label pt-BR (cabeçalho do arquivo)', () => {
    const offenders: string[] = [];
    for (const [table, contract] of Object.entries(REPORT_FORM_CONTRACTS)) {
      for (const f of contract.fields) {
        if (tryGetFieldLabelPtBr(f.key) === null) offenders.push(`${table}.${f.key}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('identityColumn do contrato é coluna direta importável', () => {
    for (const contract of Object.values(REPORT_FORM_CONTRACTS)) {
      const spec = contract.fields.find((f) => f.key === contract.identityColumn);
      expect(spec).toBeDefined();
      expect(spec!.storage).toBe('column');
      expect(spec!.importable !== false).toBe(true);
    }
  });
});
