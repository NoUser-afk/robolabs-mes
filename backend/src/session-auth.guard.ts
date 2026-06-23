import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_KEY } from './auth.decorators';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.auth.extractTokenFromCookieHeader(request.headers?.cookie);
    request.user = await this.auth.authenticate(token);
    return true;
  }
}
