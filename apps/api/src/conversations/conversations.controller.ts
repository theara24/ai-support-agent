import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import {
  CreateConversationDto,
  UpdateConversationStatusDto,
  AssignAgentDto,
  CreateMessageDto,
} from './dto/conversation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { ConversationStatus, ConversationChannel, MessageSenderType, AuthenticatedUser } from '@ai-support/types';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: 'Start a new conversation (Web or Telegram)' })
  async create(
    @Body() dto: CreateConversationDto,
    @GetUser('organizationId') orgId?: string,
  ) {
    return this.conversationsService.create(dto, orgId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all conversations' })
  @ApiQuery({ name: 'status', enum: ConversationStatus, required: false })
  @ApiQuery({ name: 'channel', enum: ConversationChannel, required: false })
  async findAll(
    @Query('status') status?: ConversationStatus,
    @Query('channel') channel?: ConversationChannel,
    @GetUser('organizationId') orgId?: string,
  ) {
    return this.conversationsService.findAll(status, channel, orgId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get conversation details & message timeline' })
  async findOne(@Param('id') id: string) {
    return this.conversationsService.findOne(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @GetUser() user?: AuthenticatedUser,
  ) {
    const senderType = user ? MessageSenderType.AGENT : MessageSenderType.CUSTOMER;
    return this.conversationsService.addMessage(id, dto, senderType, user?.id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update conversation status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
  ) {
    return this.conversationsService.updateStatus(id, dto);
  }

  @Post(':id/takeover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Support agent takes over conversation from AI' })
  async takeover(@Param('id') id: string, @GetUser('id') agentId: string) {
    return this.conversationsService.takeover(id, agentId);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign conversation to support agent' })
  async assignAgent(@Param('id') id: string, @Body() dto: AssignAgentDto) {
    return this.conversationsService.assignAgent(id, dto);
  }
}
