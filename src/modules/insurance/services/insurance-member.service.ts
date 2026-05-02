import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { LoggerService } from '~/shared/logger/logger.service';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { CreateInsuranceMemberDto, UpdateInsuranceMemberDto } from '../dto';
import { InsuranceMemberEntity } from '../entities/insurance-member.entity';
import { InsurancePolicyEntity } from '../entities/insurance-policy.entity';

@Injectable()
export class InsuranceMemberService {
  constructor(
    @InjectRepository(InsuranceMemberEntity)
    private readonly memberRepository: Repository<InsuranceMemberEntity>,
    @InjectRepository(InsurancePolicyEntity)
    private readonly policyRepository: Repository<InsurancePolicyEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly logger: LoggerService,
  ) {}

  async createMember(dto: CreateInsuranceMemberDto): Promise<InsuranceMemberEntity> {
    await this.ensureLinkedUserExists(dto.linkedUserId);
    const entity = this.memberRepository.create({
      name: this.normalizeRequiredText(dto.name, '成员姓名不能为空'),
      relationship: this.normalizeOptionalText(dto.relationship),
      linkedUserId: dto.linkedUserId ?? null,
      remark: this.normalizeOptionalText(dto.remark),
      sort: dto.sort ?? 0,
    });
    const saved = await this.memberRepository.save(entity);
    this.logger.log(`Created insurance member "${saved.name}"`);
    return saved;
  }

  async findMembers(): Promise<InsuranceMemberEntity[]> {
    return this.memberRepository.find({
      order: {
        sort: 'ASC',
        id: 'ASC',
      },
    });
  }

  async updateMember(id: number, dto: UpdateInsuranceMemberDto): Promise<InsuranceMemberEntity> {
    const entity = await this.findByIdOrFail(id);
    await this.ensureLinkedUserExists(dto.linkedUserId);

    if (dto.name !== undefined) {
      entity.name = this.normalizeRequiredText(dto.name, '成员姓名不能为空');
    }
    if (dto.relationship !== undefined) {
      entity.relationship = this.normalizeOptionalText(dto.relationship);
    }
    if (dto.linkedUserId !== undefined) {
      entity.linkedUserId = dto.linkedUserId ?? null;
    }
    if (dto.remark !== undefined) {
      entity.remark = this.normalizeOptionalText(dto.remark);
    }
    if (dto.sort !== undefined) {
      entity.sort = dto.sort;
    }

    return this.memberRepository.save(entity);
  }

  async removeMember(id: number): Promise<void> {
    await this.findByIdOrFail(id);
    const policyCount = await this.policyRepository.count({ where: { memberId: id } });
    if (policyCount > 0) {
      throw BusinessException.validationFailed('成员下仍有保单，不能删除');
    }

    const result = await this.memberRepository.softDelete(id);
    if (!result.affected) {
      throw BusinessException.notFound('Insurance member', id);
    }
  }

  private async findByIdOrFail(id: number): Promise<InsuranceMemberEntity> {
    const entity = await this.memberRepository.findOne({ where: { id } });
    if (!entity) {
      throw BusinessException.notFound('Insurance member', id);
    }

    return entity;
  }

  private async ensureLinkedUserExists(linkedUserId?: number | null): Promise<void> {
    if (!linkedUserId) {
      return;
    }

    const user = await this.userRepository.findOne({ where: { id: linkedUserId } });
    if (!user) {
      throw BusinessException.notFound('User', linkedUserId);
    }
  }

  private normalizeRequiredText(value: string, message: string): string {
    const text = value.trim();
    if (!text) {
      throw BusinessException.validationFailed(message);
    }

    return text;
  }

  private normalizeOptionalText(value?: string | null): string | null {
    const text = value?.trim();
    return text || null;
  }
}
