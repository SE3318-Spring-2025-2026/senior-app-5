import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class CoordinatorGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // JWT'den gelen kullanıcı

    if (user?.role !== 'COORDINATOR') {
      throw new ForbiddenException(
        'Only coordinators can perform this action.',
      );
    }
    return true;
  }
}
