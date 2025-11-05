import {
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { DeepPartial } from 'typeorm';
import { BaseService, CrudService } from './base.service';
import { PaginationOptions, PaginationResult } from './base.repository';
import { PaginationDto } from '~/common/dto/pagination.dto';

/**
 * CRUD 控制器基类
 * 提供标准的增删改查操作
 */
export abstract class CrudController<T extends { id: number }> {
  protected abstract readonly service: CrudService<T> | BaseService<T>;

  /**
   * 获取列表（分页）
   */
  @Get()
  @ApiOperation({ summary: '获取列表（分页）' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: '页码' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: '每页数量' })
  @ApiQuery({ name: 'sort', required: false, type: String, description: '排序字段' })
  @ApiQuery({ name: 'order', required: false, enum: ['ASC', 'DESC'], description: '排序方向' })
  async findAll(@Query() query: PaginationDto): Promise<PaginationResult<T> | T[]> {
    if (this.service instanceof BaseService) {
      return this.service.paginate(query);
    }
    return this.service.findAll();
  }

  /**
   * 根据 ID 获取详情
   */
  @Get(':id')
  @ApiOperation({ summary: '根据 ID 获取详情' })
  @ApiParam({ name: 'id', description: '实体 ID' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<T | null> {
    return this.service.findOne(id);
  }

  /**
   * 创建实体
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建实体' })
  @ApiBody({ description: '创建数据' })
  async create(@Body() createDto: DeepPartial<T>): Promise<T> {
    return this.service.create(createDto);
  }

  /**
   * 批量创建实体
   */
  @Post('batch')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '批量创建实体' })
  @ApiBody({ description: '批量创建数据', type: [Object] })
  async createMany(@Body() createDtos: DeepPartial<T>[]): Promise<T[]> {
    if (this.service instanceof BaseService) {
      return this.service.createMany(createDtos);
    }
    // 如果不是 BaseService，逐个创建
    const results: T[] = [];
    for (const dto of createDtos) {
      results.push(await this.service.create(dto));
    }
    return results;
  }

  /**
   * 更新实体
   */
  @Put(':id')
  @ApiOperation({ summary: '更新实体' })
  @ApiParam({ name: 'id', description: '实体 ID' })
  @ApiBody({ description: '更新数据' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: DeepPartial<T>,
  ): Promise<T> {
    return this.service.update(id, updateDto as any);
  }

  /**
   * 删除实体
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '删除实体' })
  @ApiParam({ name: 'id', description: '实体 ID' })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.service.remove(id);
  }

  /**
   * 批量删除实体
   */
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '批量删除实体' })
  @ApiBody({ description: '要删除的 ID 列表', type: [Number] })
  async removeMany(@Body() ids: number[]): Promise<void> {
    for (const id of ids) {
      await this.service.remove(id);
    }
  }

  /**
   * 检查实体是否存在
   */
  @Get(':id/exists')
  @ApiOperation({ summary: '检查实体是否存在' })
  @ApiParam({ name: 'id', description: '实体 ID' })
  async exists(@Param('id', ParseIntPipe) id: number): Promise<{ exists: boolean }> {
    if (this.service instanceof BaseService) {
      const exists = await this.service.exists({ id } as any);
      return { exists };
    }
    const entity = await this.service.findOne(id);
    return { exists: !!entity };
  }

  /**
   * 获取实体数量
   */
  @Get('count')
  @ApiOperation({ summary: '获取实体数量' })
  async count(): Promise<{ count: number }> {
    if (this.service instanceof BaseService) {
      const count = await this.service.count();
      return { count };
    }
    const all = await this.service.findAll();
    return { count: all.length };
  }
}
