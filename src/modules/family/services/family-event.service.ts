import { Injectable } from '@nestjs/common';
import { FamilyGateway } from '../gateways/family.gateway';

@Injectable()
export class FamilyEventService {
  constructor(private readonly familyGateway: FamilyGateway) {}

  emitPostCreated(payload: unknown): void {
    this.familyGateway.emitToFamily('family:post-created', payload);
  }

  emitPostCommentCreated(payload: unknown): void {
    this.familyGateway.emitToFamily('family:post-comment-created', payload);
  }

  emitPostLikeChanged(payload: unknown): void {
    this.familyGateway.emitToFamily('family:post-like-changed', payload);
  }

  emitChatMessageCreated(payload: unknown): void {
    this.familyGateway.emitToFamily('family:chat-message-created', payload);
  }

  emitNotificationCreated(payload: unknown): void {
    this.familyGateway.emitToFamily('family:notification-created', payload);
  }
}
