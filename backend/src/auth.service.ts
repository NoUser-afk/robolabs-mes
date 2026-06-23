import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from './prisma.service';
import { AuthUser } from './auth.types';

const SESSION_COOKIE = 'rl_mes_session';
const TOKEN_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  sub: number;
  login: string;
  role: string;
  displayName: string;
  workCenterSection?: string | null;
  personId?: number | null;
  isTerminalOnly?: boolean;
  iat: number;
  exp: number;
};

@Injectable()
export class AuthService {
  readonly cookieName = SESSION_COOKIE;

  constructor(private readonly prisma: PrismaService) {}

  async login(body: { login?: string; password?: string }) {
    const login = String(body.login || '').trim();
    const password = String(body.password || '');
    if (!login || !password) throw new BadRequestException('Login and password are required');

    const user = await this.prisma.appUser.findUnique({ where: { login } });
    if (!user || !user.isActive || !user.passwordHash || !this.verifyPassword(password, user.passwordHash)) {
      throw new UnauthorizedException('Invalid login or password');
    }

    await this.prisma.appUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const safeUser = this.toAuthUser(user);
    return { user: safeUser, token: this.signSession(safeUser) };
  }

  async terminalProfiles() {
    const users = await this.prisma.appUser.findMany({
      where: { isActive: true, role: 'terminal', isTerminalOnly: true, workCenterSection: { not: null } },
      orderBy: { login: 'asc' },
      select: {
        id: true,
        login: true,
        role: true,
        displayName: true,
        workCenterSection: true,
        personId: true,
        isTerminalOnly: true,
      },
    });
    return { users };
  }

