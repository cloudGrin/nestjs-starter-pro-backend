import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, MoreThan, Not, Repository } from 'typeorm';
import { AuthenticatedUser } from '~/modules/auth/strategies/jwt.strategy';
import { FamilyChatMessageEntity, FamilyPostEntity, FamilyReadStateEntity } from '../entities';
import { FamilyReadStateResponseDto } from '../dto';

@Injectable()
export class FamilyReadStateService {
  constructor(
    @InjectRepository(FamilyReadStateEntity)
    private readonly readStateRepository: Repository<FamilyReadStateEntity>,
    @InjectRepository(FamilyPostEntity)
    private readonly postRepository: Repository<FamilyPostEntity>,
    @InjectRepository(FamilyChatMessageEntity)
    private readonly chatMessageRepository: Repository<FamilyChatMessageEntity>,
  ) {}

  async getState(user: AuthenticatedUser): Promise<FamilyReadStateResponseDto> {
    const state = await this.ensureReadState(user.id);
    const [latestPostId, latestChatMessageId, unreadPosts, unreadChatMessages] = await Promise.all([
      this.findLatestPostId(),
      this.findLatestChatMessageId(),
      this.countUnreadPosts(user.id, state.lastReadPostId),
      this.countUnreadChatMessages(user.id, state.lastReadChatMessageId),
    ]);

    return {
      unreadPosts,
      unreadChatMessages,
      latestPostId,
      latestChatMessageId,
      lastReadPostId: state.lastReadPostId ?? null,
      lastReadChatMessageId: state.lastReadChatMessageId ?? null,
    };
  }

  async markPostsRead(
    user: AuthenticatedUser,
    postId?: number,
  ): Promise<FamilyReadStateResponseDto> {
    const state = await this.ensureReadState(user.id);
    const nextPostId = postId ?? (await this.findLatestPostId());
    if (nextPostId && nextPostId > (state.lastReadPostId ?? 0)) {
      await this.updatePostReadPointer(user.id, nextPostId);
    }

    return this.getState(user);
  }

  async markChatRead(
    user: AuthenticatedUser,
    messageId?: number,
  ): Promise<FamilyReadStateResponseDto> {
    const state = await this.ensureReadState(user.id);
    const nextMessageId = messageId ?? (await this.findLatestChatMessageId());
    if (nextMessageId && nextMessageId > (state.lastReadChatMessageId ?? 0)) {
      await this.updateChatReadPointer(user.id, nextMessageId);
    }

    return this.getState(user);
  }

  private async ensureReadState(userId: number): Promise<FamilyReadStateEntity> {
    const existing = await this.readStateRepository.findOne({ where: { userId } });
    if (existing) {
      return existing;
    }

    const [latestPostId, latestChatMessageId] = await Promise.all([
      this.findLatestPostId(),
      this.findLatestChatMessageId(),
    ]);
    const now = new Date();

    try {
      return await this.readStateRepository.save(
        this.readStateRepository.create({
          userId,
          lastReadPostId: latestPostId,
          lastReadChatMessageId: latestChatMessageId,
          readPostsAt: latestPostId ? now : null,
          readChatAt: latestChatMessageId ? now : null,
        }),
      );
    } catch (error) {
      if (!this.isDuplicateReadStateError(error)) {
        throw error;
      }

      const racedState = await this.readStateRepository.findOne({ where: { userId } });
      if (!racedState) {
        throw error;
      }

      return racedState;
    }
  }

  private async findLatestPostId(): Promise<number | null> {
    const [post] = await this.postRepository.find({
      select: ['id'],
      order: { id: 'DESC' },
      take: 1,
    });

    return post?.id ?? null;
  }

  private async findLatestChatMessageId(): Promise<number | null> {
    const [message] = await this.chatMessageRepository.find({
      select: ['id'],
      order: { id: 'DESC' },
      take: 1,
    });

    return message?.id ?? null;
  }

  private async updatePostReadPointer(userId: number, postId: number): Promise<void> {
    const update = {
      lastReadPostId: postId,
      readPostsAt: new Date(),
    };
    await this.readStateRepository.update(
      {
        userId,
        lastReadPostId: LessThan(postId),
      },
      update,
    );
    await this.readStateRepository.update(
      {
        userId,
        lastReadPostId: IsNull(),
      },
      update,
    );
  }

  private async updateChatReadPointer(userId: number, messageId: number): Promise<void> {
    const update = {
      lastReadChatMessageId: messageId,
      readChatAt: new Date(),
    };
    await this.readStateRepository.update(
      {
        userId,
        lastReadChatMessageId: LessThan(messageId),
      },
      update,
    );
    await this.readStateRepository.update(
      {
        userId,
        lastReadChatMessageId: IsNull(),
      },
      update,
    );
  }

  private isDuplicateReadStateError(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeError = error as {
      code?: string;
      errno?: number;
      driverError?: { code?: string; errno?: number };
    };
    return (
      maybeError.code === 'ER_DUP_ENTRY' ||
      maybeError.errno === 1062 ||
      maybeError.driverError?.code === 'ER_DUP_ENTRY' ||
      maybeError.driverError?.errno === 1062
    );
  }

  private countUnreadPosts(userId: number, lastReadPostId?: number | null): Promise<number> {
    return this.postRepository.count({
      where: {
        id: MoreThan(lastReadPostId ?? 0),
        authorId: Not(userId),
      },
    });
  }

  private countUnreadChatMessages(
    userId: number,
    lastReadChatMessageId?: number | null,
  ): Promise<number> {
    return this.chatMessageRepository.count({
      where: {
        id: MoreThan(lastReadChatMessageId ?? 0),
        senderId: Not(userId),
      },
    });
  }
}
