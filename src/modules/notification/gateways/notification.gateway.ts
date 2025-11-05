import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { NotificationEventPayload } from '../services/notification.service';
import { NotificationConnectionRegistry } from '../registry/notification-connection.registry';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || ['http://localhost:3001'],
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly connectionRegistry: NotificationConnectionRegistry,
  ) {}

  /**
   * 处理客户端连接
   */
  handleConnection(client: Socket): void {
    try {
      const token = this.extractToken(client);
      const payload = this.jwtService.verify(token) as { sub?: number; id?: number };
      const userId = payload?.sub ?? payload?.id;

      if (!userId) {
        throw new Error('Invalid token payload');
      }

      client.data.userId = userId;
      this.connectionRegistry.add(userId, client.id);

      this.logger.verbose(`User ${userId} connected with socket ${client.id}`);
    } catch (error) {
      this.logger.warn(
        `Notification socket connection rejected: ${error instanceof Error ? error.message : error}`,
      );
      client.emit('error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  /**
   * 处理客户端断开
   */
  handleDisconnect(client: Socket): void {
    const { userId } = client.data as { userId?: number };
    if (!userId) {
      return;
    }

    this.connectionRegistry.remove(userId, client.id);

    this.logger.verbose(`User ${userId} disconnected from socket ${client.id}`);
  }

  /**
   * 监听通知创建事件并推送到对应用户
   */
  @OnEvent('notification.created', { async: true })
  handleNotificationCreated(payload: NotificationEventPayload): void {
    for (const notification of payload.notifications) {
      if (!notification.recipientId) {
        this.server.emit('notification', notification);
        continue;
      }

      this.emitToUser(notification.recipientId, 'notification', notification);
    }
  }

  /**
   * 监听全部已读事件
   */
  @OnEvent('notification.readAll', { async: true })
  handleNotificationReadAll(event: { userId: number; affected: number }): void {
    this.emitToUser(event.userId, 'notification:readAll', {
      affected: event.affected,
    });
  }

  /**
   * 监听单条已读事件
   */
  @OnEvent('notification.read', { async: true })
  handleNotificationRead(event: { id: number; userId: number }): void {
    this.emitToUser(event.userId, 'notification:read', { id: event.id });
  }

  /**
   * 处理心跳 ping 消息
   */
  @SubscribeMessage('ping')
  handlePing(client: Socket): void {
    const { userId } = client.data as { userId?: number };
    this.logger.verbose(`💓 Heartbeat ping from user ${userId}, socket ${client.id}`);

    // 发送 pong 响应
    client.emit('pong');
  }

  private emitToUser(userId: number, event: string, data: unknown): void {
    const socketIds = this.connectionRegistry.getSocketIds(userId);
    if (socketIds.length === 0) {
      this.logger.debug(
        `[NotificationGateway] Skip event ${event} for user ${userId}, no active sockets`,
      );
      return;
    }

    socketIds.forEach((socketId) => {
      this.server.to(socketId).emit(event, data);
    });
  }

  private extractToken(client: Socket): string {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.length > 0) {
      return authToken;
    }

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.replace(/^Bearer\s+/i, '');
    }

    throw new Error('Missing authentication token');
  }
}
