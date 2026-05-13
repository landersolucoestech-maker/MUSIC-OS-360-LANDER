import 'reflect-metadata';
import { ArtistsService } from './artists.service';
import { EncryptionService } from '../../core/security/encryption.service';
import { NotFoundException } from '@nestjs/common';

function makeEncryptionMock(): jest.Mocked<EncryptionService> {
  return {
    encrypt:         jest.fn().mockImplementation((v: string) => `enc:${v}`),
    decrypt:         jest.fn().mockImplementation((v: string) => v.replace('enc:', '')),
    encryptNullable: jest.fn().mockImplementation((v: string | null | undefined) =>
      v == null || v === '' ? null : `enc:${v}`,
    ),
    decryptNullable: jest.fn().mockImplementation((v: string | null | undefined) =>
      v == null ? null : String(v).replace('enc:', ''),
    ),
  } as unknown as jest.Mocked<EncryptionService>;
}

function buildMockDb() {
  const selectChain: Record<string, jest.Mock> = {};
  ['from', 'where', 'orderBy', 'offset'].forEach((m) => {
    selectChain[m] = jest.fn().mockReturnValue(selectChain);
  });

  const insertChain: Record<string, jest.Mock> = {};
  ['values', 'returning'].forEach((m) => {
    insertChain[m] = jest.fn().mockReturnValue(insertChain);
  });

  const updateChain: Record<string, jest.Mock> = {};
  ['set', 'where', 'returning'].forEach((m) => {
    updateChain[m] = jest.fn().mockReturnValue(updateChain);
  });

  const db = {
    select: jest.fn().mockReturnValue(selectChain),
    insert: jest.fn().mockReturnValue(insertChain),
    update: jest.fn().mockReturnValue(updateChain),
    _selectChain: selectChain,
    _insertChain: insertChain,
    _updateChain: updateChain,
  };

  return db;
}

describe('ArtistsService', () => {
  const TENANT_A = 'tenant-aaa';
  const USER_ID  = 'user-111';

  const artistA = {
    id: 'artist-001',
    tenant_id: TENANT_A,
    nome_artistico: 'Artista Alpha',
    email_encrypted: null,
    telefone_encrypted: null,
    cpf_cnpj_encrypted: null,
    deleted_at: null,
    created_at: new Date(),
  };

  it('list() retorna artistas filtrados pelo tenant correcto', async () => {
    const db  = buildMockDb();
    const enc = makeEncryptionMock();

    db.select = jest.fn().mockImplementation((sel?: unknown) => {
      if (sel && typeof sel === 'object' && 'value' in (sel as object)) {
        const countChain: Record<string, jest.Mock> = {};
        countChain.from  = jest.fn().mockReturnValue(countChain);
        countChain.where = jest.fn().mockResolvedValue([{ value: 1 }]);
        return countChain;
      }
      const chain = { ...db._selectChain };
      chain.limit = jest.fn().mockResolvedValue([artistA]);
      return chain;
    });

    db._selectChain.from    = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where   = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.orderBy = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.offset  = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit   = jest.fn().mockResolvedValue([artistA]);

    const service = new ArtistsService(db as any, enc);
    const result  = await service.list(TENANT_A, {});
    expect(result.data).toEqual([artistA]);
    expect(result.meta.total).toBe(1);
  });

  it('findById() retorna artista quando pertence ao tenant', async () => {
    const db  = buildMockDb();
    const enc = makeEncryptionMock();

    db._selectChain.from  = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit = jest.fn().mockResolvedValue([artistA]);

    const service = new ArtistsService(db as any, enc);
    const result  = await service.findById(TENANT_A, 'artist-001');
    expect(result).toEqual(artistA);
  });

  it('findById() lança NotFoundException para artista não encontrado', async () => {
    const db  = buildMockDb();
    const enc = makeEncryptionMock();

    db._selectChain.from  = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit = jest.fn().mockResolvedValue([]);

    const service = new ArtistsService(db as any, enc);
    await expect(service.findById(TENANT_A, 'inexistente')).rejects.toThrow(NotFoundException);
  });

  it('create() encripta email, telefone e CPF/CNPJ antes de persistir', async () => {
    const db  = buildMockDb();
    const enc = makeEncryptionMock();

    const dto = {
      nome_artistico: 'Artista Novo',
      email:    'artista@music.com',
      telefone: '+55 11 99999-0000',
      cpf_cnpj: '123.456.789-00',
    };

    const created = {
      ...artistA,
      nome_artistico:     dto.nome_artistico,
      email_encrypted:    `enc:${dto.email}`,
      telefone_encrypted: `enc:${dto.telefone}`,
      cpf_cnpj_encrypted: `enc:${dto.cpf_cnpj}`,
    };

    db._insertChain.values    = jest.fn().mockReturnValue(db._insertChain);
    db._insertChain.returning = jest.fn().mockResolvedValue([created]);

    const service = new ArtistsService(db as any, enc);
    const result  = await service.create(TENANT_A, USER_ID, dto as any);

    expect(enc.encryptNullable).toHaveBeenCalledWith(dto.email);
    expect(enc.encryptNullable).toHaveBeenCalledWith(dto.telefone);
    expect(enc.encryptNullable).toHaveBeenCalledWith(dto.cpf_cnpj);

    expect(db._insertChain.values).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id:          TENANT_A,
        email_encrypted:    `enc:${dto.email}`,
        telefone_encrypted: `enc:${dto.telefone}`,
        cpf_cnpj_encrypted: `enc:${dto.cpf_cnpj}`,
      }),
    );

    expect(result.email_encrypted).toBe(`enc:${dto.email}`);
  });

  it('softDelete() define deleted_at (não apaga fisicamente)', async () => {
    const db  = buildMockDb();
    const enc = makeEncryptionMock();

    db._selectChain.from  = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.where = jest.fn().mockReturnValue(db._selectChain);
    db._selectChain.limit = jest.fn().mockResolvedValue([artistA]);

    db._updateChain.set  = jest.fn().mockReturnValue(db._updateChain);
    db._updateChain.where = jest.fn().mockResolvedValue([]);

    const service = new ArtistsService(db as any, enc);
    const result  = await service.softDelete(TENANT_A, 'artist-001');

    expect(result).toEqual({ deleted: true });
    expect(db.update).toHaveBeenCalled();
    expect(db._updateChain.set).toHaveBeenCalledWith(
      expect.objectContaining({ deleted_at: expect.any(Date) }),
    );
  });
});
