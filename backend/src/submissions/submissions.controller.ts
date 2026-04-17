import 'multer';
import {
  Controller,
  Post,
  Get,
  Param,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { SubmissionsService } from './submissions.service';

interface JwtUser {
  userId: string;
  email: string;
  role: string;
}

interface RequestWithUser extends Request {
  user: JwtUser;
}


@UseGuards(AuthGuard('jwt'))
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('me')
  async getMySubmissions(@Req() req: RequestWithUser) {
    return this.submissionsService.findMySubmissions(req.user.userId);
  }

  @Post(':submissionId/documents')
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, callback) => {
        if (!file.originalname.match(/\.(pdf|doc|docx|png|jpg|jpeg)$/)) {
          return callback(
            new BadRequestException('Only PDF, Word, and Image files are allowed!'),
            false
          );
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  )
  async uploadFile(
    @Req() req: RequestWithUser,
    @Param('submissionId') submissionId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!file) {
      throw new BadRequestException('File is required or invalid file type.');
    }

    return this.submissionsService.uploadDocumentForUser(req.user.userId, submissionId, file);
  }
}