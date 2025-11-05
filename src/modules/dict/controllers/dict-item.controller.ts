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
import { DictItemService } from '../services/dict-item.service';
import {
  CreateDictItemDto,
  UpdateDictItemDto,
  QueryDictItemDto,
  BatchCreateDictItemDto,
} from '../dto/dict-item.dto';
import { ApiSuccessResponse, ApiPaginatedResponse } from '~/core/decorators/api-response.decorator';
import { DictItemEntity } from '../entities/dict-item.entity';

@ApiTags('字典管理-字典项')
@ApiBearerAuth()
@Controller('dict-items')
export class DictItemController {
  constructor(private readonly dictItemService: DictItemService) {}

  @Post()
  @ApiOperation({ summary: '创建字典项' })
  @ApiSuccessResponse(DictItemEntity)
  async create(@Body() dto: CreateDictItemDto) {
    return this.dictItemService.create(dto);
  }

  @Post('batch')
  @ApiOperation({ summary: '批量创建字典项' })
  @ApiSuccessResponse(DictItemEntity, true)
  async batchCreate(@Body() dto: BatchCreateDictItemDto) {
    return this.dictItemService.batchCreate(dto);
  }

  @Get()
  @ApiOperation({ summary: '获取字典项列表' })
  @ApiPaginatedResponse(DictItemEntity)
  async findAll(@Query() query: QueryDictItemDto) {
    return this.dictItemService.findAll(query);
  }

  @Get('type/:typeId/enabled')
  @ApiOperation({ summary: '根据字典类型ID获取启用的字典项' })
  @ApiParam({ name: 'typeId', description: '字典类型ID' })
  @ApiSuccessResponse(DictItemEntity, true)
  async findEnabledByTypeId(@Param('typeId', ParseIntPipe) typeId: number) {
    return this.dictItemService.findEnabledByTypeId(typeId);
  }

  @Get('type/code/:typeCode/enabled')
  @ApiOperation({ summary: '根据字典类型编码获取启用的字典项' })
  @ApiParam({ name: 'typeCode', description: '字典类型编码' })
  @ApiSuccessResponse(DictItemEntity, true)
  async findEnabledByTypeCode(@Param('typeCode') typeCode: string) {
    return this.dictItemService.findEnabledByTypeCode(typeCode);
  }

  @Get('type/:typeId/default')
  @ApiOperation({ summary: '获取字典类型的默认值' })
  @ApiParam({ name: 'typeId', description: '字典类型ID' })
  @ApiSuccessResponse(DictItemEntity)
  async findDefaultByTypeId(@Param('typeId', ParseIntPipe) typeId: number) {
    return this.dictItemService.findDefaultByTypeId(typeId);
  }

  @Get('type/code/:typeCode/value/:value')
  @ApiOperation({ summary: '根据字典类型编码和值获取字典项' })
  @ApiParam({ name: 'typeCode', description: '字典类型编码' })
  @ApiParam({ name: 'value', description: '字典项值' })
  @ApiSuccessResponse(DictItemEntity)
  async findByTypeCodeAndValue(@Param('typeCode') typeCode: string, @Param('value') value: string) {
    return this.dictItemService.findByTypeCodeAndValue(typeCode, value);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取字典项详情' })
  @ApiParam({ name: 'id', description: '字典项ID' })
  @ApiSuccessResponse(DictItemEntity)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dictItemService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新字典项' })
  @ApiParam({ name: 'id', description: '字典项ID' })
  @ApiSuccessResponse(DictItemEntity)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateDictItemDto) {
    return this.dictItemService.update(id, dto);
  }

  @Put(':id/toggle-status')
  @ApiOperation({ summary: '切换启用状态' })
  @ApiParam({ name: 'id', description: '字典项ID' })
  @ApiSuccessResponse(DictItemEntity)
  async toggleStatus(@Param('id', ParseIntPipe) id: number) {
    return this.dictItemService.toggleStatus(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除字典项' })
  @ApiParam({ name: 'id', description: '字典项ID' })
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.dictItemService.delete(id);
    return { message: '删除成功' };
  }
}
