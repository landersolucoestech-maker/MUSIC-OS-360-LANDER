import { PipelinesService } from './pipelines.service';

const makeEventsMock = () => ({ emitTyped: jest.fn(), on: jest.fn() });
const makeWsMock     = () => ({ sendToTenant: jest.fn() });

describe('PipelinesService (DS=null)', () => {
  let svc: PipelinesService;

  beforeEach(() => {
    svc = new PipelinesService(null, makeEventsMock() as any, makeWsMock() as any);
  });

  it('listPipelines throws when DS is null', async () => {
    await expect(svc.listPipelines('tenant-1')).rejects.toThrow();
  });

  it('findPipelineById throws when DS is null', async () => {
    await expect(svc.findPipelineById('tenant-1', 'some-id')).rejects.toThrow();
  });

  it('listOpportunities throws when DS is null', async () => {
    await expect(svc.listOpportunities('t', 'p', {})).rejects.toThrow();
  });
});
