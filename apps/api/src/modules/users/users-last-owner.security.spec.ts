import { BadRequestException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService last owner protection', () => {
  it('rejects removal or demotion of the last active owner', async () => {
    const queryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    const dataSource = {
      getRepository: jest.fn().mockReturnValue(repository),
    };
    const service = new UsersService(
      dataSource as never,
      { emitTyped: jest.fn() } as never,
      {} as never,
      { delete: jest.fn() } as never,
      {} as never,
      {} as never,
    );

    await expect(
      service['assertNotLastOwner']('tenant-a', 'membership-a'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
