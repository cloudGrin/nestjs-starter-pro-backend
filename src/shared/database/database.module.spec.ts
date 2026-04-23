import { buildDataSourceOptions } from './database.module';

describe('buildDataSourceOptions', () => {
  it('preserves database extra options from configuration', () => {
    const options = buildDataSourceOptions({
      type: 'mysql',
      host: 'localhost',
      username: 'root',
      database: 'home',
      logging: false,
      extra: {
        charset: 'utf8mb4_unicode_ci',
        connectionLimit: 20,
        connectTimeout: 1234,
      },
    } as any);

    expect(options.extra).toEqual(
      expect.objectContaining({
        charset: 'utf8mb4_unicode_ci',
        connectionLimit: 20,
        connectTimeout: 1234,
      }),
    );
  });
});
