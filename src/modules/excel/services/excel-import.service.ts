import { Injectable, BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ExcelImportOptions } from '../interfaces/excel-column.interface';
import { LoggerService } from '~/shared/logger/logger.service';

export interface ImportResult<T = any> {
  /** 成功导入的数据 */
  data: T[];
  /** 总行数 */
  totalRows: number;
  /** 成功行数 */
  successRows: number;
  /** 失败行数 */
  failedRows: number;
  /** 错误信息 */
  errors: Array<{ row: number; message: string }>;
}

@Injectable()
export class ExcelImportService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ExcelImportService.name);
  }

  /**
   * 导入Excel文件
   */
  async import<T = any>(
    file: Buffer | Express.Multer.File,
    options: ExcelImportOptions = {},
  ): Promise<ImportResult<T>> {
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = Buffer.isBuffer(file) ? file : file.buffer!;

      await workbook.xlsx.load(buffer as any);

      // 获取工作表
      const worksheet = this.getWorksheet(workbook, options.sheet);

      if (!worksheet) {
        throw new BadRequestException('工作表不存在');
      }

      const result: ImportResult<T> = {
        data: [],
        totalRows: 0,
        successRows: 0,
        failedRows: 0,
        errors: [],
      };

      const startRow = options.startRow || 2; // 默认从第2行开始（跳过表头）

      // 遍历行
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        // 跳过表头行
        if (rowNumber < startRow) {
          return;
        }

        result.totalRows++;

        try {
          // 提取行数据
          const rowData = this.extractRowData(row, options.columnMapping);

          // 验证数据
          if (options.validate) {
            const validationResult = options.validate(rowData);
            if (validationResult !== true) {
              const errorMessage =
                typeof validationResult === 'string' ? validationResult : '数据验证失败';
              throw new Error(errorMessage);
            }
          }

          // 转换数据
          let transformedData = rowData;
          if (options.transform) {
            transformedData = options.transform(rowData);
          }

          result.data.push(transformedData);
          result.successRows++;
        } catch (error) {
          result.failedRows++;
          result.errors.push({
            row: rowNumber,
            message: error.message,
          });
          this.logger.warn(`Row ${rowNumber} import failed: ${error.message}`);
        }
      });

      this.logger.log(`Excel imported: ${result.successRows}/${result.totalRows} rows successful`);

      return result;
    } catch (error) {
      this.logger.error(`Failed to import Excel: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取工作表
   */
  private getWorksheet(
    workbook: ExcelJS.Workbook,
    sheet?: number | string,
  ): ExcelJS.Worksheet | null {
    if (sheet === undefined) {
      // 默认获取第一个工作表
      return workbook.worksheets[0] || null;
    }

    if (typeof sheet === 'number') {
      // 按索引获取
      return workbook.worksheets[sheet] || null;
    }

    // 按名称获取
    return workbook.getWorksheet(sheet) || null;
  }

  /**
   * 提取行数据
   */
  private extractRowData(row: ExcelJS.Row, columnMapping?: Record<string, string | number>): any {
    const data: any = {};

    if (columnMapping) {
      // 使用列映射
      for (const [key, columnRef] of Object.entries(columnMapping)) {
        const cell =
          typeof columnRef === 'number' ? row.getCell(columnRef) : row.getCell(columnRef);
        data[key] = this.getCellValue(cell);
      }
    } else {
      // 使用默认映射（按列号）
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        data[`col${colNumber}`] = this.getCellValue(cell);
      });
    }

    return data;
  }

  /**
   * 获取单元格值
   */
  private getCellValue(cell: ExcelJS.Cell): any {
    // 处理公式单元格
    if (cell.type === ExcelJS.ValueType.Formula) {
      return cell.result;
    }

    // 处理日期
    if (cell.type === ExcelJS.ValueType.Date) {
      return cell.value;
    }

    // 处理富文本
    if (cell.type === ExcelJS.ValueType.RichText) {
      const richText = cell.value as ExcelJS.CellRichTextValue;
      return richText.richText.map((rt) => rt.text).join('');
    }

    // 处理超链接
    if (cell.type === ExcelJS.ValueType.Hyperlink) {
      const hyperlink = cell.value as ExcelJS.CellHyperlinkValue;
      return hyperlink.text;
    }

    return cell.value;
  }

  /**
   * 验证Excel文件格式
   */
  async validateFile(file: Buffer | Express.Multer.File): Promise<boolean> {
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = Buffer.isBuffer(file) ? file : file.buffer!;

      await workbook.xlsx.load(buffer as any);

      return workbook.worksheets.length > 0;
    } catch (error) {
      this.logger.error(`Invalid Excel file: ${error.message}`);
      return false;
    }
  }

  /**
   * 获取工作表列表
   */
  async getWorksheets(file: Buffer | Express.Multer.File): Promise<string[]> {
    const workbook = new ExcelJS.Workbook();
    const buffer = Buffer.isBuffer(file) ? file : file.buffer!;

    await workbook.xlsx.load(buffer as any);

    return workbook.worksheets.map((ws) => ws.name);
  }
}
