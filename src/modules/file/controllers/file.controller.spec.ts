import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FileController } from './file.controller';
import { UploadFileDto } from '../dto/upload-file.dto';

describe('FileController', () => {
  const createController = () => {
    const fileService = {
      upload: jest.fn().mockResolvedValue({ id: 1 }),
    };

    return {
      controller: new FileController(fileService as any),
      fileService,
    };
  };

  const createUploadFile = (originalname: string): Express.Multer.File =>
    ({
      fieldname: 'file',
      originalname,
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 4,
      buffer: Buffer.from('test'),
      destination: '',
      filename: originalname,
      path: '',
      stream: undefined as any,
    }) as Express.Multer.File;

  it('uses UploadFileDto for upload body validation', () => {
    const paramTypes = Reflect.getMetadata('design:paramtypes', FileController.prototype, 'upload');

    expect(paramTypes[1]).toBe(UploadFileDto);
  });

  it('does not manually build upload dto from req.body', () => {
    const source = readFileSync(join(__dirname, 'file.controller.ts'), 'utf8');

    expect(source).not.toContain('@Req() req');
    expect(source).not.toContain('const payload = req.body');
    expect(source).not.toContain('const uploadDto: UploadFileDto');
  });

  it('uses strict file lookup instead of nullable alias + repeated not-found handling', () => {
    const source = readFileSync(join(__dirname, 'file.controller.ts'), 'utf8');

    expect(source).not.toContain('this.fileService.findOne(');
    expect(source).not.toContain("BusinessException.notFound('文件', id)");
  });

  it('delegates multer upload limits to FileModule configuration', () => {
    const source = readFileSync(join(__dirname, 'file.controller.ts'), 'utf8');

    expect(source).toContain("FileInterceptor('file')");
    expect(source).not.toContain('DEFAULT_FILE_MAX_SIZE');
    expect(source).not.toContain('limits:');
    expect(source).not.toContain('最大100MB');
  });

  it('does not corrupt filenames that are already decoded as UTF-8', async () => {
    const { controller, fileService } = createController();
    const file = createUploadFile('测试文件.txt');

    await controller.upload(file, {}, { id: 1 } as any);

    expect(fileService.upload).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: '测试文件.txt' }),
      {},
      1,
    );
  });

  it('decodes latin1 mojibake filenames produced by multipart parsers', async () => {
    const { controller, fileService } = createController();
    const mojibakeName = Buffer.from('测试文件.txt', 'utf8').toString('latin1');
    const file = createUploadFile(mojibakeName);

    await controller.upload(file, {}, { id: 1 } as any);

    expect(fileService.upload).toHaveBeenCalledWith(
      expect.objectContaining({ originalname: '测试文件.txt' }),
      {},
      1,
    );
  });
});
