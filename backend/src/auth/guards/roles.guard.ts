import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('You must be logged in');
    }
    const callerRole = (user.role ?? '').toString();
    const callerRoleLc = callerRole.toLowerCase();
    const matched = requiredRoles.some(
      (r) => r === callerRole || r.toLowerCase() === callerRoleLc,
    );
    if (!matched) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(', ')}. Your role: ${callerRole || '<none>'}.`,
      );
    }
    return true;
  }
}
