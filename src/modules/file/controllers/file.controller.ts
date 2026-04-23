import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { StreamableFile } from '@nestjs/common';
import { FileService } from '../services/file.service';
import { UploadFileDto } from '../dto/upload-file.dto';
import { QueryFileDto } from '../dto/query-file.dto';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  ApiCommonResponses,
  RequirePermissions,
  CurrentUser,
} from '~/core/decorators';
import { FileEntity } from '../entities/file.entity';
import { BusinessException } from '~/common/exceptions/business.exception';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserEntity } from '~/modules/user/entities/user.entity';

@ApiTags('文件管理')
@ApiBearerAuth()
@Controller('files')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermissions('file:upload')
  @ApiOperation({
    summary: '上传文件（直传）',
    description: '上传单个文件，默认最大文件大小为100MB。支持常见文件格式。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件（最大100MB）',
        },
        module: {
          type: 'string',
          description: '业务模块标识',
          example: 'user-avatar',
        },
        tags: {
          type: 'string',
          description: '业务标签，逗号分隔',
          example: 'avatar,profile',
        },
        isPublic: {
          type: 'boolean',
          description: '是否公开访问',
          default: false,
        },
        remark: {
          type: 'string',
          description: '备注信息',
          maxLength: 500,
        },
      },
      required: ['file'],
    },
  })
  @ApiSuccessResponse(FileEntity)
  @ApiCommonResponses()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request, // 使用原始请求对象绕过ValidationPipe
    @CurrentUser() user: UserEntity,
  ) {
    // 检查文件是否存在，避免传递undefined到Service导致500错误
    if (!file) {
      throw BusinessException.validationFailed('请选择要上传的文件');
    }

    // 修复中文文件名编码问题：multer 将 UTF-8 文件名错误地当作 Latin-1 解析
    // 需要重新以正确的编码解码文件名
    if (file.originalname) {
      try {
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
      } catch (error) {
        // 如果转换失败，保持原始文件名
      }
    }

    // 从请求体中提取参数
    const payload = req.body;

    // 手动构建DTO对象
    const uploadDto: UploadFileDto = {
      module: payload.module,
      tags: payload.tags,
      isPublic: payload.isPublic === 'true' || payload.isPublic === true,
      remark: payload.remark,
    };

    return this.fileService.upload(file, uploadDto, user?.id);
  }

  @Get()
  @RequirePermissions('file:read')
  @ApiOperation({ summary: '获取文件列表' })
  @ApiPaginatedResponse(FileEntity)
  @ApiCommonResponses()
  async findAll(@Query() query: QueryFileDto) {
    return this.fileService.findFiles(query);
  }

  @Get(':id')
  @RequirePermissions('file:read')
  @ApiOperation({ summary: '获取文件详情' })
  @ApiParam({ name: 'id', description: '文件ID' })
  @ApiSuccessResponse(FileEntity)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const file = await this.fileService.findOne(id);
    if (!file) {
      throw BusinessException.notFound('文件', id);
    }
    return file;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('file:delete')
  @ApiOperation({ summary: '删除文件' })
  @ApiParam({ name: 'id', description: '文件ID' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.fileService.remove(id);
  }

  @Get(':id/download')
  @RequirePermissions('file:download')
  @ApiOperation({ summary: '下载文件' })
  @ApiParam({ name: 'id', description: '文件ID' })
  async download(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: UserEntity,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.fileService.findOne(id);
    if (!file) {
      throw BusinessException.notFound('文件', id);
    }

    // 权限检查：如果文件不是公开的，需要验证访问权限
    this.fileService.checkDownloadPermission(file, user);

    const stream = await this.fileService.getDownloadStream(id);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
    );

    return new StreamableFile(stream as any);
  }
}
