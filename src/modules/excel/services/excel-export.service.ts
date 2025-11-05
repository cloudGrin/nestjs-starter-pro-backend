import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import * as ExcelJS from 'exceljs';
import {
  ExcelExportOptions,
  ExcelSheetConfig,
  ExcelColumnConfig,
  ExcelCellStyle,
} from '../interfaces/excel-column.interface';
import { LoggerService } from '~/shared/logger/logger.service';

@Injectable()
export class ExcelExportService {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext(ExcelExportService.name);
  }

  /**
   * 导出Excel文件
   */
  async export(options: ExcelExportOptions): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();

      // 设置工作簿属性
      workbook.creator = options.creator || 'home System';
      workbook.lastModifiedBy = options.lastModifiedBy || 'home System';
      workbook.created = options.created || new Date();
      workbook.modified = options.modified || new Date();

      // 创建工作表
      for (const sheetConfig of options.sheets) {
        await this.createWorksheet(workbook, sheetConfig);
      }

      // 生成Buffer
      const buffer = await workbook.xlsx.writeBuffer();

      this.logger.log(`Excel exported: ${options.filename} with ${options.sheets.length} sheets`);

      return buffer as any;
    } catch (error) {
      this.logger.error(`Failed to export Excel: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 导出Excel并发送到响应流
   */
  async exportToResponse(options: ExcelExportOptions, res: Response): Promise<void> {
    const buffer = await this.export(options);

    // 设置响应头
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(options.filename)}"`,
    );
    res.setHeader('Content-Length', buffer.length);

    // 发送文件
    res.send(buffer);
  }

  /**
   * 创建工作表
   */
  private async createWorksheet(
    workbook: ExcelJS.Workbook,
    config: ExcelSheetConfig,
  ): Promise<void> {
    const worksheet = workbook.addWorksheet(config.name);

    // 设置列
    worksheet.columns = config.columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 15,
    }));

    // 应用表头样式
    if (config.headerStyle || config.columns.some((col) => col.style)) {
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell, colNumber) => {
        const columnConfig = config.columns[colNumber - 1];
        const style = columnConfig?.style || config.headerStyle;
        if (style) {
          this.applyCellStyle(cell, style);
        }
      });
      headerRow.commit();
    }

    // 添加数据
    for (const row of config.data) {
      const processedRow: any = {};
      for (const col of config.columns) {
        let value = row[col.key];

        // 应用格式化函数
        if (col.format && value !== undefined && value !== null) {
          value = col.format(value);
        }

        processedRow[col.key] = value;
      }
      worksheet.addRow(processedRow);
    }

    // 冻结首行
    if (config.freezeFirstRow !== false) {
      worksheet.views = [{ state: 'frozen', ySplit: 1 }];
    }

    // 自动筛选
    if (config.autoFilter !== false) {
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: config.columns.length },
      };
    }
  }

  /**
   * 应用单元格样式
   */
  private applyCellStyle(cell: ExcelJS.Cell, style: ExcelCellStyle): void {
    if (style.font) {
      cell.font = style.font as any;
    }
    if (style.alignment) {
      cell.alignment = style.alignment as any;
    }
    if (style.border) {
      cell.border = style.border as any;
    }
    if (style.fill) {
      cell.fill = style.fill as any;
    }
    if (style.numFmt) {
      cell.numFmt = style.numFmt;
    }
  }

  /**
   * 导出简单Excel（快捷方法）
   */
  async exportSimple<T = any>(
    data: T[],
    columns: ExcelColumnConfig[],
    filename: string,
  ): Promise<Buffer> {
    return this.export({
      filename,
      sheets: [
        {
          name: 'Sheet1',
          columns,
          data,
          freezeFirstRow: true,
          autoFilter: true,
          headerStyle: {
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'middle' },
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFE0E0E0' },
            },
          },
        },
      ],
    });
  }

  /**
   * 导出简单Excel到响应流（快捷方法）
   */
  async exportSimpleToResponse<T = any>(
    data: T[],
    columns: ExcelColumnConfig[],
    filename: string,
    res: Response,
  ): Promise<void> {
    const buffer = await this.exportSimple(data, columns, filename);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  }
}
