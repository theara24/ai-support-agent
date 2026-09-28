import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { KnowledgeBaseService } from './knowledge-base.service';
import { CreateKnowledgeDocumentDto } from './dto/knowledge-base.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { UserRole, Permission } from '@ai-support/types';
import { GetUser } from '../common/decorators/get-user.decorator';

@ApiTags('knowledge-base')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('knowledge-base')
export class KnowledgeBaseController {
  constructor(private readonly kbService: KnowledgeBaseService) {}

  @Get('documents')
  @RequirePermissions(Permission.KNOWLEDGE_BASE_READ)
  @ApiOperation({ summary: 'List all knowledge base documents' })
  async findAll(@GetUser('organizationId') orgId?: string) {
    return this.kbService.findAll(orgId);
  }

  @Post('documents')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.SUPPORT_AGENT)
  @RequirePermissions(Permission.KNOWLEDGE_BASE_WRITE)
  @ApiOperation({ summary: 'Upload or create new knowledge base document' })
  async create(
    @Body() dto: CreateKnowledgeDocumentDto,
    @GetUser('organizationId') orgId?: string,
  ) {
    return this.kbService.create(dto, orgId);
  }

  @Delete('documents/:id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @RequirePermissions(Permission.KNOWLEDGE_BASE_WRITE)
  @ApiOperation({ summary: 'Delete knowledge base document' })
  async delete(@Param('id') id: string) {
    return this.kbService.delete(id);
  }
}
