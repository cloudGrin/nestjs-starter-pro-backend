import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuEntity } from './entities/menu.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { MenuController } from './controllers/menu.controller';
import { MenuService } from './services/menu.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MenuEntity,
      RoleEntity, // MenuService 需要（用于基于角色查询菜单）
    ]),
  ],
  controllers: [MenuController],
  providers: [MenuService],
  exports: [MenuService],
})
export class MenuModule {}
