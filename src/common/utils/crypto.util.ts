import * as bcrypt from 'bcryptjs';

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
}
