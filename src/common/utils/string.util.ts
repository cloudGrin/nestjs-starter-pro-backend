import { randomBytes } from 'crypto';

/**
 * 字符串工具类
 */
export class StringUtil {
  /**
   * 生成短UUID (无连字符)
   */
  static shortUuid(): string {
    return randomBytes(16).toString('hex');
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
}
