import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ConversationChannel, ConversationStatus, MessageSenderType } from '@ai-support/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversationDto {
  @ApiProperty({ enum: ConversationChannel, default: ConversationChannel.WEB })
  @IsEnum(ConversationChannel)
  channel: ConversationChannel;

  @ApiPropertyOptional({ example: 'cust-123' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'Customer Name' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @IsString()
  customerEmail?: string;
}

export class UpdateConversationStatusDto {
  @ApiProperty({ enum: ConversationStatus })
  @IsEnum(ConversationStatus)
  status: ConversationStatus;
}

export class AssignAgentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  agentId: string;
}

export class CreateMessageDto {
  @ApiProperty({ example: 'Hello, I need help with my order.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isInternalNote?: boolean;

  @ApiPropertyOptional({ enum: MessageSenderType })
  @IsOptional()
  @IsEnum(MessageSenderType)
  senderType?: MessageSenderType;
}
