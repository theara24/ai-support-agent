import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { WsJwtGuard } from '../common/guards/ws-jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser, UserRole } from '@ai-support/types';
import { corsOptions } from '../common/config/cors.config';

export interface PresenceInfo {
  conversationId: string;
  isCustomerOnline: boolean;
  isAgentOnline: boolean;
  onlineCount: number;
}

@UseGuards(WsJwtGuard)
@WebSocketGateway({
  cors: corsOptions,
})
export class MessagesGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  // Track active client sockets: socket.id -> { conversationId, role, userId }
  private activeClients = new Map<
    string,
    { conversationId: string; role: 'AGENT' | 'CUSTOMER'; userId?: string }
  >();

  // Track conversation rooms: conversationId -> Set of socket IDs
  private conversationRooms = new Map<string, Set<string>>();

  constructor(
    private readonly wsJwtGuard: WsJwtGuard,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        const token = this.wsJwtGuard.extractToken(socket);
        if (!token) {
          return next(new Error('Authentication token required'));
        }
        const user = await this.wsJwtGuard.validateToken(token);
        socket.data.user = user;
        next();
      } catch (err: any) {
        this.logger.warn(`Unauthorized WebSocket connection rejected: ${err.message}`);
        next(new Error(`Unauthorized: ${err.message || 'Invalid or missing token'}`));
      }
    });
  }

  handleConnection(client: Socket) {
    const user = client.data?.user as AuthenticatedUser | undefined;
    if (!user) {
      this.logger.warn(`Unauthenticated client attempted connection: ${client.id}. Disconnecting.`);
      client.emit('error', { message: 'Authentication required' });
      client.disconnect(true);
      return;
    }
    this.logger.log(
      `Client authenticated & connected: ${client.id} (user: ${user.id}, role: ${user.role}, org: ${user.organizationId || 'none'})`,
    );
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from WebSocket: ${client.id}`);
    const clientInfo = this.activeClients.get(client.id);
    if (clientInfo) {
      this.activeClients.delete(client.id);
      const room = this.conversationRooms.get(clientInfo.conversationId);
      if (room) {
        room.delete(client.id);
        if (room.size === 0) {
          this.conversationRooms.delete(clientInfo.conversationId);
        }
      }
      await this.broadcastPresence(clientInfo.conversationId);
    }
  }

  @SubscribeMessage('join:conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.conversationId) return { status: 'error', message: 'conversationId required' };

    const user = client.data?.user as AuthenticatedUser | undefined;
    if (!user) {
      return { status: 'error', message: 'Unauthorized' };
    }

    // Tenancy isolation check: verify user belongs to the conversation's organization (except SUPER_ADMIN)
    if (user.role !== UserRole.SUPER_ADMIN && user.organizationId) {
      const conv = await this.prisma.conversation.findFirst({
        where: {
          id: data.conversationId,
          organizationId: user.organizationId,
        },
        select: { id: true },
      });
      if (!conv) {
        this.logger.warn(
          `Unauthorized room join attempt: User ${user.id} (Org: ${user.organizationId}) attempted to join conversation ${data.conversationId}`,
        );
        return { status: 'error', message: 'Conversation not found or access denied' };
      }
    }

    // Role is derived exclusively from verified JWT, never from client payload
    const role: 'AGENT' | 'CUSTOMER' =
      user.role === UserRole.CUSTOMER ? 'CUSTOMER' : 'AGENT';

    client.join(`conversation:${data.conversationId}`);

    this.activeClients.set(client.id, {
      conversationId: data.conversationId,
      role,
      userId: user.id,
    });

    if (!this.conversationRooms.has(data.conversationId)) {
      this.conversationRooms.set(data.conversationId, new Set());
    }
    this.conversationRooms.get(data.conversationId)!.add(client.id);

    this.logger.log(
      `Authenticated client ${client.id} (${role}, user: ${user.id}) joined room conversation:${data.conversationId}`,
    );

    const presence = await this.getConversationPresence(data.conversationId);
    await this.broadcastPresence(data.conversationId);

    return {
      status: 'joined',
      room: `conversation:${data.conversationId}`,
      presence,
    };
  }

  @SubscribeMessage('leave:conversation')
  async handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.conversationId) return { status: 'error', message: 'conversationId required' };
    client.leave(`conversation:${data.conversationId}`);

    this.activeClients.delete(client.id);
    const room = this.conversationRooms.get(data.conversationId);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) {
        this.conversationRooms.delete(data.conversationId);
      }
    }

    await this.broadcastPresence(data.conversationId);
    return { status: 'left', room: `conversation:${data.conversationId}` };
  }

  @SubscribeMessage('presence:query')
  async handlePresenceQuery(@MessageBody() data: { conversationId: string }) {
    if (!data?.conversationId) return { isCustomerOnline: false, isAgentOnline: false, conversationId: '', onlineCount: 0 };
    return this.getConversationPresence(data.conversationId);
  }

  @SubscribeMessage('typing:status')
  handleTypingStatus(
    @MessageBody() data: { conversationId: string; isTyping: boolean; sender?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.conversationId) return;
    const user = client.data?.user as AuthenticatedUser | undefined;
    const sender =
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`
        : user?.firstName || user?.email || data?.sender || 'Support Agent';

    client.to(`conversation:${data.conversationId}`).emit('typing:status', {
      conversationId: data.conversationId,
      isTyping: !!data.isTyping,
      sender,
    });
  }

  @SubscribeMessage('message:delivered')
  handleMessageDelivered(
    @MessageBody() data: { conversationId: string; messageId: string },
  ) {
    if (!data?.conversationId || !data?.messageId) return;
    const deliveredPayload = {
      conversationId: data.conversationId,
      messageId: data.messageId,
      deliveryStatus: 'DELIVERED',
      deliveredAt: new Date().toISOString(),
    };
    if (this.server) {
      this.server.to(`conversation:${data.conversationId}`).emit('message:status_changed', deliveredPayload);
    }
  }

  emitTyping(conversationId: string, isTyping: boolean, sender: string = 'AI Support Agent') {
    if (!this.server) return;
    this.server.to(`conversation:${conversationId}`).emit('typing:status', {
      conversationId,
      isTyping,
      sender,
    });
  }

  emitNewMessage(conversationId: string, message: any) {
    if (!this.server) return;

    // Attach delivery status: if delivered via server broadcast, default to DELIVERED
    const enrichedMessage = {
      ...message,
      deliveryStatus: message.deliveryStatus || 'DELIVERED',
    };

    // Hide internal notes from public room messages
    if (message.isInternalNote) {
      this.server.emit('conversation:updated', { conversationId });
      return;
    }

    this.server.to(`conversation:${conversationId}`).emit('message:new', enrichedMessage);
    this.server.emit('conversation:updated', { conversationId });
  }

  emitStatusChange(conversationId: string, status: string) {
    if (!this.server) return;
    this.server.to(`conversation:${conversationId}`).emit('conversation:status_changed', {
      conversationId,
      status,
    });
    this.server.emit('conversation:status_changed', { conversationId, status });
    this.server.emit('conversation:updated', { conversationId });
  }

  async getConversationPresence(conversationId: string): Promise<PresenceInfo> {
    if (this.server) {
      try {
        const sockets = await this.server
          .in(`conversation:${conversationId}`)
          .fetchSockets();

        if (sockets && sockets.length > 0) {
          let isCustomerOnline = false;
          let isAgentOnline = false;

          for (const s of sockets) {
            const user = s.data?.user as AuthenticatedUser | undefined;
            if (user?.role === UserRole.CUSTOMER) {
              isCustomerOnline = true;
            } else {
              isAgentOnline = true;
            }
          }

          return {
            conversationId,
            isCustomerOnline,
            isAgentOnline,
            onlineCount: sockets.length,
          };
        }
      } catch (err: any) {
        this.logger.debug(`fetchSockets fallback: ${err.message}`);
      }
    }

    // Fallback to local node Map
    const socketIds = this.conversationRooms.get(conversationId) || new Set();
    let isCustomerOnline = false;
    let isAgentOnline = false;

    for (const sId of socketIds) {
      const client = this.activeClients.get(sId);
      if (client?.role === 'CUSTOMER') isCustomerOnline = true;
      if (client?.role === 'AGENT') isAgentOnline = true;
    }

    return {
      conversationId,
      isCustomerOnline,
      isAgentOnline,
      onlineCount: socketIds.size,
    };
  }

  async broadcastPresence(conversationId: string) {
    if (!this.server) return;
    const presence = await this.getConversationPresence(conversationId);
    this.server.to(`conversation:${conversationId}`).emit('presence:update', presence);
    this.server.emit('presence:update', presence);
  }
}
