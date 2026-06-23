import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class TerminalAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.auth.extractTokenFromCookieHeader(request.headers?.cookie);
    const user = request.user || await this.auth.authenticate(token);
    if (user.role !== 'terminal' || !user.isTerminalOnly) {
      throw new UnauthorizedException('Terminal account is required');
    }
    if (!user.workCenterSection) {
      throw new UnauthorizedException('Terminal account is not linked to a work center');
    }
    request.user = user;
    return true;
  }
}
