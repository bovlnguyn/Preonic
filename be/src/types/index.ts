import { Request } from 'express';

// ── Chỉ lưu các field cần thiết trong request ──
export interface AuthUserPayload {
  id:       string;
  email:    string;
  role:     'farmer' | 'enterprise' | 'admin';
  fullName: string;
}

// ── Request có kèm user sau khi xác thực JWT ──
export interface AuthRequest extends Request {
  user?: AuthUserPayload;   // ← dùng AuthUserPayload thay vì User
}

// ── Payload bên trong JWT token ──
export interface JwtUserPayload {
  id:   string;
  role: 'farmer' | 'enterprise' | 'admin';
  iat?: number;
  exp?: number;
}