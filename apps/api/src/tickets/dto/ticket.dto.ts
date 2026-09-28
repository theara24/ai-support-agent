import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TicketStatus, TicketPriority } from '@ai-support/types';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ example: 'Payment issue' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'I was double-charged on my invoice.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assignedAgentId?: string;
}

export class CreateTicketCommentDto {
  @ApiProperty({ example: 'Looking into the billing record now.' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
