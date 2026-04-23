import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ApiAuthService } from '../services/api-auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(private readonly apiAuthService: ApiAuthService) {
    super();
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

      // 返回应用信息供后续使用
      return {
        id: app.id,
        name: app.name,
        scopes: app.scopes || [],
        type: 'api-app',
      };
    } catch (error) {
      throw error;
    }
  }
}
