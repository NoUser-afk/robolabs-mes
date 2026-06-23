import type { Request } from 'express';

export type AppRole = 'terminal' | 'operator' | 'dispatcher' | 'technologist' | 'director' | 'admin';

export type AuthUser = {
  id: number;
  login: string;
  role: AppRole | string;
  displayName: string;
  workCenterSection?: string | null;
  personId?: number | null;
  isTerminalOnly?: boolean;
};

export type AuthRequest = Request & {
  user?: AuthUser;
};
