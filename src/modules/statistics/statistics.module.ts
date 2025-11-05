import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { UserEntity } from '../user/entities/user.entity';
import { RoleEntity } from '../role/entities/role.entity';
import { MenuEntity } from '../menu/entities/menu.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity, MenuEntity])],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
