import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemConfigEntity } from './entities/system-config.entity';
import { SystemConfigRepository } from './repositories/system-config.repository';
import { SystemConfigService } from './services/system-config.service';
import { SystemConfigController } from './controllers/system-config.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SystemConfigEntity])],
  controllers: [SystemConfigController],
  providers: [SystemConfigRepository, SystemConfigService],
  exports: [SystemConfigService, SystemConfigRepository],
})
export class ConfigModule {}
