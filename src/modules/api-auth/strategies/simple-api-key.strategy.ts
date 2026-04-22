import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiAuthService } from '../services/api-auth.service';
import * as ipaddr from 'ipaddr.js';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  private readonly logger = new Logger(ApiKeyStrategy.name);

  constructor(private readonly apiAuthService: ApiAuthService) {
    super();
  }

  /**
   * 验证IP地址是否在白名单中
   */
  private validateIpWhitelist(clientIp: string, whitelist: string[] | null | undefined): boolean {
    if (!whitelist || whitelist.length === 0) {
      return true; // 没有配置白名单，允许所有IP
    }

    // 获取真实IP（处理代理情况）
    const realIp = this.extractRealIp(clientIp);

    try {
      const clientAddr = ipaddr.process(realIp);

      return whitelist.some((allowedIp) => {
        // 支持CIDR表示法，如 192.168.1.0/24
        if (allowedIp.includes('/')) {
          const [network, prefix] = allowedIp.split('/');
          const networkAddr = ipaddr.process(network);
          const prefixLength = parseInt(prefix, 10);

          if (clientAddr.kind() === networkAddr.kind()) {
            return clientAddr.match(networkAddr, prefixLength);
          }
        } else {
          // 单个IP地址
          const allowedAddr = ipaddr.process(allowedIp);
          return clientAddr.toString() === allowedAddr.toString();
        }
        return false;
      });
    } catch (error) {
      this.logger.error('IP validation error', { error, clientIp, whitelist });
      return false; // 解析失败时拒绝访问
    }
  }

  /**
   * 提取真实IP地址（处理代理）
   */
  private extractRealIp(ipString: string): string {
    // 处理 X-Forwarded-For 等代理头中的IP
    if (ipString.includes(',')) {
      return ipString.split(',')[0].trim();
    }
    // 处理IPv6中的端口号
    if (ipString.includes('::ffff:')) {
      return ipString.replace('::ffff:', '');
    }
    return ipString;
  }

  async validate(req: Request) {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        throw new UnauthorizedException('Missing API Key');
      }

      const app = await this.apiAuthService.validateApiKey(apiKey);

      if (!app) {
        throw new UnauthorizedException('Invalid API Key');
      }

      // 验证IP白名单
      const rawClientIp =
        req.headers['x-forwarded-for'] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.ip ||
        'unknown';

      // 将 string | string[] 转换为 string
      const clientIp = Array.isArray(rawClientIp) ? rawClientIp[0] : rawClientIp;

      if (!this.validateIpWhitelist(clientIp, app.ipWhitelist)) {
        this.logger.warn('IP not in whitelist', {
          appId: app.id,
          appName: app.name,
          clientIp,
          whitelist: app.ipWhitelist,
        });
        throw new ForbiddenException('IP address not allowed');
      }

      // 记录API调用
      const rawUserAgent = req.headers['user-agent'] || '';
      const userAgent = Array.isArray(rawUserAgent) ? rawUserAgent[0] : rawUserAgent;

      await this.apiAuthService.recordApiCall(app.id, {
        appName: app.name,
        method: req.method,
        endpoint: req.path,
        statusCode: 200,
        responseTime: 0,
        ipAddress: clientIp,
        userAgent,
      });

      // 检查速率限制
      await this.apiAuthService.checkRateLimit(app.id);

      // 返回应用信息供后续使用
      return {
        id: app.id,
        name: app.name,
        scopes: app.scopes || [],
        totalCalls: app.totalCalls || 0,
        rateLimitPerHour: app.rateLimitPerHour,
        rateLimitPerDay: app.rateLimitPerDay,
        lastCalledAt: app.lastCalledAt,
        type: 'api-app',
      };
    } catch (error) {
      throw error;
    }
  }
}
