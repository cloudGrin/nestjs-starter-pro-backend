import { Module, Global } from '@nestjs/common';
import { ExcelExportService } from './services/excel-export.service';
import { ExcelImportService } from './services/excel-import.service';

/**
 * Excel模块
 * 提供Excel导入导出功能
 *
 * 使用示例：
 *
 * 1. 导出Excel:
 * ```typescript
 * constructor(private readonly excelService: ExcelExportService) {}
 *
 * async exportData(res: Response) {
 *   const data = await this.getData();
 *   await this.excelService.exportSimpleToResponse(
 *     data,
 *     [
 *       { header: '姓名', key: 'name', width: 20 },
 *       { header: '邮箱', key: 'email', width: 30 },
 *     ],
 *     'users.xlsx',
 *     res,
 *   );
 * }
 * ```
 *
 * 2. 导入Excel:
 * ```typescript
 * constructor(private readonly excelImportService: ExcelImportService) {}
 *
 * async importData(file: Express.Multer.File) {
 *   const result = await this.excelImportService.import(file, {
 *     columnMapping: {
 *       name: 'A',
 *       email: 'B',
 *     },
 *     validate: (row) => {
 *       if (!row.email) return '邮箱不能为空';
 *       return true;
 *     },
 *   });
 *   return result;
 * }
 * ```
 */
@Global()
@Module({
  providers: [ExcelExportService, ExcelImportService],
  exports: [ExcelExportService, ExcelImportService],
})
export class ExcelModule {}
