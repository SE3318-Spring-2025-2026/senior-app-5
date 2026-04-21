import 'multer';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  async create(@Body() createSubmissionDto: CreateSubmissionDto) {
    return this.submissionsService.createSubmission(createSubmissionDto);
  }

  @Get(':submissionId/completeness')
  @ApiOperation({ summary: 'Check if a submission meets all phase requirements' })
  @ApiResponse({ status: 200, description: 'Completeness status returned successfully.' })
  @ApiResponse({ status: 404, description: 'Submission or Phase not found.' })
  async getCompleteness(@Param('submissionId') submissionId: string) {
    return this.submissionsService.getCompleteness(submissionId);
  }

  @Post(':submissionId/documents')
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
