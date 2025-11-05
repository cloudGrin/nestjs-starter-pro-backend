import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseRepository, PaginationResult, PaginationOptions } from '~/core/base/base.repository';
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
export class FileRepository extends BaseRepository<FileEntity> {
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
  ) {
    super(fileRepository);
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

  /**
   * 获取实体名称（用于日志）
   */
  getEntityName(): string {
    return 'File';
  }
}
