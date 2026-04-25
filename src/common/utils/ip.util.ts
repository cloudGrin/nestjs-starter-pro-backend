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
}
