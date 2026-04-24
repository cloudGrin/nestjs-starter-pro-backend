import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  FindOneOptions,
  FindOptionsWhere,
  SelectQueryBuilder,
  DeepPartial,
} from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { PaginationResult, PaginationOptions } from '~/common/types/pagination.types';
import { FileEntity, FileStatus, FileStorageType } from '../entities/file.entity';

export interface FileQueryOptions {
  keyword?: string;
  storage?: FileStorageType;
  status?: FileStatus;
  category?: string;
  module?: string;
  isPublic?: boolean;
}

@Injectable()
export class FileRepository {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {}

  create(data: DeepPartial<FileEntity>): FileEntity {
    return this.fileRepository.create(data);
  }

  async findByIdOrFail(id: number, options?: FindOneOptions<FileEntity>): Promise<FileEntity> {
    const entity = await this.fileRepository.findOne({
      ...options,
      where: { id } as FindOptionsWhere<FileEntity>,
    });

    if (!entity) {
      throw BusinessException.notFound('File', id);
    }

    return entity;
  }

  async createAndSave(data: DeepPartial<FileEntity>): Promise<FileEntity> {
    const entity = this.create(data);
    return this.fileRepository.save(entity);
  }

  async delete(id: number): Promise<void> {
    const result = await this.fileRepository.delete(id);
    if (result.affected === 0) {
      throw BusinessException.notFound('File', id);
    }
  }

  /**
   * 根据哈希查找文件
   */
  async findByHash(hash: string): Promise<FileEntity | null> {
    if (!hash) {
      return null;
    }
    return this.fileRepository.findOne({
      where: { hash },
    });
  }

  /**
   * 根据文件名查找
   */
  async findByFilename(filename: string): Promise<FileEntity | null> {
    return this.fileRepository.findOne({
      where: { filename },
    });
  }

  /**
   * 构建查询
   */
  buildQueryBuilder(alias = 'file'): SelectQueryBuilder<FileEntity> {
    return this.fileRepository.createQueryBuilder(alias);
  }

  /**
   * 分页查询文件列表
   */
  async paginateFiles(
    pagination: PaginationOptions,
    query: FileQueryOptions,
  ): Promise<PaginationResult<FileEntity>> {
    const qb = this.buildQueryBuilder('file');

    if (query.keyword) {
      qb.andWhere('(file.originalName LIKE :keyword OR file.filename LIKE :keyword)', {
        keyword: `%${query.keyword}%`,
      });
    }

    if (query.storage) {
      qb.andWhere('file.storage = :storage', { storage: query.storage });
    }

    if (query.status) {
      qb.andWhere('file.status = :status', { status: query.status });
    }

    if (query.category) {
      qb.andWhere('file.category = :category', { category: query.category });
    }

    if (query.module) {
      qb.andWhere('file.module = :module', { module: query.module });
    }

    if (query.isPublic !== undefined) {
      qb.andWhere('file.isPublic = :isPublic', { isPublic: query.isPublic });
    }

    qb.orderBy(
      pagination.sort ? `file.${pagination.sort}` : 'file.createdAt',
      pagination.order || 'DESC',
    );

    const page = Math.max(1, pagination.page || 1);
    const limit = Math.min(100, Math.max(1, pagination.limit || 10));
    const skip = (page - 1) * limit;

    const [items, totalItems] = await qb.skip(skip).take(limit).getManyAndCount();

    return {
      items,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }
}
