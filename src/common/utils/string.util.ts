import { randomBytes } from 'crypto';

/**
 * 字符串工具类
 */
export class StringUtil {
  /**
   * 驼峰转下划线
   * @example camelToSnake('userName') => 'user_name'
   */
  static camelToSnake(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  /**
   * 下划线转驼峰
   * @example snakeToCamel('user_name') => 'userName'
   */
  static snakeToCamel(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  /**
   * 首字母大写
   * @example capitalize('hello') => 'Hello'
   */
  static capitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * 首字母小写
   * @example uncapitalize('Hello') => 'hello'
   */
  static uncapitalize(str: string): string {
    if (!str) return '';
    return str.charAt(0).toLowerCase() + str.slice(1);
  }

  /**
   * 生成UUID (v4)
   */
  static uuid(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 生成短UUID (无连字符)
   */
  static shortUuid(): string {
    return randomBytes(16).toString('hex');
  }

  /**
   * 脱敏处理
   * @param str 原始字符串
   * @param start 开始位置
   * @param end 结束位置
   * @param mask 脱敏字符
   * @example mask('13812345678', 3, 7) => '138****5678'
   */
  static mask(str: string, start: number, end: number, mask = '*'): string {
    if (!str || start < 0 || end > str.length || start >= end) {
      return str;
    }
    const maskLength = end - start;
    const masked = mask.repeat(maskLength);
    return str.substring(0, start) + masked + str.substring(end);
  }

  /**
   * 手机号脱敏
   * @example maskPhone('13812345678') => '138****5678'
   */
  static maskPhone(phone: string): string {
    return this.mask(phone, 3, 7);
  }

  /**
   * 邮箱脱敏
   * @example maskEmail('test@example.com') => 't***@example.com'
   */
  static maskEmail(email: string): string {
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    const maskedName = name.charAt(0) + '***';
    return `${maskedName}@${domain}`;
  }

  /**
   * 身份证号脱敏
   * @example maskIdCard('110101199001011234') => '110101********1234'
   */
  static maskIdCard(idCard: string): string {
    return this.mask(idCard, 6, idCard.length - 4);
  }

  /**
   * 截取字符串
   * @param str 原始字符串
   * @param length 截取长度
   * @param suffix 后缀
   * @example truncate('Hello World', 5) => 'Hello...'
   */
  static truncate(str: string, length: number, suffix = '...'): string {
    if (!str || str.length <= length) return str;
    return str.substring(0, length) + suffix;
  }

  /**
   * 判断是否为空字符串
   */
  static isEmpty(str: string | null | undefined): boolean {
    return str === null || str === undefined || str.trim() === '';
  }

  /**
   * 判断是否不为空
   */
  static isNotEmpty(str: string | null | undefined): boolean {
    return !this.isEmpty(str);
  }

  /**
   * 移除所有空白字符
   * @example removeWhitespace('hello world') => 'helloworld'
   */
  static removeWhitespace(str: string): string {
    return str.replace(/\s+/g, '');
  }

  /**
   * 填充字符串
   * @param str 原始字符串
   * @param length 目标长度
   * @param pad 填充字符
   * @param direction 填充方向
   * @example pad('5', 3, '0', 'left') => '005'
   */
  static pad(str: string, length: number, pad = ' ', direction: 'left' | 'right' = 'left'): string {
    if (str.length >= length) return str;
    const padLength = length - str.length;
    const padding = pad.repeat(Math.ceil(padLength / pad.length)).substring(0, padLength);
    return direction === 'left' ? padding + str : str + padding;
  }

  /**
   * 反转字符串
   */
  static reverse(str: string): string {
    return str.split('').reverse().join('');
  }

  /**
   * 随机字符串
   * @param length 长度
   * @param chars 字符集
   */
  static random(
    length: number,
    chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  ): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 生成随机数字字符串
   */
  static randomNumber(length: number): string {
    return this.random(length, '0123456789');
  }

  /**
   * 转义HTML特殊字符
   */
  static escapeHtml(str: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (char) => map[char]);
  }

  /**
   * 解析模板字符串
   * @example template('Hello {name}', { name: 'World' }) => 'Hello World'
   */
  static template(str: string, data: Record<string, any>): string {
    return str.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] !== undefined ? String(data[key]) : match;
    });
  }

  /**
   * 字节转可读大小
   * @example bytesToSize(1024) => '1 KB'
   */
  static bytesToSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}
