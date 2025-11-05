import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * 日期工具类
 */
export class DateUtil {
  /**
   * 获取当前时间
   */
  static now(): Date {
    return new Date();
  }

  /**
   * 获取当前时间戳（秒）
   */
  static timestamp(): number {
    return Math.floor(Date.now() / 1000);
  }

  /**
   * 获取当前时间戳（毫秒）
   */
  static timestampMs(): number {
    return Date.now();
  }

  /**
   * 格式化日期
   */
  static format(date?: Date | string | number, format = 'YYYY-MM-DD HH:mm:ss'): string {
    return dayjs(date).format(format);
  }

  /**
   * 解析日期字符串
   */
  static parse(dateString: string, format?: string): Date {
    return dayjs(dateString, format).toDate();
  }

  /**
   * 添加时间
   */
  static add(date: Date | string, value: number, unit: dayjs.ManipulateType = 'day'): Date {
    return dayjs(date).add(value, unit).toDate();
  }

  /**
   * 减去时间
   */
  static subtract(date: Date | string, value: number, unit: dayjs.ManipulateType = 'day'): Date {
    return dayjs(date).subtract(value, unit).toDate();
  }

  /**
   * 判断是否在之前
   */
  static isBefore(date1: Date | string, date2: Date | string): boolean {
    return dayjs(date1).isBefore(date2);
  }

  /**
   * 判断是否在之后
   */
  static isAfter(date1: Date | string, date2: Date | string): boolean {
    return dayjs(date1).isAfter(date2);
  }

  /**
   * 判断是否相同
   */
  static isSame(
    date1: Date | string,
    date2: Date | string,
    unit: dayjs.OpUnitType = 'day',
  ): boolean {
    return dayjs(date1).isSame(date2, unit);
  }

  /**
   * 获取两个日期之间的差值
   */
  static diff(
    date1: Date | string,
    date2: Date | string,
    unit: dayjs.QUnitType | dayjs.OpUnitType = 'day',
  ): number {
    return dayjs(date1).diff(date2, unit);
  }

  /**
   * 获取开始时间（天）
   */
  static startOfDay(date?: Date | string): Date {
    return dayjs(date).startOf('day').toDate();
  }

  /**
   * 获取结束时间（天）
   */
  static endOfDay(date?: Date | string): Date {
    return dayjs(date).endOf('day').toDate();
  }

  /**
   * 获取开始时间（月）
   */
  static startOfMonth(date?: Date | string): Date {
    return dayjs(date).startOf('month').toDate();
  }

  /**
   * 获取结束时间（月）
   */
  static endOfMonth(date?: Date | string): Date {
    return dayjs(date).endOf('month').toDate();
  }

  /**
   * 获取开始时间（年）
   */
  static startOfYear(date?: Date | string): Date {
    return dayjs(date).startOf('year').toDate();
  }

  /**
   * 获取结束时间（年）
   */
  static endOfYear(date?: Date | string): Date {
    return dayjs(date).endOf('year').toDate();
  }

  /**
   * 转换为指定时区
   */
  static toTimezone(date: Date | string, timezone: string): Date {
    return dayjs(date).tz(timezone).toDate();
  }

  /**
   * 判断是否过期
   */
  static isExpired(date: Date | string): boolean {
    return dayjs(date).isBefore(dayjs());
  }

  /**
   * 获取相对时间描述
   */
  static fromNow(date: Date | string): string {
    const diff = dayjs().diff(date, 'second');

    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}个月前`;
    return `${Math.floor(diff / 31536000)}年前`;
  }
}
