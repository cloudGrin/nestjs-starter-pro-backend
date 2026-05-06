import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createMockRepository } from '~/test-utils';
import { FamilyChatMessageEntity, FamilyPostEntity, FamilyReadStateEntity } from '../entities';
import { FamilyReadStateService } from './family-read-state.service';

describe('FamilyReadStateService', () => {
  let service: FamilyReadStateService;
  let readStateRepository: jest.Mocked<Repository<FamilyReadStateEntity>>;
  let postRepository: jest.Mocked<Repository<FamilyPostEntity>>;
  let chatMessageRepository: jest.Mocked<Repository<FamilyChatMessageEntity>>;

  const user = {
    id: 1,
    username: 'dad',
    email: 'dad@example.com',
    roles: [],
    sessionId: 's1',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FamilyReadStateService,
        { provide: getRepositoryToken(FamilyReadStateEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(FamilyPostEntity), useValue: createMockRepository() },
        { provide: getRepositoryToken(FamilyChatMessageEntity), useValue: createMockRepository() },
      ],
    }).compile();

    service = module.get(FamilyReadStateService);
    readStateRepository = module.get(getRepositoryToken(FamilyReadStateEntity));
    postRepository = module.get(getRepositoryToken(FamilyPostEntity));
    chatMessageRepository = module.get(getRepositoryToken(FamilyChatMessageEntity));

    readStateRepository.create.mockImplementation((data) => data as FamilyReadStateEntity);
    readStateRepository.save.mockImplementation(async (data) =>
      Object.assign(new FamilyReadStateEntity(), data, { id: 1 }),
    );
    postRepository.find.mockResolvedValue([Object.assign(new FamilyPostEntity(), { id: 42 })]);
    chatMessageRepository.find.mockResolvedValue([
      Object.assign(new FamilyChatMessageEntity(), { id: 77 }),
    ]);
    postRepository.count.mockResolvedValue(0);
    chatMessageRepository.count.mockResolvedValue(0);
  });

  it('uses the current latest post and message as the baseline on first state read', async () => {
    readStateRepository.findOne.mockResolvedValue(null);

    const result = await service.getState(user);

    expect(readStateRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 1,
        lastReadPostId: 42,
        lastReadChatMessageId: 77,
      }),
    );
    expect(result).toEqual(
      expect.objectContaining({
        unreadPosts: 0,
        unreadChatMessages: 0,
        latestPostId: 42,
        latestChatMessageId: 77,
        lastReadPostId: 42,
        lastReadChatMessageId: 77,
      }),
    );
  });

  it('loads the latest ids without calling TypeORM findOne without selection conditions', async () => {
    readStateRepository.findOne.mockResolvedValue(null);

    await service.getState(user);

    expect(postRepository.findOne).not.toHaveBeenCalled();
    expect(chatMessageRepository.findOne).not.toHaveBeenCalled();
    expect(postRepository.find).toHaveBeenCalledWith({
      select: ['id'],
      order: { id: 'DESC' },
      take: 1,
    });
    expect(chatMessageRepository.find).toHaveBeenCalledWith({
      select: ['id'],
      order: { id: 'DESC' },
      take: 1,
    });
  });

  it('counts unread family content after the stored read ids', async () => {
    readStateRepository.findOne.mockResolvedValue(
      Object.assign(new FamilyReadStateEntity(), {
        userId: 1,
        lastReadPostId: 10,
        lastReadChatMessageId: 20,
      }),
    );
    postRepository.count.mockResolvedValue(2);
    chatMessageRepository.count.mockResolvedValue(3);

    const result = await service.getState(user);

    expect(postRepository.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: expect.any(Object),
        authorId: expect.any(Object),
      }),
    });
    expect(chatMessageRepository.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: expect.any(Object),
        senderId: expect.any(Object),
      }),
    });
    expect(result.unreadPosts).toBe(2);
    expect(result.unreadChatMessages).toBe(3);
  });

  it('does not move post read state backwards', async () => {
    readStateRepository.findOne.mockResolvedValue(
      Object.assign(new FamilyReadStateEntity(), {
        userId: 1,
        lastReadPostId: 50,
        lastReadChatMessageId: 20,
      }),
    );

    await service.markPostsRead(user, 40);

    expect(readStateRepository.save).not.toHaveBeenCalled();
  });

  it('moves chat read state forward with a conditional update', async () => {
    readStateRepository.findOne.mockResolvedValue(
      Object.assign(new FamilyReadStateEntity(), {
        userId: 1,
        lastReadPostId: 10,
        lastReadChatMessageId: 20,
      }),
    );

    await service.markChatRead(user, 30);

    expect(readStateRepository.update).toHaveBeenCalledWith(
      {
        userId: 1,
        lastReadChatMessageId: expect.any(Object),
      },
      expect.objectContaining({
        lastReadChatMessageId: 30,
      }),
    );
  });

  it('uses a conditional update so stale overlapping post read calls cannot move backwards', async () => {
    readStateRepository.findOne.mockResolvedValue(
      Object.assign(new FamilyReadStateEntity(), {
        userId: 1,
        lastReadPostId: 20,
        lastReadChatMessageId: 20,
      }),
    );

    await service.markPostsRead(user, 30);

    expect(readStateRepository.update).toHaveBeenCalledWith(
      {
        userId: 1,
        lastReadPostId: expect.any(Object),
      },
      expect.objectContaining({
        lastReadPostId: 30,
      }),
    );
    expect(readStateRepository.save).not.toHaveBeenCalled();
  });

  it('refetches read state when first-time creation races with another request', async () => {
    const racedState = Object.assign(new FamilyReadStateEntity(), {
      id: 2,
      userId: 1,
      lastReadPostId: 43,
      lastReadChatMessageId: 78,
    });
    readStateRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(racedState)
      .mockResolvedValueOnce(racedState);
    readStateRepository.save.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        code: 'ER_DUP_ENTRY',
      }),
    );

    const result = await service.getState(user);

    expect(result.lastReadPostId).toBe(43);
    expect(result.lastReadChatMessageId).toBe(78);
  });
});
