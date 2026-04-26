import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { MenuEntity } from '../menu/entities/menu.entity';
import { RefreshTokenEntity } from '../auth/entities/refresh-token.entity';
import { PermissionEntity } from '../permission/entities/permission.entity';
import { UserService } from './services/user.service';
import { AdminBootstrapService } from './services/admin-bootstrap.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoleEntity,
      MenuEntity,
      PermissionEntity,
      RefreshTokenEntity,
    ]),
  ],
  controllers: [UserController],
  providers: [UserService, AdminBootstrapService],
  exports: [UserService],
})
export class UserModule {}
