import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import * as jwksRsa from 'jwks-rsa';

export const IS_PUBLIC_KEY = 'isPublic';

export interface JwtAuth {
  userId: string;
  sessionId: string;
  orgId: string | null;
  orgRole: string | null;
  claims: Record<string, unknown>;
}

declare module 'express' {
  interface Request {
    auth?: JwtAuth;
    tenant?: Record<string, unknown>;
    currentMember?: Record<string, unknown>;
  }
}

export interface AuthClaims {
  sub?: string;
  email?: string;
  role?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
  jti?: string;
  session_id?: string;
  app_metadata?: { org_id?: string; role?: string; [key: string]: unknown };
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

function normalizeSupabaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

@Injectable()
export class JwtAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private jwksClient!: jwksRsa.JwksClient;
  private issuer!: string;
  private readonly audience = 'authenticated';

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  onModuleInit(): void {
    const rawSupabaseUrl =
      this.config.get<string>('SUPABASE_URL') ??
      process.env['VITE_SUPABASE_URL'] ??
      '';
    const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);

    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL is required for JWT validation');
    }

    this.issuer = `${supabaseUrl}/auth/v1`;
    const jwksUri = `${this.issuer}/.well-known/jwks.json`;
    this.logger.log(`JWKS endpoint: ${jwksUri}`);

    this.jwksClient = jwksRsa({
      jwksUri,
      cache: true,
      cacheMaxAge: 60 * 60 * 1000,
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token missing');
    }

    // In non-production, accept dev tokens signed with ENCRYPTION_KEY (HS256)
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';
    if (nodeEnv !== 'production') {
      const devClaims = this.tryVerifyDevToken(token);
      if (devClaims) {
        request.auth = {
          userId:    devClaims.sub as string,
          sessionId: String(devClaims['session_id'] ?? ''),
          orgId:     (devClaims['app_metadata'] as any)?.org_id ?? null,
          orgRole:   (devClaims['app_metadata'] as any)?.role ?? null,
          claims:    devClaims as Record<string, unknown>,
        };
        return true;
      }
    }

    const claims = await this.verifyToken(token);

    if (!claims.sub || typeof claims.sub !== 'string') {
      throw new UnauthorizedException('JWT subject missing');
    }

    request.auth = {
      userId: claims.sub,
      sessionId: String(claims.session_id ?? claims.jti ?? ''),
      orgId: claims.app_metadata?.org_id ?? null,
      orgRole: claims.app_metadata?.role ?? null,
      claims: claims as Record<string, unknown>,
    };

    return true;
  }

  private tryVerifyDevToken(token: string): Record<string, unknown> | null {
    try {
      const secret = this.config.get<string>('ENCRYPTION_KEY');
      if (!secret) return null;
      const decoded = jwt.verify(token, secret, {
        algorithms: ['HS256'],
        issuer: 'music-os-360-dev',
      });
      if (typeof decoded !== 'object' || !decoded) return null;
      return decoded as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private verifyToken(token: string): Promise<AuthClaims> {
    return new Promise((resolve, reject) => {
      const getKey: jwt.GetPublicKeyOrSecret = (header, callback) => {
        if (!header.kid) {
          return callback(new Error('JWT kid missing'));
        }
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) return callback(err);
          callback(null, key?.getPublicKey());
        });
      };

      jwt.verify(
        token,
        getKey,
        {
          algorithms: ['ES256'],
          issuer: this.issuer,
          audience: this.audience,
        },
        (err, decoded) => {
          if (err) {
            if (err instanceof jwt.TokenExpiredError) {
              return reject(new UnauthorizedException('Token expired'));
            }
            this.logger.warn(`JWT verification failed: ${err.message}`);
            return reject(new UnauthorizedException('Invalid or expired token'));
          }
          if (!decoded || typeof decoded !== 'object') {
            return reject(new UnauthorizedException('Invalid token'));
          }
          resolve(decoded as AuthClaims);
        },
      );
    });
  }

  private extractToken(request: Request): string | null {
    const auth = request.headers['authorization'];
    if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
      return auth.slice(7);
    }
    return null;
  }
}
