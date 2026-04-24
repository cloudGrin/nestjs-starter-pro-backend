import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Body,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { StreamableFile } from '@nestjs/common';
import { FileService } from '../services/file.service';
import { UploadFileDto } from '../dto/upload-file.dto';
import { QueryFileDto } from '../dto/query-file.dto';
import { RequirePermissions, CurrentUser } from '~/core/decorators';
import { FileEntity } from '../entities/file.entity';
import { BusinessException } from '~/common/exceptions/business.exception';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { DEFAULT_FILE_MAX_SIZE } from '~/config/constants';

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
    description: '上传单个文件，默认最大文件大小为50MB。支持常见文件格式。',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件（默认最大50MB）',
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
  @ApiCreatedResponse({ type: FileEntity })
  @ApiBadRequestResponse({ description: '参数验证失败' })
  @ApiUnauthorizedResponse({ description: '用户未认证或 token 已过期' })
  @ApiForbiddenResponse({ description: '用户无权限访问该资源' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: DEFAULT_FILE_MAX_SIZE,
      },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFileDto,
    @CurrentUser() user: AuthenticatedUser,
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

    return this.fileService.upload(file, dto, user?.id);
  }

  @Get()
  @RequirePermissions('file:read')
  @ApiOperation({ summary: '获取文件列表' })
  @ApiOkResponse({ description: '获取文件列表成功' })
  @ApiBadRequestResponse({ description: '参数验证失败' })
  @ApiUnauthorizedResponse({ description: '用户未认证或 token 已过期' })
  @ApiForbiddenResponse({ description: '用户无权限访问该资源' })
  async findAll(@Query() query: QueryFileDto) {
    return this.fileService.findFiles(query);
  }

  @Get(':id')
  @RequirePermissions('file:read')
  @ApiOperation({ summary: '获取文件详情' })
  @ApiParam({ name: 'id', description: '文件ID' })
  @ApiOkResponse({ type: FileEntity })
  @ApiUnauthorizedResponse({ description: '用户未认证或 token 已过期' })
  @ApiForbiddenResponse({ description: '用户无权限访问该资源' })
  @ApiNotFoundResponse({ description: '请求的资源不存在' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.fileService.findById(id);
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
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const file = await this.fileService.findById(id);

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
