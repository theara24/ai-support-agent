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
import { TicketsService } from './tickets.service';
import { CreateTicketDto, UpdateTicketDto, CreateTicketCommentDto } from './dto/ticket.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { TicketStatus } from '@ai-support/types';

@ApiTags('tickets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  async create(
    @Body() dto: CreateTicketDto,
    @GetUser('id') userId: string,
    @GetUser('organizationId') orgId?: string,
  ) {
    return this.ticketsService.create(dto, userId, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List all support tickets' })
  @ApiQuery({ name: 'status', enum: TicketStatus, required: false })
  async findAll(
    @Query('status') status?: TicketStatus,
    @GetUser('organizationId') orgId?: string,
  ) {
    return this.ticketsService.findAll(status, orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get support ticket details and comments' })
  async findOne(
    @Param('id') id: string,
    @GetUser('organizationId') orgId: string,
  ) {
    return this.ticketsService.findOne(id, orgId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket status or assign agent' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @GetUser('organizationId') orgId: string,
  ) {
    return this.ticketsService.update(id, dto, orgId);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to support ticket' })
  async addComment(
    @Param('id') id: string,
    @GetUser('id') authorId: string,
    @Body() dto: CreateTicketCommentDto,
    @GetUser('organizationId') orgId: string,
  ) {
    return this.ticketsService.addComment(id, authorId, dto, orgId);
  }
}
