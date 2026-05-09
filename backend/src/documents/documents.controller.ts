import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { DocumentsService } from './documents.service';
import { CreateMarkdownDocumentDto } from './dto/create-markdown-document.dto';
import { UpdateMarkdownDocumentDto } from './dto/update-markdown-document.dto';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('documents/markdown')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  @Roles(
    Role.Student,
    Role.TeamLeader,
    Role.Professor,
    Role.Coordinator,
    Role.Admin,
  )
  @ApiOperation({
    operationId: 'createMarkdownDocument',
    summary: 'Create or upsert a markdown document for a submission',
  })
  @ApiResponse({ status: 201, description: 'Markdown document created.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden ownership/role.' })
  @ApiResponse({ status: 404, description: 'Submission not found.' })
  async create(
    @Req() req: Request & { user: any },
    @Body() dto: CreateMarkdownDocumentDto,
  ) {
    return this.documentsService.create(req.user, dto);
  }

  @Get(':documentId')
  @Roles(
    Role.Student,
    Role.TeamLeader,
    Role.Professor,
    Role.Coordinator,
    Role.Admin,
  )
  @ApiOperation({
    operationId: 'getMarkdownDocument',
    summary: 'Get a markdown document by id',
  })
  @ApiResponse({ status: 200, description: 'Markdown document.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden ownership/role.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  async findOne(
    @Req() req: Request & { user: any },
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.findOne(req.user, documentId);
  }

  @Put(':documentId')
  @Roles(
    Role.Student,
    Role.TeamLeader,
    Role.Professor,
    Role.Coordinator,
    Role.Admin,
  )
  @ApiOperation({
    operationId: 'updateMarkdownDocument',
    summary: 'Update a markdown document; section map is regenerated on save',
  })
  @ApiResponse({ status: 200, description: 'Markdown document updated.' })
  @ApiResponse({ status: 400, description: 'Invalid payload.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden ownership/role.' })
  @ApiResponse({ status: 404, description: 'Document not found.' })
  async update(
    @Req() req: Request & { user: any },
    @Param('documentId') documentId: string,
    @Body() dto: UpdateMarkdownDocumentDto,
  ) {
    return this.documentsService.update(req.user, documentId, dto);
  }
}
