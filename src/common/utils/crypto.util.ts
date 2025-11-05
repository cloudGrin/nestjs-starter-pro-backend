import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

/**
 * 加密工具类
 */
export class CryptoUtil {
  /**
   * 生成密码哈希
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 验证密码
   */
  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * 生成随机字符串
   */
  static generateRandomString(length: number = 32): string {
    return randomBytes(length).toString('hex');
  }

  /**
   * 生成随机数字字符串
   */
  static generateRandomNumbers(length: number = 6): string {
    let result = '';
    for (let i = 0; i < length; i++) {
      result += Math.floor(Math.random() * 10);
    }
    return result;
  }

  /**
   * MD5 哈希
   */
  static md5(str: string): string {
    return createHash('md5').update(str).digest('hex');
  }

  /**
   * SHA256 哈希
   */
  static sha256(str: string): string {
    return createHash('sha256').update(str).digest('hex');
  }

  /**
   * Base64 编码
   */
  static base64Encode(str: string): string {
    return Buffer.from(str).toString('base64');
  }

  /**
   * Base64 解码
   */
  static base64Decode(str: string): string {
    return Buffer.from(str, 'base64').toString('utf-8');
  }
}
