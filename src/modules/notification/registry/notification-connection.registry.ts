import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationConnectionRegistry {
  private readonly connections = new Map<number, Set<string>>();
  private readonly logger = new Logger(NotificationConnectionRegistry.name);

  add(userId: number, socketId: string): void {
    const sockets = this.connections.get(userId) ?? new Set<string>();
    sockets.add(socketId);
    this.connections.set(userId, sockets);
    this.logger.verbose(`Register notification socket ${socketId} for user ${userId}`);
  }

  remove(userId: number, socketId: string): void {
    const sockets = this.connections.get(userId);
    if (!sockets) {
      return;
    }

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.connections.delete(userId);
    }
    this.logger.verbose(`Remove notification socket ${socketId} for user ${userId}`);
  }

  has(userId: number): boolean {
    const sockets = this.connections.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getSocketIds(userId: number): string[] {
    return Array.from(this.connections.get(userId) ?? []);
  }

  getOnlineUserIds(): number[] {
    return Array.from(this.connections.keys());
  }
}
