import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileEntity } from './entities/file.entity';
import { FileRepository } from './repositories/file.repository';
import { FileService } from './services/file.service';
import { FileController } from './controllers/file.controller';
import { LocalStorageStrategy } from './storage/local-storage.strategy';
import { OssStorageStrategy } from './storage/oss-storage.strategy';
import { MinioStorageStrategy } from './storage/minio-storage.strategy';
import { FileStorageFactory } from './storage/storage.factory';

@Module({
  imports: [TypeOrmModule.forFeature([FileEntity])],
  controllers: [FileController],
  providers: [
    FileRepository,
    FileService,
    LocalStorageStrategy,
    OssStorageStrategy,
    MinioStorageStrategy,
    FileStorageFactory,
  ],
  exports: [FileService],
})
export class FileModule {}
