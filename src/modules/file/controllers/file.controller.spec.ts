import 'reflect-metadata';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FileController } from './file.controller';
import { UploadFileDto } from '../dto/upload-file.dto';

describe('FileController', () => {
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
});
