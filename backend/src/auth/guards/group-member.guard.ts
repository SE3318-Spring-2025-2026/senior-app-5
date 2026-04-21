import { CanActivate, ExecutionContext, Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { SubmissionsService } from '../../submissions/submissions.service';

@Injectable()
export class GroupMemberGuard implements CanActivate {
  constructor(private submissionsService: SubmissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; 
    const submissionId = request.params.submissionId;

    
    const submission = await this.submissionsService.findById(submissionId);
    if (!submission) throw new NotFoundException('Submission not found');

    
    if (user.role === 'Admin' || user.role === 'Coordinator') return true;

    
    if (user.teamId !== submission.groupId) {
      throw new ForbiddenException('IDOR Detected: You cannot upload files to another group\'s submission.');
    }

    return true;
  }
}