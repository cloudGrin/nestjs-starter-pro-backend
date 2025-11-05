/**
 * Excel列配置接口
 */
export interface ExcelColumnConfig {
  /** 列标题 */
  header: string;
  /** 数据字段键 */
  key: string;
  /** 列宽 */
  width?: number;
  /** 数据类型 */
  type?: 'string' | 'number' | 'boolean' | 'date';
  /** 格式化函数 */
  format?: (value: any) => any;
  /** 样式配置 */
  style?: ExcelCellStyle;
}

/**
 * Excel单元格样式接口
 */
export interface ExcelCellStyle {
  /** 字体配置 */
  font?: {
    name?: string;
    size?: number;
    bold?: boolean;
    italic?: boolean;
    color?: { argb: string };
  };
  /** 对齐方式 */
  alignment?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
    wrapText?: boolean;
  };
  /** 边框配置 */
  border?: {
    top?: { style: string; color?: { argb: string } };
    left?: { style: string; color?: { argb: string } };
    bottom?: { style: string; color?: { argb: string } };
    right?: { style: string; color?: { argb: string } };
  };
  /** 填充配置 */
  fill?: {
    type: 'pattern';
    pattern: string;
    fgColor?: { argb: string };
    bgColor?: { argb: string };
  };
  /** 数字格式 */
  numFmt?: string;
}

/**
 * Excel工作表配置接口
 */
export interface ExcelSheetConfig {
  /** 工作表名称 */
  name: string;
  /** 列配置 */
  columns: ExcelColumnConfig[];
  /** 数据 */
  data: any[];
  /** 是否冻结首行 */
  freezeFirstRow?: boolean;
  /** 是否自动筛选 */
  autoFilter?: boolean;
  /** 表头样式 */
  headerStyle?: ExcelCellStyle;
}

/**
 * Excel导出配置接口
 */
export interface ExcelExportOptions {
  /** 文件名 */
  filename: string;
  /** 工作表配置 */
  sheets: ExcelSheetConfig[];
  /** 作者 */
  creator?: string;
  /** 最后修改者 */
  lastModifiedBy?: string;
  /** 创建时间 */
  created?: Date;
  /** 修改时间 */
  modified?: Date;
}

/**
 * Excel导入配置接口
 */
export interface ExcelImportOptions {
  /** 工作表索引或名称 */
  sheet?: number | string;
  /** 起始行（从1开始，默认2，跳过表头） */
  startRow?: number;
  /** 列映射配置 */
  columnMapping?: Record<string, string | number>;
  /** 数据验证函数 */
  validate?: (row: any) => boolean | string;
  /** 数据转换函数 */
  transform?: (row: any) => any;
}
