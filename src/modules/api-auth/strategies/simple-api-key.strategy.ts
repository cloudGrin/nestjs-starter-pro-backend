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
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('Missing API Key');
    }

    const app = await this.apiAuthService.validateApiKey(apiKey);

    if (!app) {
      throw new UnauthorizedException('Invalid API Key');
    }

    return app;
  }
}
