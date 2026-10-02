import { Injectable, UnauthorizedException, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';

import { SupabaseService } from '../supabase/supabase.service.js';
import type { AuthUser } from './auth.types.js';
import { IS_PUBLIC } from './decorators.js';

type SupabaseClaims = JWTPayload & { email?: string; role?: string; is_anonymous?: boolean };

/**
 * Verifies Supabase access tokens locally against the project's JWKS
 * (asymmetric signing keys), so no call to Supabase Auth per request.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly issuer: string;

  constructor(
    private readonly reflector: Reflector,
    supabase: SupabaseService,
  ) {
    this.issuer = `${supabase.projectUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(new URL(`${this.issuer}/.well-known/jwks.json`));
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [ctx.getHandler(), ctx.getClass()]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
    if (scheme?.toLowerCase() !== 'bearer' || !token) throw new UnauthorizedException('Missing bearer token');

    let claims: SupabaseClaims;
    try {
      ({ payload: claims } = await jwtVerify<SupabaseClaims>(token, this.jwks, {
        issuer: this.issuer,
        audience: 'authenticated',
      }));
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    if (!claims.sub || claims.role !== 'authenticated') throw new UnauthorizedException();

    req.user = {
      id: claims.sub,
      email: claims.email ?? null,
      isAnonymous: claims.is_anonymous === true,
      accessToken: token,
    };
    return true;
  }
}
