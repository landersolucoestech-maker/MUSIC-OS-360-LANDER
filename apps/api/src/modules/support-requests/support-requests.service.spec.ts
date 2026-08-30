import 'reflect-metadata';
import { NotFoundException } from '@nestjs/common';
import { SupportRequestsService } from './support-requests.service';

/**
 * GAP-05c (product-completion audit): SupportRequests.tsx is a fully-built
 * feature-request/voting board, but useRequests() had no real backend.
 */
function makeService() {
  // Single flexible builder for the 'r'-aliased queries (list() and upvote()'s
  // re-read both use createQueryBuilder('r'), with different method chains).
  const readQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([{ id: 'r-1', votes: 5 }]),
    getOne: jest.fn().mockResolvedValue({ id: 'r-1', votes: 6 }),
  };
  const updateQb = {
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  const repo = {
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => ({ id: 'r-new', votes: 0, ...(v as object) })),
    createQueryBuilder: jest.fn((alias?: string) => (alias === 'r' ? readQb : updateQb)),
  };
  const ds = { getRepository: jest.fn().mockReturnValue(repo) };

  const svc = new SupportRequestsService(ds as never);
  return { svc, repo, readQb, updateQb };
}

describe('SupportRequestsService', () => {
  describe('list', () => {
    it('scopes to tenant, excludes deleted, orders by votes desc then newest', async () => {
      const { svc, readQb } = makeService();
      const result = await svc.list('tenant-1');

      expect(readQb.where).toHaveBeenCalledWith(
        'r.tenant_id = :tenantId AND r.deleted_at IS NULL',
        { tenantId: 'tenant-1' },
      );
      expect(readQb.orderBy).toHaveBeenCalledWith('r.votes', 'DESC');
      expect(readQb.addOrderBy).toHaveBeenCalledWith('r.created_at', 'DESC');
      expect(result).toEqual([{ id: 'r-1', votes: 5 }]);
    });
  });

  describe('create', () => {
    it('defaults priority to medium and stamps created_by', async () => {
      const { svc, repo } = makeService();
      await svc.create('tenant-1', 'user-1', { title: 'Quero X', type: 'feature' });

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenant_id: 'tenant-1',
          type: 'feature',
          title: 'Quero X',
          description: '',
          priority: 'medium',
          created_by: 'user-1',
        }),
      );
    });
  });

  describe('upvote', () => {
    it('404s when the request does not exist or belongs to another tenant', async () => {
      const { svc, updateQb } = makeService();
      updateQb.execute.mockResolvedValueOnce({ affected: 0 });

      await expect(svc.upvote('tenant-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('atomically increments votes scoped to tenant + id, then returns the updated row', async () => {
      const { svc, updateQb } = makeService();
      const result = await svc.upvote('tenant-1', 'r-1');

      expect(updateQb.set).toHaveBeenCalledWith({ votes: expect.any(Function) });
      expect(updateQb.where).toHaveBeenCalledWith(
        'id = :id AND tenant_id = :tenantId AND deleted_at IS NULL',
        { id: 'r-1', tenantId: 'tenant-1' },
      );
      expect(result).toEqual({ id: 'r-1', votes: 6 });
    });
  });
});
