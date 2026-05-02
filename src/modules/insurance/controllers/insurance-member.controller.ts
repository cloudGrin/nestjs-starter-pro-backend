import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '~/core/decorators';
import { CreateInsuranceMemberDto, UpdateInsuranceMemberDto } from '../dto';
import { InsuranceMemberService } from '../services/insurance-member.service';

@ApiTags('家庭保险成员')
@ApiBearerAuth()
@Controller('insurance-members')
export class InsuranceMemberController {
  constructor(private readonly memberService: InsuranceMemberService) {}

  @Get()
  @RequirePermissions('insurance:read', 'insurance-member:manage')
  @ApiOperation({ summary: '获取保险成员列表' })
  async findMembers() {
    return this.memberService.findMembers();
  }

  @Post()
  @RequirePermissions('insurance-member:manage')
  @ApiOperation({ summary: '创建保险成员' })
  async createMember(@Body() dto: CreateInsuranceMemberDto) {
    return this.memberService.createMember(dto);
  }

  @Put(':id')
  @RequirePermissions('insurance-member:manage')
  @ApiOperation({ summary: '更新保险成员' })
  async updateMember(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInsuranceMemberDto) {
    return this.memberService.updateMember(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('insurance-member:manage')
  @ApiOperation({ summary: '删除保险成员' })
  async removeMember(@Param('id', ParseIntPipe) id: number) {
    await this.memberService.removeMember(id);
  }
}