  async terminalLogin(body: { login?: string; password?: string }) {
    const login = String(body.login || '').trim();
    const password = String(body.password || '');
    if (!login) throw new BadRequestException('Login is required');

    const user = await this.prisma.appUser.findUnique({ where: { login } });
    if (!user || !user.isActive || user.role !== 'terminal' || !user.isTerminalOnly) {
      throw new UnauthorizedException('Terminal is inactive');
    }
    if (!user.passwordHash && process.env.ALLOW_PASSWORDLESS_TERMINAL !== 'true') {
      throw new UnauthorizedException('Terminal password is not configured');
    }
    if (user.passwordHash && (!password || !this.verifyPassword(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid terminal password');
    }

    await this.prisma.appUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const safeUser = this.toAuthUser(user);
    return { user: safeUser, token: this.signSession(safeUser) };
  }

  async terminalQrLogin(body: { qr?: string; token?: string }) {
    const token = this.extractTerminalQrToken(body.qr || body.token);
    if (!token) throw new BadRequestException('Terminal QR token is required');

    const user = await this.prisma.appUser.findFirst({
      where: {
        terminalQrToken: token,
        isActive: true,
        role: 'terminal',
        isTerminalOnly: true,
        workCenterSection: { not: null },
      },
    });
    if (!user) throw new UnauthorizedException('Invalid terminal QR code');

    await this.prisma.appUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const safeUser = this.toAuthUser(user);
    return { user: safeUser, token: this.signSession(safeUser) };
  }

  async debugProfiles() {
    if (process.env.ENABLE_DEBUG_LOGIN !== 'true') {
      throw new UnauthorizedException('Debug login is disabled');
    }
    const users = await this.prisma.appUser.findMany({
      where: { isActive: true },
      orderBy: [{ isTerminalOnly: 'asc' }, { role: 'asc' }, { login: 'asc' }],
      select: {
        id: true,
        login: true,
        role: true,
        displayName: true,
        workCenterSection: true,
        personId: true,
        isTerminalOnly: true,
      },
    });
    return { users };
  }

  async debugLogin(body: { login?: string }) {
    if (process.env.ENABLE_DEBUG_LOGIN !== 'true') {
      throw new UnauthorizedException('Debug login is disabled');
    }
    const login = String(body.login || '').trim();
    if (!login) throw new BadRequestException('Login is required');

    const user = await this.prisma.appUser.findUnique({ where: { login } });
    if (!user || !user.isActive) throw new UnauthorizedException('User is inactive');

    await this.prisma.appUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    const safeUser = this.toAuthUser(user);
    return { user: safeUser, token: this.signSession(safeUser) };
  }

  async authenticate(token?: string): Promise<AuthUser> {
    if (!token) throw new UnauthorizedException('Authentication required');
    const payload = this.verifySession(token);
    const user = await this.prisma.appUser.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException('User is inactive');
    return this.toAuthUser(user);
  }

  signOutCookie() {
    return `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${this.secureCookieSuffix()}`;
  }

  sessionCookie(token: string) {
    return `${SESSION_COOKIE}=${token}; Path=/; Max-Age=${TOKEN_TTL_SECONDS}; SameSite=Lax; HttpOnly${this.secureCookieSuffix()}`;
  }

  hashPassword(password: string) {
    const salt = randomBytes(16).toString('base64url');
    const iterations = 120_000;
    const digest = pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('base64url');
    return `pbkdf2_sha256$${iterations}$${salt}$${digest}`;
  }

  verifyPassword(password: string, encoded: string) {
    const [kind, iterationsText, salt, digest] = encoded.split('$');
    if (kind !== 'pbkdf2_sha256' || !iterationsText || !salt || !digest) return false;
    const candidate = pbkdf2Sync(password, salt, Number(iterationsText), 32, 'sha256');
    const expected = Buffer.from(digest, 'base64url');
    return expected.length === candidate.length && timingSafeEqual(candidate, expected);
  }

  extractTokenFromCookieHeader(cookieHeader?: string) {
    return String(cookieHeader || '')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`))
      ?.slice(SESSION_COOKIE.length + 1);
  }

  private signSession(user: AuthUser) {
    const now = Math.floor(Date.now() / 1000);
    const payload: SessionPayload = {
      sub: user.id,
      login: user.login,
      role: user.role,
      displayName: user.displayName,
      workCenterSection: user.workCenterSection || null,
      personId: user.personId || null,
      isTerminalOnly: Boolean(user.isTerminalOnly),
      iat: now,
      exp: now + TOKEN_TTL_SECONDS,
    };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    return `${body}.${this.signature(body)}`;
  }

  private verifySession(token: string): SessionPayload {
    const [body, signature] = token.split('.');
    if (!body || !signature || this.signature(body) !== signature) {
      throw new UnauthorizedException('Invalid session');
    }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) throw new UnauthorizedException('Session expired');
    return payload;
  }

  private signature(body: string) {
    return createHmac('sha256', process.env.AUTH_SESSION_SECRET || 'robolabs-mes-session-secret')
      .update(body)
      .digest('base64url');
  }

  private secureCookieSuffix() {
    const secure = process.env.AUTH_COOKIE_SECURE === 'true';
    return secure ? '; Secure' : '';
  }

  private extractTerminalQrToken(raw: unknown) {
    const value = String(raw || '')
      .trim()
      .replace(/^[`'"]+|[`'"]+$/g, '');
    if (!value) return '';

    const embeddedToken = value.match(/rpt_[A-Za-z0-9_-]{16,}/);
    if (embeddedToken) return embeddedToken[0];

    try {
      const url = new URL(value);
      if (url.protocol === 'robopulse:' && url.hostname === 'terminal') {
        return decodeURIComponent(url.pathname.replace(/^\/+/, '')).trim().replace(/^[`'"]+|[`'"]+$/g, '');
      }
      const queryToken = url.searchParams.get('terminalQr') || url.searchParams.get('token');
      if (queryToken) return queryToken.trim().replace(/^[`'"]+|[`'"]+$/g, '');
    } catch {
      // Not a URL, continue with compact formats.
    }

    const prefixed = value.match(/^RoboPulse:T:v1:([A-Za-z0-9_-]{16,})$/i);
    if (prefixed) return prefixed[1];
    const plain = value.match(/^(rpt_[A-Za-z0-9_-]{16,})$/);
    if (plain) return plain[1];
    return '';
  }

  private toAuthUser(user: { id: number; login: string; role: string; displayName: string; workCenterSection?: string | null; personId?: number | null; isTerminalOnly?: boolean }): AuthUser {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      displayName: user.displayName,
      workCenterSection: user.workCenterSection || null,
      personId: user.personId || null,
      isTerminalOnly: Boolean(user.isTerminalOnly),
    };
  }
}
