import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileService } from './services/file.service';
import { FileController } from './controllers/file.controller';
import { LocalStorageStrategy } from './storage/local-storage.strategy';
import { OssStorageStrategy } from './storage/oss-storage.strategy';
import { FileStorageFactory } from './storage/storage.factory';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  controllers: [FileController],
  providers: [FileService, LocalStorageStrategy, OssStorageStrategy, FileStorageFactory],
  exports: [FileService],
})
export class FileModule {}
