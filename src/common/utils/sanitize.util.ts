/**
 * 敏感信息脱敏工具
 *
 * 用于在日志、错误信息等场景中隐藏敏感字段
 */
export class SanitizeUtil {
  /**
   * 敏感字段列表
   */
  private static readonly SENSITIVE_FIELDS = [
    // 认证相关
    'password',
    'oldPassword',
    'newPassword',
    'confirmPassword',
    'refreshToken',
    'accessToken',
    'token',
    'jwt',
    'sessionId',

    // 密钥相关
    'secret',
    'apiKey',
    'privateKey',
    'publicKey',
    'secretKey',
    'accessKey',
    'secretId',

    // 个人敏感信息
    'idCard',
    'passport',
    'creditCard',
    'bankAccount',
    'ssn', // Social Security Number

    // 支付相关
    'cvv',
    'cardNumber',
    'accountNumber',
  ];

  /**
   * 脱敏单个值
   * @param value 原始值
   * @returns 脱敏后的值
   */
  static sanitizeValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return '***';
    }

    if (typeof value === 'object') {
      return '[REDACTED]';
    }

    return '***';
  }

  /**
   * 脱敏对象（深度递归）
   * @param data 原始对象
   * @param additionalFields 额外需要脱敏的字段
   * @returns 脱敏后的对象
   */
  static sanitize<T = any>(data: T, additionalFields: string[] = []): T {
    if (data === null || data === undefined) {
      return data;
    }

    // 基本类型直接返回
    if (typeof data !== 'object') {
      return data;
    }

    // 数组递归处理
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item, additionalFields)) as any;
    }

    // 对象处理
    const sanitized: any = { ...data };
    const sensitiveFields = [...this.SENSITIVE_FIELDS, ...additionalFields];

    for (const key in sanitized) {
      if (!Object.prototype.hasOwnProperty.call(sanitized, key)) {
        continue;
      }

      // 检查是否为敏感字段（不区分大小写）
      const isSensitive = sensitiveFields.some(
        (field) => key.toLowerCase() === field.toLowerCase(),
      );

      if (isSensitive) {
        sanitized[key] = this.sanitizeValue(sanitized[key]);
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        // 递归处理嵌套对象
        sanitized[key] = this.sanitize(sanitized[key], additionalFields);
      }
    }

    return sanitized;
  }

  /**
   * 脱敏请求体（用于日志记录）
   * @param body 请求体
   * @returns 脱敏后的请求体
   */
  static sanitizeRequestBody(body: any): any {
    return this.sanitize(body);
  }

  /**
   * 脱敏查询参数（用于日志记录）
   * @param query 查询参数
   * @returns 脱敏后的查询参数
   */
  static sanitizeQuery(query: any): any {
    return this.sanitize(query);
  }

  /**
   * 脱敏响应数据（谨慎使用，可能影响业务）
   * @param response 响应数据
   * @returns 脱敏后的响应数据
   */
  static sanitizeResponse(response: any): any {
    return this.sanitize(response);
  }

  /**
   * 部分脱敏（保留部分信息）
   * 常用于手机号、邮箱等需要显示部分信息的场景
   */
  static partial = {
    /**
     * 手机号脱敏：保留前3位和后4位
     * @example 13812345678 -> 138****5678
     */
    phone(phone: string): string {
      if (!phone || phone.length < 11) {
        return phone;
      }
      return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    },

    /**
     * 邮箱脱敏：保留前3位和@后的域名
     * @example user@example.com -> use***@example.com
     */
    email(email: string): string {
      if (!email || !email.includes('@')) {
        return email;
      }
      const [username, domain] = email.split('@');
      if (username.length <= 3) {
        return `***@${domain}`;
      }
      return `${username.slice(0, 3)}***@${domain}`;
    },

    /**
     * 身份证脱敏：保留前6位和后4位
     * @example 110101199001011234 -> 110101********1234
     */
    idCard(idCard: string): string {
      if (!idCard || idCard.length < 10) {
        return '***';
      }
      return idCard.replace(/(\d{6})\d+(\d{4})/, '$1********$2');
    },

    /**
     * 银行卡脱敏：保留后4位
     * @example 6222021234567890123 -> **** **** **** 0123
     */
    bankCard(card: string): string {
      if (!card || card.length < 4) {
        return '***';
      }
      return `**** **** **** ${card.slice(-4)}`;
    },

    /**
     * 姓名脱敏：保留姓
     * @example 张三 -> 张*
     * @example 欧阳修 -> 欧阳*
     */
    name(name: string): string {
      if (!name || name.length === 0) {
        return name;
      }
      if (name.length === 1) {
        return '*';
      }
      if (name.length === 2) {
        return name[0] + '*';
      }
      // 保留前两个字（处理复姓）
      return name.slice(0, 2) + '*'.repeat(name.length - 2);
    },

    /**
     * 地址脱敏：保留省市
     * @example 北京市朝阳区某某街道123号 -> 北京市朝阳区****
     */
    address(address: string): string {
      if (!address || address.length < 6) {
        return '***';
      }
      // 尝试提取省市区
      const match = address.match(/^(.+?[省市区]){1,2}/);
      if (match) {
        return match[0] + '****';
      }
      return address.slice(0, 6) + '****';
    },
  };

  /**
   * 判断字段名是否为敏感字段
   * @param fieldName 字段名
   * @returns 是否为敏感字段
   */
  static isSensitiveField(fieldName: string): boolean {
    return this.SENSITIVE_FIELDS.some((field) => fieldName.toLowerCase() === field.toLowerCase());
  }

  /**
   * 添加自定义敏感字段
   * @param fields 字段名数组
   */
  static addSensitiveFields(...fields: string[]): void {
    this.SENSITIVE_FIELDS.push(...fields);
  }
}
