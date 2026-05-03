import { ConfigService } from '@nestjs/config';
import { buildFileUploadMulterOptions } from './file.module';

describe('buildFileUploadMulterOptions', () => {
  it('uses configured file.maxSize for multer before buffering uploads in memory', () => {
    const options = buildFileUploadMulterOptions({
      get: jest.fn((key: string) => (key === 'file.maxSize' ? 12345 : undefined)),
    } as unknown as ConfigService);

    expect(options.limits?.fileSize).toBe(12345);
    expect(options.storage).toBeDefined();
  });

  it('falls back to 50MB for memory-buffered multipart uploads', () => {
    const options = buildFileUploadMulterOptions({
      get: jest.fn(() => undefined),
    } as unknown as ConfigService);

    expect(options.limits?.fileSize).toBe(50 * 1024 * 1024);
  });
});
