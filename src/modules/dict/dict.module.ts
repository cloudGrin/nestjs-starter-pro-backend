import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DictTypeEntity } from './entities/dict-type.entity';
import { DictItemEntity } from './entities/dict-item.entity';
import { DictTypeRepository } from './repositories/dict-type.repository';
import { DictItemRepository } from './repositories/dict-item.repository';
import { DictTypeService } from './services/dict-type.service';
import { DictItemService } from './services/dict-item.service';
import { DictTypeController } from './controllers/dict-type.controller';
import { DictItemController } from './controllers/dict-item.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DictTypeEntity, DictItemEntity])],
  controllers: [DictTypeController, DictItemController],
  providers: [DictTypeRepository, DictItemRepository, DictTypeService, DictItemService],
  exports: [DictTypeService, DictItemService, DictTypeRepository, DictItemRepository],
})
export class DictModule {}
