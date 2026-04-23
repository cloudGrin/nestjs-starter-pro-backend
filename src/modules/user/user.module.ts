import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from './entities/user.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { MenuEntity } from '../menu/entities/menu.entity';
import { UserRepository } from './repositories/user.repository';
import { UserService } from './services/user.service';
import { AdminBootstrapService } from './services/admin-bootstrap.service';
import { UserController } from './controllers/user.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, MenuEntity])],
  controllers: [UserController],
  providers: [UserRepository, UserService, AdminBootstrapService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
