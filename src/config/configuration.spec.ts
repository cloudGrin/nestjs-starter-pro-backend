import { configuration } from './configuration';

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
});
