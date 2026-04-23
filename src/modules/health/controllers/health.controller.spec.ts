import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from '../services/health.service';

describe('HealthController', () => {
  it('returns 503 when readiness dependencies are unhealthy', async () => {
    const controller = new HealthController({
      checkReadiness: jest.fn().mockResolvedValue({ status: 'unhealthy' }),
    } as unknown as HealthService);

    await expect(controller.readyz()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
