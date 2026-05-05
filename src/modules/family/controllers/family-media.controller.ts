import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAuthenticated } from '~/core/decorators';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import {
  CompleteFamilyMediaDirectUploadDto,
  CreateFamilyMediaDirectUploadDto,
  UploadFamilyMediaDto,
} from '../dto';
import { FamilyMediaTarget } from '../entities';
import { FamilyService } from '../services/family.service';

@ApiTags('家庭媒体')
@ApiBearerAuth()
@AllowAuthenticated()
@Controller('family/media')
export class FamilyMediaController {
  constructor(private readonly familyService: FamilyService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传家庭媒体到本地存储' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'target'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '家庭图片或视频文件',
        },
        target: {
          type: 'string',
          enum: Object.values(FamilyMediaTarget),
          description: '媒体使用场景',
        },
      },
    },
  })
  async uploadLocalMedia(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadFamilyMediaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.familyService.uploadLocalMedia(file, dto, user);
  }

  @Post('direct-upload/initiate')
  @ApiOperation({ summary: '初始化家庭媒体 OSS 直传' })
  async createDirectUpload(
    @Body() dto: CreateFamilyMediaDirectUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.familyService.createMediaDirectUpload(dto, user);
  }

  @Post('direct-upload/complete')
  @ApiOperation({ summary: '完成家庭媒体 OSS 直传' })
  async completeDirectUpload(@Body() dto: CompleteFamilyMediaDirectUploadDto) {
    return this.familyService.completeMediaDirectUpload(dto);
  }
}
