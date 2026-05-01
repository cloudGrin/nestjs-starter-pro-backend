import { readFileSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';
import { configuration, getDatabaseConfig } from './configuration';
import { configValidationSchema } from './config.validation';

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

  it('excludes migration spec files from TypeORM CLI migration loading', () => {
    const config = getDatabaseConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv);
    const migrations = config.migrations as string[];

    expect(migrations.length).toBeGreaterThan(0);
    expect(migrations.some((migration) => migration.includes('.spec.'))).toBe(false);
  });

  it('disables Swagger by default in production', () => {
    process.env = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;

    const config = configuration();

    expect(config.swagger.enable).toBe(false);
  });

  it('keeps proxy trust disabled and OSS HTTPS enabled by default', () => {
    const config = configuration();

    expect(config.app.trustProxy).toBe(false);
    expect(config.file.external.oss.secure).toBe(true);
  });

  it('allows explicit OSS insecure mode and proxy trust through validated env', () => {
    process.env = {
      NODE_ENV: 'test',
      FILE_OSS_SECURE: 'false',
      TRUST_PROXY: 'true',
    } as NodeJS.ProcessEnv;

    const config = configuration();
    const validation = configValidationSchema.validate(process.env, { allowUnknown: false });

    expect(validation.error).toBeUndefined();
    expect(config.app.trustProxy).toBe(true);
    expect(config.file.external.oss.secure).toBe(false);
  });

  it('accepts the env example template as a valid development configuration', () => {
    const envExample = dotenv.parse(readFileSync(join(__dirname, '../../.env.example')));

    const validation = configValidationSchema.validate(envExample, { allowUnknown: false });

    expect(validation.error).toBeUndefined();
  });

  it('rejects removed or misspelled environment variables', () => {
    const result = configValidationSchema.validate(
      {
        NODE_ENV: 'test',
        REDIS_HOST: 'localhost',
      },
      { allowUnknown: false },
    );

    expect(result.error?.message).toContain('REDIS_HOST');
  });
});
