import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';

/**
 * Decision Gate item 8 (product-completion audit): Central de Suporte's
 * Knowledge Base had a fully-built read/authoring UI but zero backend.
 * Content is global (not tenant-scoped) — see the migration comment for why.
 */
function makeQb(overrides: Partial<Record<string, unknown>> = {}) {
  const qb: Record<string, jest.Mock> = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    getCount: jest.fn().mockResolvedValue(0),
    getRawOne: jest.fn().mockResolvedValue({ max: null }),
    execute: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  Object.assign(qb, overrides);
  return qb;
}

function makeService() {
  const categoryQb = makeQb();
  const articleQb = makeQb();

  const categoryRepo = {
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => ({ id: 'cat-new', ...(v as object) })),
    createQueryBuilder: jest.fn(() => categoryQb),
  };
  const articleRepo = {
    create: jest.fn((v: unknown) => v),
    save: jest.fn(async (v: unknown) => (Array.isArray(v) ? v : { id: 'art-new', ...(v as object) })),
    createQueryBuilder: jest.fn(() => articleQb),
  };

  const ds = {
    getRepository: jest.fn((entity: { name: string }) =>
      entity.name === 'KnowledgeCategoryEntity' ? categoryRepo : articleRepo,
    ),
  };

  const svc = new KnowledgeBaseService(ds as never);
  return { svc, categoryRepo, articleRepo, categoryQb, articleQb };
}

describe('KnowledgeBaseService', () => {
  describe('listPublicArticles', () => {
    it('filtra apenas publicado e nunca internal_doc', async () => {
      const { svc, articleQb } = makeService();
      await svc.listPublicArticles();
      expect(articleQb.where).toHaveBeenCalledWith(
        "a.deleted_at IS NULL AND a.status = 'published' AND a.type != 'internal_doc'",
      );
    });
  });

  describe('createCategory', () => {
    it('rejeita slug duplicado', async () => {
      const { svc, categoryQb } = makeService();
      categoryQb.getOne.mockResolvedValueOnce({ id: 'existing', slug: 'faq' });
      await expect(svc.createCategory({ slug: 'faq', name: 'FAQ' })).rejects.toBeInstanceOf(BadRequestException);
    });

    it('cria categoria quando slug é único', async () => {
      const { svc, categoryRepo } = makeService();
      const result = await svc.createCategory({ slug: 'faq', name: 'FAQ' });
      expect(categoryRepo.save).toHaveBeenCalled();
      expect(result).toMatchObject({ slug: 'faq', name: 'FAQ' });
    });
  });

  describe('deleteCategory', () => {
    it('bloqueia exclusão quando há artigos vinculados', async () => {
      const { svc, articleQb } = makeService();
      articleQb.getCount.mockResolvedValueOnce(3);
      await expect(svc.deleteCategory('cat-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404 quando a categoria não existe', async () => {
      const { svc, articleQb, categoryQb } = makeService();
      articleQb.getCount.mockResolvedValueOnce(0);
      categoryQb.execute.mockResolvedValueOnce({ affected: 0 });
      await expect(svc.deleteCategory('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('createArticle', () => {
    it('rejeita categoria inválida', async () => {
      const { svc, categoryQb } = makeService();
      categoryQb.getOne.mockResolvedValueOnce(null);
      await expect(
        svc.createArticle('user-1', { category_id: 'bad', title: 'X', content: 'conteúdo' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('atribui o próximo sort_order e calcula read_time a partir do conteúdo', async () => {
      const { svc, categoryQb, articleQb, articleRepo } = makeService();
      categoryQb.getOne.mockResolvedValueOnce({ id: 'cat-1' });
      articleQb.getRawOne.mockResolvedValueOnce({ max: 4 });

      const content = Array(250).fill('palavra').join(' '); // 250 words → ceil(250/200) = 2 min
      await svc.createArticle('user-1', { category_id: 'cat-1', title: 'X', content });

      expect(articleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ sort_order: 5, read_time: 2, created_by: 'user-1', status: 'draft' }),
      );
    });
  });

  describe('moveArticle', () => {
    it('troca sort_order com o vizinho anterior ao mover para cima', async () => {
      const { svc, articleQb, articleRepo } = makeService();
      articleQb.getMany.mockResolvedValueOnce([
        { id: 'a1', sort_order: 0 },
        { id: 'a2', sort_order: 1 },
      ]);
      await svc.moveArticle('a2', 'up');
      expect(articleRepo.save).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'a2', sort_order: 0 }),
        expect.objectContaining({ id: 'a1', sort_order: 1 }),
      ]);
    });

    it('não faz nada ao mover o primeiro item para cima', async () => {
      const { svc, articleQb, articleRepo } = makeService();
      articleQb.getMany.mockResolvedValueOnce([
        { id: 'a1', sort_order: 0 },
        { id: 'a2', sort_order: 1 },
      ]);
      await svc.moveArticle('a1', 'up');
      expect(articleRepo.save).not.toHaveBeenCalled();
    });

    it('404 quando o artigo não existe', async () => {
      const { svc, articleQb } = makeService();
      articleQb.getMany.mockResolvedValueOnce([]);
      await expect(svc.moveArticle('missing', 'up')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('incrementViews', () => {
    it('incrementa views atomicamente pelo id', async () => {
      const { svc, articleQb } = makeService();
      await svc.incrementViews('a1');
      expect(articleQb.set).toHaveBeenCalledWith({ views: expect.any(Function) });
      expect(articleQb.where).toHaveBeenCalledWith('id = :id AND deleted_at IS NULL', { id: 'a1' });
    });
  });
});
