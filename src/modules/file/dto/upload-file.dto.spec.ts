import { ValidationPipe } from '@nestjs/common';
import { UploadFileDto } from './upload-file.dto';
import { FileStorageType } from '../entities/file.entity';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: {
    enableImplicitConversion: true,
  },
});

const transformBody = (value: Record<string, unknown>) =>
  pipe.transform(value, {
    type: 'body',
    metatype: UploadFileDto,
  }) as Promise<UploadFileDto>;

describe('UploadFileDto', () => {
  it('transforms multipart false string into false instead of truthy boolean', async () => {
    const dto = await transformBody({ isPublic: 'false' });

    expect(dto.isPublic).toBe(false);
  });

  it('transforms multipart true string into true', async () => {
    const dto = await transformBody({ isPublic: 'true' });

    expect(dto.isPublic).toBe(true);
  });

  it('accepts an explicit storage target for local or OSS uploads', async () => {
    const dto = await transformBody({ storage: FileStorageType.OSS });

    expect(dto.storage).toBe(FileStorageType.OSS);
  });

  it('rejects unsupported storage targets', async () => {
    await expect(transformBody({ storage: 's3' })).rejects.toThrow();
  });
});
