import { configuration, getDatabaseConfig } from './configuration';

describe('configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { NODE_ENV: 'test' } as NodeJS.ProcessEnv;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('does not include Excel extensions in default allowed file types', () => {
    const config = configuration();

    expect(config.file.allowedTypes).not.toContain('.xls');
    expect(config.file.allowedTypes).not.toContain('.xlsx');
  });

  it('does not pass unsupported mysql2 timeout options', () => {
    const config = getDatabaseConfig({
      NODE_ENV: 'test',
      DB_CONNECTION_TIMEOUT: '1000',
    } as NodeJS.ProcessEnv);

    expect(config.extra).toMatchObject({
      charset: 'utf8mb4_unicode_ci',
      connectionLimit: 10,
      connectTimeout: 1000,
    });
    expect(config.extra).not.toHaveProperty('acquireTimeout');
    expect(config.extra).not.toHaveProperty('timeout');
  });
});
