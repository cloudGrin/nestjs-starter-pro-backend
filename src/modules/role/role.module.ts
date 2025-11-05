import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RoleEntity } from './entities/role.entity';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { MenuEntity } from '../menu/entities/menu.entity';
import { RoleRepository } from './repositories/role.repository';
import { RoleService } from './services/role.service';
import { RoleController } from './controllers/role.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RoleEntity,
      PermissionEntity,
      MenuEntity, // RoleService 需要（用于菜单授权）
    ]),
  ],
  controllers: [RoleController],
  providers: [RoleRepository, RoleService],
  exports: [RoleService, RoleRepository],
})
export class RoleModule {}
