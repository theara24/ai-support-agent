import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface PresenceInfo {
  conversationId: string;
  isCustomerOnline: boolean;
  isAgentOnline: boolean;
  onlineCount: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  // Track active client sockets: socket.id -> { conversationId, role }
  private activeClients = new Map<
    string,
    { conversationId: string; role: 'AGENT' | 'CUSTOMER'; userId?: string }
  >();

  // Track conversation rooms: conversationId -> Set of socket IDs
  private conversationRooms = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
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
      this.broadcastPresence(clientInfo.conversationId);
    }
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @MessageBody() data: { conversationId: string; role?: 'AGENT' | 'CUSTOMER'; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.conversationId) return { status: 'error', message: 'conversationId required' };

    const role = data.role || 'AGENT';
    client.join(`conversation:${data.conversationId}`);

    this.activeClients.set(client.id, {
      conversationId: data.conversationId,
      role,
      userId: data.userId,
    });

    if (!this.conversationRooms.has(data.conversationId)) {
      this.conversationRooms.set(data.conversationId, new Set());
    }
    this.conversationRooms.get(data.conversationId)!.add(client.id);

    this.logger.log(
      `Client ${client.id} (${role}) joined room conversation:${data.conversationId}`,
    );

    const presence = this.getConversationPresence(data.conversationId);
    this.broadcastPresence(data.conversationId);

    return {
      status: 'joined',
      room: `conversation:${data.conversationId}`,
      presence,
    };
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
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

    this.broadcastPresence(data.conversationId);
    return { status: 'left', room: `conversation:${data.conversationId}` };
  }

  @SubscribeMessage('presence:query')
  handlePresenceQuery(@MessageBody() data: { conversationId: string }) {
    if (!data?.conversationId) return { isCustomerOnline: false, isAgentOnline: false };
    return this.getConversationPresence(data.conversationId);
  }

  @SubscribeMessage('typing:status')
  handleTypingStatus(
    @MessageBody() data: { conversationId: string; isTyping: boolean; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data?.conversationId) return;
    client.to(`conversation:${data.conversationId}`).emit('typing:status', data);
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

  getConversationPresence(conversationId: string): PresenceInfo {
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

  broadcastPresence(conversationId: string) {
    if (!this.server) return;
    const presence = this.getConversationPresence(conversationId);
    this.server.to(`conversation:${conversationId}`).emit('presence:update', presence);
    this.server.emit('presence:update', presence);
  }
}
