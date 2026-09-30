import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Headers,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateConversationDto,
  UpdateConversationStatusDto,
  AssignAgentDto,
  CreateMessageDto,
} from './dto/conversation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import {
  ConversationStatus,
  ConversationChannel,
  MessageSenderType,
  AuthenticatedUser,
} from '@ai-support/types';

@ApiTags('conversations')
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly prisma: PrismaService,
  ) {}

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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get conversation details & message timeline (internal notes filtered for customers)' })
  async findOne(
    @Param('id') id: string,
    @GetUser() user?: AuthenticatedUser,
    @GetUser('organizationId') authOrgId?: string,
    @Query('orgId') queryOrgId?: string,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    let orgId = authOrgId || user?.organizationId || queryOrgId || headerOrgId;
    if (!orgId) {
      const conv = await this.prisma.conversation.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      orgId = conv?.organizationId || undefined;
    }

    if (!orgId) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return this.conversationsService.findOne(id, orgId, user);
  }

  @Post(':id/messages')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Send a message in a conversation' })
  async addMessage(
    @Param('id') id: string,
    @Body() dto: CreateMessageDto,
    @GetUser() user?: AuthenticatedUser,
    @GetUser('organizationId') authOrgId?: string,
    @Query('orgId') queryOrgId?: string,
    @Headers('x-organization-id') headerOrgId?: string,
  ) {
    let senderType = dto.senderType;
    if (!senderType) {
      senderType = user ? MessageSenderType.AGENT : MessageSenderType.CUSTOMER;
    }

    // Customers cannot post internal notes
    if (senderType === MessageSenderType.CUSTOMER) {
      dto.isInternalNote = false;
    }

    let orgId = authOrgId || user?.organizationId || queryOrgId || headerOrgId;
    if (!orgId) {
      const conv = await this.prisma.conversation.findUnique({
        where: { id },
        select: { organizationId: true },
      });
      orgId = conv?.organizationId || undefined;
    }

    if (!orgId) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }

    return this.conversationsService.addMessage(
      id,
      dto,
      senderType,
      senderType === MessageSenderType.AGENT ? user?.id : undefined,
      false,
      orgId,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update conversation status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateConversationStatusDto,
    @GetUser('organizationId') orgId: string,
  ) {
    return this.conversationsService.updateStatus(id, dto, orgId);
  }

  @Post(':id/takeover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Support agent takes over conversation from AI' })
  async takeover(
    @Param('id') id: string,
    @GetUser('id') agentId: string,
    @GetUser('organizationId') orgId: string,
  ) {
    return this.conversationsService.takeover(id, agentId, orgId);
  }

  @Patch(':id/assign')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign conversation to support agent' })
  async assignAgent(
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
    @GetUser('organizationId') orgId: string,
  ) {
    return this.conversationsService.assignAgent(id, dto, orgId);
  }
}
