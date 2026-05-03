import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { UserStatus } from '~/common/enums/user.enum';
import { UserService } from '~/modules/user/services/user.service';
import { JwtPayload } from '~/modules/auth/services/auth.service';
import { LoggerService } from '~/shared/logger/logger.service';

const FAMILY_ROOM = 'family';

@WebSocketGateway({
  namespace: 'family',
  cors: {
    origin: '*',
  },
})
export class FamilyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  private server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.get<string>('jwt.secret'),
      });
      if (payload.type !== 'access') {
        client.disconnect(true);
        return;
      }

      const user = await this.userService.findUserById(payload.sub);
      if (user.status !== UserStatus.ACTIVE) {
        client.disconnect(true);
        return;
      }

      client.data.userId = user.id;
      await client.join(FAMILY_ROOM);
      this.logger.debug(`[FamilyGateway] user ${user.id} connected`);
    } catch (error: any) {
      this.logger.debug(`[FamilyGateway] reject socket connection: ${error?.message || error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    if (client.data.userId) {
      this.logger.debug(`[FamilyGateway] user ${client.data.userId} disconnected`);
    }
  }

  @SubscribeMessage('family:ping')
  handlePing(@ConnectedSocket() client: Socket, @MessageBody() body: unknown) {
    return {
      event: 'family:pong',
      data: {
        userId: client.data.userId,
        body,
      },
    };
  }

  emitToFamily(event: string, payload: unknown): void {
    this.server?.to(FAMILY_ROOM).emit(event, payload);
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length).trim();
    }

    return undefined;
  }
}
