import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DiscoveryModule } from '@nestjs/core';
import { PermissionEntity } from './entities/permission.entity';
import { PermissionController } from './controllers/permission.controller';
import { PermissionService } from './services/permission.service';
import { PermissionScannerService } from './services/permission-scanner.service';
import { PermissionRepository } from './repositories/permission.repository';
import { RoleEntity } from '../role/entities/role.entity';

@Module({
  imports: [
    DiscoveryModule,
    TypeOrmModule.forFeature([
      PermissionEntity,
      RoleEntity, // 用于 PermissionsGuard
    ]),
  ],
  controllers: [PermissionController],
  providers: [
    PermissionService,
    PermissionScannerService,
    PermissionRepository,
  ],
  exports: [
    PermissionService,
    PermissionScannerService,
    PermissionRepository,
  ],
})
export class PermissionModule {}
