import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { DictTypeService } from '../services/dict-type.service';
import { CreateDictTypeDto, UpdateDictTypeDto, QueryDictTypeDto } from '../dto/dict-type.dto';
import { ApiSuccessResponse, ApiPaginatedResponse, RequirePermissions } from '~/core/decorators';
import { DictTypeEntity } from '../entities/dict-type.entity';

@ApiTags('字典管理-字典类型')
@ApiBearerAuth()
@Controller('dict-types')
export class DictTypeController {
  constructor(private readonly dictTypeService: DictTypeService) {}

  @Post()
  @RequirePermissions('dict:create')
  @ApiOperation({ summary: '创建字典类型' })
  @ApiSuccessResponse(DictTypeEntity)
  async create(@Body() dto: CreateDictTypeDto) {
    return this.dictTypeService.create(dto);
  }

  @Get()
  @RequirePermissions('dict:read')
  @ApiOperation({ summary: '获取字典类型列表' })
  @ApiPaginatedResponse(DictTypeEntity)
  async findAll(@Query() query: QueryDictTypeDto) {
    return this.dictTypeService.findAll(query);
  }

  @Get('enabled')
  @RequirePermissions('dict:read')
  @ApiOperation({ summary: '获取所有启用的字典类型' })
  @ApiSuccessResponse(DictTypeEntity, true)
  async findEnabled() {
    return this.dictTypeService.findEnabled();
  }

  @Get('code/:code')
  @RequirePermissions('dict:read')
  @ApiOperation({ summary: '根据编码获取字典类型' })
  @ApiParam({ name: 'code', description: '字典类型编码' })
  @ApiSuccessResponse(DictTypeEntity)
  async findByCode(@Param('code') code: string) {
    return this.dictTypeService.findByCode(code);
  }

  @Get(':id')
  @RequirePermissions('dict:read')
  @ApiOperation({ summary: '获取字典类型详情' })
  @ApiParam({ name: 'id', description: '字典类型ID' })
  @ApiSuccessResponse(DictTypeEntity)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dictTypeService.findById(id);
  }

  @Put(':id')
  @RequirePermissions('dict:update')
  @ApiOperation({ summary: '更新字典类型' })
  @ApiParam({ name: 'id', description: '字典类型ID' })
  @ApiSuccessResponse(DictTypeEntity)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictTypeDto) {
    return this.dictTypeService.update(id, dto);
  }

  @Put(':id/toggle')
  @RequirePermissions('dict:update')
  @ApiOperation({ summary: '切换启用状态' })
  @ApiParam({ name: 'id', description: '字典类型ID' })
  @ApiSuccessResponse(DictTypeEntity)
  async toggleEnabled(@Param('id', ParseIntPipe) id: number) {
    return this.dictTypeService.toggleEnabled(id);
  }

  @Delete(':id')
  @RequirePermissions('dict:delete')
  @ApiOperation({ summary: '删除字典类型' })
  @ApiParam({ name: 'id', description: '字典类型ID' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.dictTypeService.delete(id);
    return { message: '删除成功' };
  }
}
