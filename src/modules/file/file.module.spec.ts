import { ConfigService } from '@nestjs/config';
import { DEFAULT_FILE_MAX_SIZE } from '~/config/constants';
import { buildFileUploadMulterOptions } from './file.module';

describe('buildFileUploadMulterOptions', () => {
  it('uses configured file.maxSize for multer before buffering uploads in memory', () => {
    const options = buildFileUploadMulterOptions({
      get: jest.fn((key: string) => (key === 'file.maxSize' ? 12345 : undefined)),
    } as unknown as ConfigService);

    expect(options.limits?.fileSize).toBe(12345);
    expect(options.storage).toBeDefined();
  });

  it('falls back to default max size when config is missing or invalid', () => {
    const options = buildFileUploadMulterOptions({
      get: jest.fn(() => undefined),
    } as unknown as ConfigService);

    expect(options.limits?.fileSize).toBe(DEFAULT_FILE_MAX_SIZE);
  });
});
