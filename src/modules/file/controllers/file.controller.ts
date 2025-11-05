import {
  Body,
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
  ForbiddenException,
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
import { UploadChunkDto } from '../dto/upload-chunk.dto';
import { QueryFileDto } from '../dto/query-file.dto';
import {
  ApiPaginatedResponse,
  ApiSuccessResponse,
  ApiFileUploadResponse,
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
  @ApiFileUploadResponse('上传文件')
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

  @Post('upload/chunk')
  @RequirePermissions('file:upload')
  @ApiOperation({
    summary: '上传文件分片',
    description: '用于大文件分片上传，每个分片默认不超过10MB',
  })
  @ApiFileUploadResponse('上传文件分片')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        chunk: { type: 'string', format: 'binary', description: '分片文件' },
        uploadId: { type: 'string', description: '上传会话ID' },
        chunkIndex: { type: 'number', description: '当前分片索引（从1开始）' },
        totalChunks: { type: 'number', description: '分片总数' },
        chunkSize: { type: 'number', description: '分片大小（字节）' },
        totalSize: { type: 'number', description: '文件总大小（字节）' },
        filename: { type: 'string', description: '原始文件名' },
        hash: { type: 'string', description: '文件哈希（可选）' },
        module: { type: 'string', description: '业务模块标识' },
        tags: { type: 'string', description: '业务标签' },
        isPublic: { type: 'boolean', description: '是否公开访问' },
        remark: { type: 'string', description: '备注信息' },
      },
      required: [
        'chunk',
        'uploadId',
        'chunkIndex',
        'totalChunks',
        'chunkSize',
        'totalSize',
        'filename',
      ],
    },
  })
  @UseInterceptors(
    FileInterceptor('chunk', {
      storage: memoryStorage(),
    }),
  )
  async uploadChunk(
    @UploadedFile() file: Express.Multer.File,
    @Body() payload: UploadChunkDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.fileService.uploadChunk(file, payload, user?.id);
  }

  @Get()
  @RequirePermissions('file:read')
  @ApiOperation({ summary: '获取文件列表' })
  @ApiPaginatedResponse(FileEntity)
  @ApiCommonResponses()
  async findAll(@Query() query: QueryFileDto) {
    return this.fileService.findFiles(query);
  }

  @Get('upload/:uploadId/progress')
  @RequirePermissions('file:upload')
  @ApiOperation({ summary: '查询分片上传进度' })
  @ApiParam({ name: 'uploadId', description: '上传会话ID' })
  async getProgress(@Param('uploadId') uploadId: string) {
    const progress = await this.fileService.getUploadProgress(uploadId);
    if (!progress) {
      throw BusinessException.notFound('上传任务', uploadId);
    }
    return progress;
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

  @Get(':id/signed-url')
  @RequirePermissions('file:download')
  @ApiOperation({ summary: '生成文件下载签名 URL' })
  @ApiParam({ name: 'id', description: '文件ID' })
  async generateSignedUrl(
    @Param('id', ParseIntPipe) id: number,
    @Query('expiresIn', new ParseIntPipe({ optional: true })) expiresIn: number = 3600,
    @CurrentUser() user: UserEntity,
  ) {
    // 检查是否为管理员
    const isAdmin =
      user.roles?.some((role) => role.code === 'admin' || role.code === 'super_admin') ?? false;

    const signedUrl = await this.fileService.generateDownloadUrl(id, user.id, expiresIn, isAdmin);

    return {
      url: signedUrl,
      expiresIn,
      expiresAt: new Date(Date.now() + expiresIn * 1000),
    };
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
