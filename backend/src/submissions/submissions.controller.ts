import 'multer';
import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards, // Eklendi
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'; 
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { RolesGuard } from '../auth/guards/roles.guard';
import { GroupMemberGuard } from './guards/group-member.guard'; 

@ApiTags('Submissions')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard) 
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new submission' })
  async create(@Body() createSubmissionDto: CreateSubmissionDto) {
    return this.submissionsService.createSubmission(createSubmissionDto);
  }

  @Post(':submissionId/documents')
  @UseGuards(GroupMemberGuard) 
  @ApiOperation({ summary: 'Upload documents to a specific submission' })
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(pdf|doc|docx|png|jpg|jpeg)$/)) {
        return callback(
          new BadRequestException('Only PDF, Word, and Image files are allowed!'),
          false,
        );
      }
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadFile(
    @Param('submissionId') submissionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required or invalid file type.');
    }
    return this.submissionsService.uploadDocument(submissionId, file);
  }
}