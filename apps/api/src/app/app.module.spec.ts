describe('AppModule', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://dividends:dividends@localhost:5432/dividends',
      JWT_SECRET: 'a-secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('validates the environment variables when the module is loaded and aborts on invalid values', async () => {
    process.env.PORT = 'not-a-number';

    await expect(
      jest.isolateModulesAsync(async () => {
        await import('./app.module');
      })
    ).rejects.toThrow(/PORT/);
  });
});
