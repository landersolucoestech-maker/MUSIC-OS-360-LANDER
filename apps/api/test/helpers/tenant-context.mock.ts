export function passThroughTenantContext(manager: unknown) {
  return {
    runInTenantContext: jest.fn(
      async (_ctx: unknown, work: (manager: unknown) => Promise<unknown>) => work(manager),
    ),
  };
}
