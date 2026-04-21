import 'multer';
import { 
  Controller, 
  Post, 
  Get,
  Param, 
  Query,
  Req,
  UploadedFile, 
  UseInterceptors, 
  BadRequestException, 
  UseGuards
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Submissions')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all submissions. Filter by groupId for students.' })
  async findAll(@Req() req: any, @Query('groupId') groupId?: string) {
    const userRole = req.user.role;

    // RULE: If student, groupId is mandatory. If not, throw an error.
    if (userRole === 'Student' && !groupId) {
      throw new BadRequestException('Students must provide their groupId to view submissions.');
    }

   // Coordinators can see everything without sending parameters
    return this.submissionsService.findAll(groupId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get submission details by ID' })
  async findOne(@Param('id') id: string) {
    return this.submissionsService.findOne(id);
  }


  @Post(':submissionId/documents')
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(pdf|doc|docx|png|jpg|jpeg)$/)) {
        return callback(new BadRequestException('Only PDF, Word, and Image files are allowed!'), false);
      }
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 } // Max 5MB
  }))
  async uploadFile(
    @Param('submissionId') submissionId: string, 
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('File is required or invalid file type.');
    }

    return this.submissionsService.uploadDocument(submissionId, file);
  }
}