import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessException } from '~/common/exceptions/business.exception';
import { createMockLogger, createMockRepository } from '~/test-utils';
import { LoggerService } from '~/shared/logger/logger.service';
import { UserEntity } from '~/modules/user/entities/user.entity';
import { InsuranceMemberEntity } from '../entities/insurance-member.entity';
import { InsurancePolicyEntity } from '../entities/insurance-policy.entity';
import { InsuranceMemberService } from './insurance-member.service';

describe('InsuranceMemberService', () => {
  let service: InsuranceMemberService;
  let memberRepository: jest.Mocked<Repository<InsuranceMemberEntity>>;
  let policyRepository: jest.Mocked<Repository<InsurancePolicyEntity>>;
  let userRepository: jest.Mocked<Repository<UserEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsuranceMemberService,
        {
          provide: getRepositoryToken(InsuranceMemberEntity),
          useValue: createMockRepository<InsuranceMemberEntity>(),
        },
        {
          provide: getRepositoryToken(InsurancePolicyEntity),
          useValue: createMockRepository<InsurancePolicyEntity>(),
        },
        { provide: getRepositoryToken(UserEntity), useValue: createMockRepository<UserEntity>() },
        { provide: LoggerService, useValue: createMockLogger() },
      ],
    }).compile();

    service = module.get(InsuranceMemberService);
    memberRepository = module.get(getRepositoryToken(InsuranceMemberEntity));
    policyRepository = module.get(getRepositoryToken(InsurancePolicyEntity));
    userRepository = module.get(getRepositoryToken(UserEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('normalizes member names when creating a member', async () => {
    memberRepository.create.mockImplementation((data) => data as InsuranceMemberEntity);
    memberRepository.save.mockImplementation(async (data) =>
      Object.assign(new InsuranceMemberEntity(), data, { id: 3 }),
    );

    const result = await service.createMember({
      name: '  妈妈  ',
      relationship: '母亲',
      sort: 2,
    });

    expect(result.name).toBe('妈妈');
    expect(memberRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: '妈妈', relationship: '母亲', sort: 2 }),
    );
  });

  it('rejects deleting a member that still owns policies', async () => {
    memberRepository.findOne.mockResolvedValue(
      Object.assign(new InsuranceMemberEntity(), { id: 3 }),
    );
    policyRepository.count.mockResolvedValue(1);

    await expect(service.removeMember(3)).rejects.toThrow(BusinessException);
    expect(memberRepository.softDelete).not.toHaveBeenCalled();
  });

  it('validates linked users when creating a member', async () => {
    userRepository.findOne.mockResolvedValue(null);

    await expect(
      service.createMember({
        name: '爸爸',
        linkedUserId: 99,
      }),
    ).rejects.toThrow(BusinessException);
    expect(memberRepository.save).not.toHaveBeenCalled();
  });
});
