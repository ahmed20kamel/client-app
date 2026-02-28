// CRM Session types (used by lib/auth.ts)
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface Session {
  user: SessionUser;
}
