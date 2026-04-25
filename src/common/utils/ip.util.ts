import { Request } from 'express';

/**
 * IP工具类
 */
export class IpUtil {
  /**
   * 从请求中获取真实IP地址。
   * 默认不信任客户端可伪造的代理头，只有显式启用 trustProxy 时才读取。
   */
  static getRealIp(req: Request, trustProxy = false): string {
    if (trustProxy) {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
        return this.normalizeIp(ips[0].trim());
      }

      const realIp = req.headers['x-real-ip'];
      if (realIp) {
        return this.normalizeIp(typeof realIp === 'string' ? realIp : realIp[0]);
      }
    }

    if (req.ip) {
      return this.normalizeIp(req.ip);
    }

    // 从 connection.remoteAddress 获取
    if (req.connection?.remoteAddress) {
      return this.normalizeIp(req.connection.remoteAddress);
    }

    // 从 socket.remoteAddress 获取
    if (req.socket?.remoteAddress) {
      return this.normalizeIp(req.socket.remoteAddress);
    }

    return '127.0.0.1';
  }

  /**
   * 标准化IP地址
   * 将 IPv6 映射的 IPv4 地址转换为 IPv4 格式
   */
  static normalizeIp(ip: string): string {
    // IPv6 mapped IPv4 (::ffff:192.168.1.1 => 192.168.1.1)
    if (ip.startsWith('::ffff:')) {
      return ip.substring(7);
    }
    return ip;
  }

  /**
   * IP转长整型
   * @example ip2long('192.168.1.1') => 3232235777
   */
  static ip2long(ip: string): number {
    const parts = ip.split('.');
    if (parts.length !== 4) {
      throw new Error('Invalid IP address');
    }

    return (
      parts.reduce((result, octet) => {
        const num = parseInt(octet, 10);
        if (num < 0 || num > 255) {
          throw new Error('Invalid IP address');
        }
        return (result << 8) + num;
      }, 0) >>> 0
    ); // 使用无符号右移确保结果为正数
  }

  /**
   * 长整型转IP
   * @example long2ip(3232235777) => '192.168.1.1'
   */
  static long2ip(long: number): string {
    return [(long >>> 24) & 0xff, (long >>> 16) & 0xff, (long >>> 8) & 0xff, long & 0xff].join('.');
  }

  /**
   * 判断是否为有效的IPv4地址
   */
  static isValidIPv4(ip: string): boolean {
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipv4Regex.test(ip)) {
      return false;
    }

    const parts = ip.split('.');
    return parts.every((part) => {
      const num = parseInt(part, 10);
      return num >= 0 && num <= 255;
    });
  }

  /**
   * 判断是否为有效的IPv6地址
   */
  static isValidIPv6(ip: string): boolean {
    const ipv6Regex =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ip);
  }

  /**
   * 判断是否为内网IP
   */
  static isPrivateIp(ip: string): boolean {
    if (!this.isValidIPv4(ip)) {
      return false;
    }

    const parts = ip.split('.').map(Number);

    // 10.0.0.0 - 10.255.255.255
    if (parts[0] === 10) {
      return true;
    }

    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }

    // 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }

    // 127.0.0.0 - 127.255.255.255 (Loopback)
    if (parts[0] === 127) {
      return true;
    }

    return false;
  }

  /**
   * 判断是否为公网IP
   */
  static isPublicIp(ip: string): boolean {
    return this.isValidIPv4(ip) && !this.isPrivateIp(ip);
  }

  /**
   * 判断IP是否在指定范围内
   * @param ip 要检查的IP
   * @param cidr CIDR格式的IP范围 (如: 192.168.1.0/24)
   */
  static isInRange(ip: string, cidr: string): boolean {
    const [rangeIp, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    if (!this.isValidIPv4(ip) || !this.isValidIPv4(rangeIp)) {
      return false;
    }

    const ipLong = this.ip2long(ip);
    const rangeLong = this.ip2long(rangeIp);
    const mask = ~((1 << (32 - prefix)) - 1);

    return (ipLong & mask) === (rangeLong & mask);
  }

  /**
   * 获取IP地理位置信息（需要集成第三方服务）
   * 这里提供接口定义，具体实现需要接入IP库或API
   */
  static async getLocation(_ip: string): Promise<{
    country: string;
    province: string;
    city: string;
    isp?: string;
  } | null> {
    // TODO: 集成IP地理位置库
    // 可选方案:
    // 1. ip2region - 离线IP库
    // 2. GeoLite2 - MaxMind的免费数据库
    // 3. 高德/百度等地图API
    // 4. ipapi.co / ip-api.com 等在线服务

    // 示例返回格式
    return {
      country: '中国',
      province: '广东省',
      city: '深圳市',
      isp: '电信',
    };
  }

  /**
   * 格式化IP地址显示
   * 内网IP显示为 "内网IP"，公网IP保持原样
   */
  static formatIp(ip: string): string {
    if (!ip || ip === '127.0.0.1' || ip === 'localhost') {
      return '本地';
    }

    if (this.isPrivateIp(ip)) {
      return `内网IP (${ip})`;
    }

    return ip;
  }

  /**
   * 获取IP段的所有IP地址
   * @param cidr CIDR格式 (如: 192.168.1.0/24)
   */
  static getIpRange(cidr: string): string[] {
    const [rangeIp, prefixLength] = cidr.split('/');
    const prefix = parseInt(prefixLength, 10);

    if (!this.isValidIPv4(rangeIp) || prefix < 0 || prefix > 32) {
      return [];
    }

    const start = this.ip2long(rangeIp);
    const count = Math.pow(2, 32 - prefix);
    const ips: string[] = [];

    for (let i = 0; i < count; i++) {
      ips.push(this.long2ip(start + i));
    }

    return ips;
  }
}
