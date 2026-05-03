import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAuthenticated } from '~/core/decorators';
import { CurrentUser } from '~/modules/auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { CompleteFamilyMediaDirectUploadDto, CreateFamilyMediaDirectUploadDto } from '../dto';
import { FamilyService } from '../services/family.service';

@ApiTags('家庭媒体')
@ApiBearerAuth()
@AllowAuthenticated()
@Controller('family/media/direct-upload')
export class FamilyMediaController {
  constructor(private readonly familyService: FamilyService) {}

  @Post('initiate')
  @ApiOperation({ summary: '初始化家庭媒体 OSS 直传' })
  async createDirectUpload(
    @Body() dto: CreateFamilyMediaDirectUploadDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.familyService.createMediaDirectUpload(dto, user);
  }

  @Post('complete')
  @ApiOperation({ summary: '完成家庭媒体 OSS 直传' })
  async completeDirectUpload(@Body() dto: CompleteFamilyMediaDirectUploadDto) {
    return this.familyService.completeMediaDirectUpload(dto);
  }
}
