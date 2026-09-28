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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected to WebSocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected from WebSocket: ${client.id}`);
  }

  @SubscribeMessage('join:conversation')
  handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`conversation:${data.conversationId}`);
    this.logger.log(`Client ${client.id} joined room conversation:${data.conversationId}`);
    return { status: 'joined', room: `conversation:${data.conversationId}` };
  }

  @SubscribeMessage('leave:conversation')
  handleLeaveConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`conversation:${data.conversationId}`);
    return { status: 'left', room: `conversation:${data.conversationId}` };
  }

  @SubscribeMessage('typing:status')
  handleTypingStatus(
    @MessageBody() data: { conversationId: string; isTyping: boolean; sender: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.to(`conversation:${data.conversationId}`).emit('typing:status', data);
  }

  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conversation:${conversationId}`).emit('message:new', message);
    this.server.emit('conversation:updated', { conversationId });
  }

  emitStatusChange(conversationId: string, status: string) {
    this.server.to(`conversation:${conversationId}`).emit('conversation:status_changed', {
      conversationId,
      status,
    });
    this.server.emit('conversation:status_changed', { conversationId, status });
  }
}
