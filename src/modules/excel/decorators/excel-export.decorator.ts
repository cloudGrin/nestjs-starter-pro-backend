import { SetMetadata } from '@nestjs/common';
import { ExcelColumnConfig } from '../interfaces/excel-column.interface';

export const EXCEL_EXPORT_KEY = 'excel:export';

export interface ExcelExportMetadata {
  /** 文件名（可以是函数，用于动态生成） */
  filename: string | ((data: any) => string);
  /** 列配置 */
  columns: ExcelColumnConfig[];
  /** 工作表名称 */
  sheetName?: string;
}

/**
 * Excel导出装饰器
 * 用于标记控制器方法支持Excel导出
 *
 * @example
 * ```typescript
 * @Get('export')
 * @ExcelExport({
 *   filename: 'users.xlsx',
 *   columns: [
 *     { header: '用户名', key: 'username', width: 20 },
 *     { header: '邮箱', key: 'email', width: 30 },
 *   ],
 * })
 * async exportUsers() {
 *   return this.userService.findAll();
 * }
 * ```
 */
export const ExcelExport = (metadata: ExcelExportMetadata) =>
  SetMetadata(EXCEL_EXPORT_KEY, metadata);
